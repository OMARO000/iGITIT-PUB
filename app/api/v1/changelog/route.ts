import { NextRequest } from "next/server"
import { changelogFor } from "@/app/lib/changelog"
import { clientIp, countFresh, mayReadFresh } from "@/app/lib/limits"
import { parseRepo } from "@/app/lib/repo"
import { fail, failFrom, ok, preflight } from "@/app/lib/respond"

/** GET /iris/code/api/v1/changelog?repo=<GitHub, GitLab, Codeberg or Radicle repository>&depth=10: the latest commits in plain language. */
export async function GET(req: NextRequest) {
  const ip = clientIp(req.headers)
  const raw = req.nextUrl.searchParams.get("repo")?.trim()
  if (!raw) return fail(400, "missing_parameter", "Required: ?repo=github.com/owner/repository")
  const ref = parseRepo(raw.includes("://") ? raw : raw.split("/").length === 2 ? `https://github.com/${raw}` : `https://${raw}`)
  if (!ref) return fail(400, "invalid_repo", "Changelog reads GitHub, GitLab, Codeberg and Radicle repositories.")
  try {
    const r = await changelogFor(ref, Number(req.nextUrl.searchParams.get("depth") ?? 10), mayReadFresh(ip))
    if (!r.stored) countFresh(ip)
    return ok(ip, { repository: ref.platform === "Radicle" ? ref.rid : `${ref.owner}/${ref.repo}`, ...r, stored: r.stored ?? null })
  } catch (e) {
    return failFrom(e)
  }
}

export const OPTIONS = preflight
