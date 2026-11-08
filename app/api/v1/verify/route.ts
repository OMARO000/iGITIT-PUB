import { NextRequest } from "next/server"
import { analyzeRepo } from "@/app/lib/analyze"
import { clientIp, countFresh, mayReadFresh } from "@/app/lib/limits"
import { fail, failFrom, ok, preflight } from "@/app/lib/respond"
import { COVERED, hashRecord } from "@/app/lib/seal"
import { getReading, putReading } from "@/app/lib/store"

const VERIFY_BASE = "https://omaro.xyz/igitit/verify"

const PINATA_JWT = process.env.PINATA_JWT

// ─────────────────────────────────────────────
// CANONICAL JSON — deterministic, sortable
// Same input always produces same hash
// ─────────────────────────────────────────────



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
          version: "1.1",
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

/**
 * POST /igitit/api/v1/verify  { "repo": "<repository address>" }
 * Seals the server's own reading of that repository (never text a caller sends) and pins it to IPFS.
 * The same reading is pinned once; asking again returns the same record.
 */
export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers)
  try {
    const body = await req.json().catch(() => ({}))
    const raw = typeof body.repo === "string" ? body.repo.trim() : ""
    if (!raw) return fail(400, "missing_parameter", "Required: { \"repo\": \"github.com/owner/repository\" }")
    const url = raw.includes("://") ? raw : raw.split("/").length === 2 ? `https://github.com/${raw}` : `https://${raw}`
    const result = await analyzeRepo(url, mayReadFresh(ip))
    if (!result.stored) countFresh(ip)
    const meta = result.meta as Record<string, unknown>
    const commit = String(meta.commit ?? result.stored?.commit ?? "")
    const readingKey = `${String(meta.platform ?? "GitHub").toLowerCase()}:${String(meta.owner).toLowerCase()}/${String(meta.repo).toLowerCase()}@${commit}`

    const already = await getReading<{ cid: string; hash: string; sealedAt: string }>("verify", readingKey)
    if (already) return ok(ip, { ...already.result, verifyUrl: `${VERIFY_BASE}/${already.result.cid}`, ipfsUrl: `ipfs://${already.result.cid}`, existing: true })

    const doc: Record<string, unknown> = {
      schema: "igitit-verification/1.1",
      product: "iGITit",
      organization: "OMARO PBC",
      repository: {
        owner: meta.owner, repo: meta.repo, platform: meta.platform ?? "GitHub", language: meta.language ?? null,
        license: meta.license ?? null, description: meta.description ?? null, sourceUrl: url,
      },
      commit,
      readAt: result.stored?.readAt ?? new Date().toISOString(),
      analysis: result.analysis,
      disclaimer: "AI-written analysis. This record preserves what was read and what was concluded, at one commit; conclusions may contain errors. Check primary sources. Not legal or compliance advice. iGITit, OMARO PBC.",
    }
    const hash = hashRecord(doc)
    doc.verification = { method: "SHA-256 over canonical JSON (keys sorted, no spaces, missing values dropped)", covers: COVERED, hash }
    const sealedAt = new Date().toISOString()
    const repoSlug = `${meta.owner}-${meta.repo}`.toLowerCase().replace(/[^a-z0-9-]/g, "-")
    const { cid, size } = await pinToIPFS(doc, `igitit-${repoSlug}-${commit.slice(0, 7)}`)
    await putReading("verify", readingKey, null, commit, "seal", { cid, hash, sealedAt, size }, 0)
    return ok(ip, { cid, hash, sealedAt, size, verifyUrl: `${VERIFY_BASE}/${cid}`, ipfsUrl: `ipfs://${cid}`, existing: false })
  } catch (e) {
    return failFrom(e)
  }
}

export const OPTIONS = preflight
