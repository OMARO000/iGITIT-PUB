import { NextRequest } from "next/server"
import { analyzeRepo } from "@/app/lib/analyze"
import { haiOf } from "@/app/lib/hai"
import { clientIp, countFresh, mayReadFresh } from "@/app/lib/limits"
import { fail, failFrom, ok, preflight } from "@/app/lib/respond"

/**
 * GET /igitit/api/v1/analyze?repo=<GitHub, GitLab or Radicle address>
 * The full analysis: overview, data the code collects, stores and sends, data flow, modules, the HAI Standard's 9 pillars, machine learning and model cards,
 * dark patterns, license, platform context and verdict. From the store when that commit (or an unchanged later one)
 * was read; otherwise a fresh reading, which counts against this address's 10 an hour.
 */
export async function GET(req: NextRequest) {
  const ip = clientIp(req.headers)
  const raw = req.nextUrl.searchParams.get("repo")?.trim()
  if (!raw) return fail(400, "missing_parameter", "Required: ?repo=github.com/owner/repository")
  const url = raw.includes("://") ? raw : raw.split("/").length === 2 ? `https://github.com/${raw}` : `https://${raw}`
  try {
    const fresh = mayReadFresh(ip)
    const result = await analyzeRepo(url, fresh)
    if (!result.stored) countFresh(ip)
    return ok(ip, {
      version: "1.2",
      repository: result.meta,
      commit: result.meta.commit ?? null,
      readAt: result.stored?.readAt ?? new Date().toISOString(),
      stored: result.stored ?? null,
      // Readings from before 2026-11-08 carry the older pillar keys; `hai` is always the HAI Standard v1.1 numbering.
      analysis: { ...result.analysis, hai: haiOf(result.analysis) },
    })
  } catch (e) {
    return failFrom(e)
  }
}

export const OPTIONS = preflight
