import { NextRequest, NextResponse } from "next/server"

// ─────────────────────────────────────────────
// RATE LIMITING — in-memory, per IP
// 10 requests per hour per IP for free tier
// ─────────────────────────────────────────────

const RATE_LIMIT = 10
const WINDOW_MS = 60 * 60 * 1000 // 1 hour

const ipMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = ipMap.get(ip)

  if (!entry || now > entry.resetAt) {
    const resetAt = now + WINDOW_MS
    ipMap.set(ip, { count: 1, resetAt })
    return { allowed: true, remaining: RATE_LIMIT - 1, resetAt }
  }

  if (entry.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { allowed: true, remaining: RATE_LIMIT - entry.count, resetAt: entry.resetAt }
}

function getIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  )
}

function parseRepoUrl(input: string): { owner: string; repo: string; platform: "github" | "gitlab" } | null {
  // Accept full URLs or owner/repo shorthand
  const fullUrl = input.includes("://") ? input : `https://github.com/${input}`

  if (fullUrl.includes("github.com")) {
    const m = fullUrl.match(/github\.com\/([^/]+)\/([^/?\s#]+)/)
    if (!m) return null
    return { owner: m[1], repo: m[2].replace(/\.git$/, ""), platform: "github" }
  }
  if (fullUrl.includes("gitlab.com")) {
    const m = fullUrl.match(/gitlab\.com\/([^/]+)\/([^/?\s#]+)/)
    if (!m) return null
    return { owner: m[1], repo: m[2].replace(/\.git$/, ""), platform: "gitlab" }
  }
  return null
}

export async function GET(req: NextRequest) {
  const ip = getIP(req)
  const { allowed, remaining, resetAt } = checkRateLimit(ip)

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "X-RateLimit-Limit": String(RATE_LIMIT),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
    "Cache-Control": "public, max-age=3600",
  }

  if (!allowed) {
    return NextResponse.json({
      error: "rate_limit_exceeded",
      message: `Free tier: ${RATE_LIMIT} requests per hour. Rate limit resets at ${new Date(resetAt).toISOString()}.`,
      resetAt: new Date(resetAt).toISOString(),
      docs: "https://igitit.xyz/docs",
    }, { status: 429, headers })
  }

  const { searchParams } = new URL(req.url)
  const repoParam = searchParams.get("repo")

  if (!repoParam) {
    return NextResponse.json({
      error: "missing_parameter",
      message: "Required parameter: ?repo=github.com/owner/repository",
      example: "/api/v1/analyze?repo=github.com/facebook/react",
      docs: "https://igitit.xyz/docs",
    }, { status: 400, headers })
  }

  const parsed = parseRepoUrl(repoParam)
  if (!parsed) {
    return NextResponse.json({
      error: "invalid_repo",
      message: "Could not parse repository URL. Supported formats: github.com/owner/repo, gitlab.com/owner/repo, or owner/repo (defaults to GitHub).",
      docs: "https://igitit.xyz/docs",
    }, { status: 400, headers })
  }

  try {
    const baseUrl = req.nextUrl.origin

    // Fetch repo data
    const repoRes = await fetch(`${baseUrl}/api/repo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: `https://${parsed.platform}.com/${parsed.owner}/${parsed.repo}` }),
    })
    if (!repoRes.ok) {
      const err = await repoRes.json()
      return NextResponse.json({ error: "fetch_failed", message: err.error ?? "Failed to fetch repository" }, { status: 502, headers })
    }
    const repoData = await repoRes.json()

    // Run analysis
    const analyzeRes = await fetch(`${baseUrl}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...repoData, meta: { ...repoData.meta, platform: parsed.platform === "github" ? "GitHub" : "GitLab" } }),
    })
    if (!analyzeRes.ok) {
      const err = await analyzeRes.json()
      return NextResponse.json({ error: "analysis_failed", message: err.error ?? "Analysis failed" }, { status: 502, headers })
    }
    const { analysis, meta } = await analyzeRes.json()

    return NextResponse.json({
      ok: true,
      version: "1.0",
      generatedAt: new Date().toISOString(),
      repository: {
        owner: meta.owner,
        repo: meta.repo,
        platform: parsed.platform,
        language: meta.language,
        stars: meta.stars,
        fileCount: meta.fileCount,
        license: meta.license ?? null,
        description: meta.description ?? null,
      },
      analysis: {
        overview: analysis.overview,
        dataItems: analysis.dataItems,
        dataFlowSummary: analysis.dataFlowSummary,
        modules: analysis.modules,
        score: analysis.score,
        overallVerdict: analysis.overallVerdict,
      },
      meta: {
        poweredBy: "iGITit",
        generatedBy: "Claude (Anthropic)",
        product: "OMARO PBC",
        docsUrl: "https://igitit.xyz/docs",
        embedUrl: `https://igitit.xyz/api/v1/embed?repo=${encodeURIComponent(repoParam)}`,
      },
    }, { headers })

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: "internal_error", message }, { status: 500, headers })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}
