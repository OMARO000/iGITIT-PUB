/**
 * Does a repository need reading again? Fixed rules over the files changed between two commits; no model, no cost.
 * A reading is carried forward to a new commit when nothing that could change it was touched (cost control, 2026-11-08).
 * The levels match iGITit's changelog: "flagged" means read again.
 */
import type { RepoRef } from "./repo"

/** Dependency manifests: a change can add a third-party service. */
const DEPENDENCIES = /(^|\/)(package\.json|package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb|requirements[^/]*\.txt|pyproject\.toml|Pipfile(\.lock)?|poetry\.lock|go\.(mod|sum)|Cargo\.(toml|lock)|Gemfile(\.lock)?|composer\.(json|lock)|build\.gradle(\.kts)?|pom\.xml|Podfile(\.lock)?|[^/]+\.podspec|Package\.swift|pubspec\.yaml|mix\.exs|[^/]+\.csproj)$/i

/** Paths about data, sign-in, tracking, payments, permissions or privacy. */
const DATA_PATHS = /(schema|migrat|(^|\/)models?(\/|\.)|(^|\/)db(\/|\.)|database|prisma|drizzle|auth|login|signin|signup|session|oauth|saml|token|cookie|consent|privacy|gdpr|ccpa|analytics|telemetry|tracking|tracker|metrics|sentry|segment|mixpanel|amplitude|posthog|(^|[/_-])ads?([/_.-]|$)|advert|payment|stripe|billing|checkout|encrypt|crypto|permission|AndroidManifest\.xml|Info\.plist|(^|\/)manifest\.json|\.env|middleware|webhook|upload|storage|retention|delete|export)/i

/** A reading this old is read again whatever changed. */
export const MAX_AGE_DAYS = 90
/** More files than GitHub lists in one comparison means we can't see them all: read again. */
const MAX_FILES = 300

export interface ChangeCheck { flagged: boolean; reason: string; files: number }

export function classify(paths: string[], truncated = false): ChangeCheck {
  if (truncated || paths.length >= MAX_FILES) return { flagged: true, reason: "too many changed files to check", files: paths.length }
  const deps = paths.filter((p) => DEPENDENCIES.test(p))
  if (deps.length) return { flagged: true, reason: `dependencies changed (${deps.slice(0, 3).join(", ")})`, files: paths.length }
  const data = paths.filter((p) => DATA_PATHS.test(p))
  if (data.length) return { flagged: true, reason: `data-related files changed (${data.slice(0, 3).join(", ")})`, files: paths.length }
  return { flagged: false, reason: paths.length ? `${paths.length} changed files, none about data, sign-in, tracking, dependencies or privacy` : "no file changes", files: paths.length }
}

/** Compares two commits. GitHub only for now; anything it can't check counts as flagged. */
export async function checkChanges(ref: RepoRef, from: string, to: string, readAt: string, now = Date.now()): Promise<ChangeCheck> {
  if (now - Date.parse(readAt) > MAX_AGE_DAYS * 86_400_000) return { flagged: true, reason: `last read more than ${MAX_AGE_DAYS} days ago`, files: 0 }
  if (from === to) return { flagged: false, reason: "same commit", files: 0 }
  if (ref.platform !== "GitHub") return { flagged: true, reason: `${ref.platform} comparisons aren't checked yet`, files: 0 }
  const headers: Record<string, string> = { Accept: "application/vnd.github+json" }
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  try {
    const res = await fetch(`https://api.github.com/repos/${ref.owner}/${ref.repo}/compare/${from}...${to}?per_page=300`, { headers })
    if (!res.ok) return { flagged: true, reason: `comparison unavailable (${res.status})`, files: 0 }
    const j = await res.json() as { status?: string; total_commits?: number; files?: { filename: string; previous_filename?: string }[] }
    if (j.status === "diverged" || j.status === "behind") return { flagged: true, reason: `history ${j.status}`, files: 0 }
    const paths = (j.files ?? []).flatMap((f) => [f.filename, f.previous_filename ?? ""]).filter(Boolean)
    return classify(paths, (j.files?.length ?? 0) >= MAX_FILES)
  } catch {
    return { flagged: true, reason: "comparison failed", files: 0 }
  }
}
