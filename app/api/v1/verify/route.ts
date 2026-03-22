import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

const PINATA_JWT = process.env.PINATA_JWT

// ─────────────────────────────────────────────
// CANONICAL JSON — deterministic, sortable
// Same input always produces same hash
// ─────────────────────────────────────────────

function canonicalize(obj: unknown): string {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj)
  if (Array.isArray(obj)) return "[" + obj.map(canonicalize).join(",") + "]"
  const sorted = Object.keys(obj as Record<string, unknown>)
    .sort()
    .map(k => JSON.stringify(k) + ":" + canonicalize((obj as Record<string, unknown>)[k]))
    .join(",")
  return "{" + sorted + "}"
}

function sha256(data: string): string {
  return crypto.createHash("sha256").update(data, "utf8").digest("hex")
}

async function pinToIPFS(content: object, name: string): Promise<{ cid: string; size: number }> {
  if (!PINATA_JWT) throw new Error("PINATA_JWT environment variable not set")

  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${PINATA_JWT}`,
    },
    body: JSON.stringify({
      pinataContent: content,
      pinataMetadata: {
        name,
        keyvalues: {
          product: "igitit",
          version: "1.0",
        },
      },
      pinataOptions: { cidVersion: 1 },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Pinata error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return { cid: data.IpfsHash, size: data.PinSize ?? 0 }
}

export async function POST(req: NextRequest) {
  try {
    const { analysis, meta, url } = await req.json()

    if (!analysis || !meta) {
      return NextResponse.json({ error: "analysis and meta required" }, { status: 400 })
    }

    const timestamp = new Date().toISOString()

    // Build the canonical verification document
    const verificationDoc = {
      schema: "igitit-verification/1.0",
      product: "iGITit",
      organization: "OMARO PBC",
      generatedAt: timestamp,
      repository: {
        owner: meta.owner,
        repo: meta.repo,
        platform: meta.platform ?? "GitHub",
        language: meta.language,
        stars: meta.stars,
        fileCount: meta.fileCount,
        license: meta.license ?? null,
        description: meta.description ?? null,
        sourceUrl: url ?? `https://github.com/${meta.owner}/${meta.repo}`,
      },
      analysis: {
        overview: analysis.overview,
        dataItems: analysis.dataItems,
        dataFlowSummary: analysis.dataFlowSummary,
        modules: analysis.modules,
        score: analysis.score,
        overallVerdict: analysis.overallVerdict,
      },
      verification: {
        method: "SHA-256",
        note: "Hash computed over canonical JSON of the analysis object only (not this wrapper document)",
        hash: "", // filled below
      },
    }

    // Hash only the analysis content — reproducible by anyone
    const analysisCanonical = canonicalize(verificationDoc.analysis)
    const hash = sha256(analysisCanonical)
    verificationDoc.verification.hash = hash

    // Pin to IPFS
    const repoSlug = `${meta.owner}-${meta.repo}`.toLowerCase().replace(/[^a-z0-9-]/g, "-")
    const pinName = `igitit-${repoSlug}-${timestamp.slice(0, 10)}`
    const { cid, size } = await pinToIPFS(verificationDoc, pinName)

    return NextResponse.json({
      ok: true,
      cid,
      hash,
      timestamp,
      size,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${cid}`,
      verifyUrl: `${req.nextUrl.origin}/verify/${cid}`,
      ipfsUrl: `ipfs://${cid}`,
    })

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
