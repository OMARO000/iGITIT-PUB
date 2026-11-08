import { NextRequest } from "next/server"
import { analyzeRepo } from "@/app/lib/analyze"
import { compareRepos } from "@/app/lib/compare"
import { clientIp, countFresh, mayReadFresh } from "@/app/lib/limits"
import { fail, failFrom, ok, preflight } from "@/app/lib/respond"

const asUrl = (raw: string) => raw.includes("://") ? raw : raw.split("/").length === 2 ? `https://github.com/${raw}` : `https://${raw}`

/** GET /iris/code/api/v1/compare?a=<repository>&b=<repository>: the two analyses side by side, written in plain language. */
export async function GET(req: NextRequest) {
  const ip = clientIp(req.headers)
  const a = req.nextUrl.searchParams.get("a")?.trim(), b = req.nextUrl.searchParams.get("b")?.trim()
  if (!a || !b) return fail(400, "missing_parameter", "Required: ?a=<repository>&b=<repository>")
  try {
    const left = await analyzeRepo(asUrl(a), mayReadFresh(ip))
    if (!left.stored) countFresh(ip)
    const right = await analyzeRepo(asUrl(b), mayReadFresh(ip))
    if (!right.stored) countFresh(ip)
    const c = await compareRepos(left, right, mayReadFresh(ip))
    if (!c.stored) countFresh(ip)
    return ok(ip, { a: left.meta, b: right.meta, comparison: c.comparison, stored: c.stored ?? null })
  } catch (e) {
    return failFrom(e)
  }
}

export const OPTIONS = preflight
