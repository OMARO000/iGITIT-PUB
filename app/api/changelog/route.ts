import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const GITHUB_TOKEN = process.env.GITHUB_TOKEN

const CHANGELOG_SYSTEM = `You are iGITit's Change Log engine. Your job is to read software commit history and explain what actually changed — written for non-technical readers: journalists, regulators, researchers, and the general public.

You write like an investigative journalist covering a beat. Not "refactored auth module" — but "the way users log in was redesigned." Not "updated schema.ts" — but "the database structure for storing user data was changed."

You always respond with a valid JSON array of commit explanations:

[
  {
    "sha": "short commit sha (7 chars)",
    "date": "ISO date string from commit",
    "author": "commit author name",
    "originalMessage": "the raw commit message",
    "plainTitle": "8-12 word plain English title of what changed",
    "plainSummary": "2-3 sentence explanation of what changed and why it matters to a non-technical reader. Be specific about what the change does — not just that something changed, but what the effect is.",
    "significance": "routine" | "notable" | "flagged",
    "significanceReason": "1 sentence explaining why this significance level was assigned",
    "affectedAreas": ["short label of what was affected, e.g. 'user login', 'data storage', 'payments', 'privacy settings'"]
  }
]

Significance levels:
- "routine": dependency updates, typo fixes, formatting, minor text changes, version bumps, CI config
- "notable": new features, refactors, API changes, new integrations, performance changes, config updates
- "flagged": data collection changes, privacy policy changes, auth/security changes, third-party data sharing added, tracking code, data deletion or retention changes, encryption changes, permission scope changes

Rules:
- If a commit message is vague ("fix stuff", "updates", "wip"), use the file diffs to infer what actually changed
- affectedAreas should be 1-3 short human-readable labels
- Never use technical jargon without immediately explaining it
- If a diff shows a new third-party service being integrated, always flag it
- If you cannot determine what changed from the message and diff, say so honestly in plainSummary
- Respond ONLY with the JSON array. No preamble, no markdown backticks.`

async function getGitHubChangelog(owner: string, repo: string, depth: number) {
  const headers: Record<string, string> = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  }
  if (GITHUB_TOKEN) headers["Authorization"] = `Bearer ${GITHUB_TOKEN}`

  // Fetch commits
  const commitsRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits?per_page=${depth}`,
    { headers }
  )
  if (!commitsRes.ok) throw new Error(`GitHub commits error: ${commitsRes.status}`)
  const commits = await commitsRes.json()

  // Fetch diffs for each commit (limited to avoid rate limits)
  const commitDetails = await Promise.all(
    commits.slice(0, Math.min(depth, 25)).map(async (commit: { sha: string; commit: { message: string; author: { name: string; date: string } } }) => {
      try {
        const detailRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/commits/${commit.sha}`,
          { headers }
        )
        if (!detailRes.ok) return { sha: commit.sha, commit: commit.commit, files: [] }
        const detail = await detailRes.json()
        return {
          sha: commit.sha.slice(0, 7),
          date: commit.commit.author.date,
          author: commit.commit.author.name,
          message: commit.commit.message.split("\n")[0],
          files: (detail.files ?? []).slice(0, 8).map((f: { filename: string; status: string; additions: number; deletions: number; patch?: string }) => ({
            filename: f.filename,
            status: f.status,
            additions: f.additions,
            deletions: f.deletions,
            patch: f.patch?.slice(0, 800) ?? "",
          })),
        }
      } catch {
        return {
          sha: commit.sha.slice(0, 7),
          date: commit.commit.author.date,
          author: commit.commit.author.name,
          message: commit.commit.message.split("\n")[0],
          files: [],
        }
      }
    })
  )

  return commitDetails
}

async function getGitLabChangelog(owner: string, repo: string, depth: number) {
  const projectId = encodeURIComponent(`${owner}/${repo}`)
  const headers: Record<string, string> = { "Accept": "application/json" }

  const commitsRes = await fetch(
    `https://gitlab.com/api/v4/projects/${projectId}/repository/commits?per_page=${depth}`,
    { headers }
  )
  if (!commitsRes.ok) throw new Error(`GitLab commits error: ${commitsRes.status}`)
  const commits = await commitsRes.json()

  const commitDetails = await Promise.all(
    commits.slice(0, Math.min(depth, 25)).map(async (commit: { id: string; title: string; author_name: string; created_at: string }) => {
      try {
        const diffRes = await fetch(
          `https://gitlab.com/api/v4/projects/${projectId}/repository/commits/${commit.id}/diff`,
          { headers }
        )
        const diffs = diffRes.ok ? await diffRes.json() : []
        return {
          sha: commit.id.slice(0, 7),
          date: commit.created_at,
          author: commit.author_name,
          message: commit.title,
          files: (diffs ?? []).slice(0, 8).map((f: { new_path: string; new_file: boolean; deleted_file: boolean; diff: string }) => ({
            filename: f.new_path,
            status: f.new_file ? "added" : f.deleted_file ? "removed" : "modified",
            additions: 0,
            deletions: 0,
            patch: f.diff?.slice(0, 800) ?? "",
          })),
        }
      } catch {
        return {
          sha: commit.id.slice(0, 7),
          date: commit.created_at,
          author: commit.author_name,
          message: commit.title,
          files: [],
        }
      }
    })
  )

  return commitDetails
}

export async function POST(req: NextRequest) {
  try {
    const { owner, repo, platform, depth = 10 } = await req.json()

    if (!owner || !repo) {
      return NextResponse.json({ error: "owner and repo required" }, { status: 400 })
    }

    const commits = platform === "GitLab"
      ? await getGitLabChangelog(owner, repo, depth)
      : await getGitHubChangelog(owner, repo, depth)

    if (!commits.length) {
      return NextResponse.json({ error: "No commits found" }, { status: 404 })
    }

    // Build Claude prompt
    const commitsText = commits.map(c => {
      const filesSummary = c.files.length
        ? c.files.map((f: { filename: string; status: string; additions: number; deletions: number; patch: string }) =>
            `  FILE: ${f.filename} (${f.status}${f.additions || f.deletions ? `, +${f.additions}/-${f.deletions}` : ""})\n${f.patch ? `  DIFF:\n${f.patch}` : ""}`
          ).join("\n")
        : "  (no file details available)"

      return `COMMIT ${c.sha} — ${c.date} — ${c.author}
MESSAGE: ${c.message}
CHANGED FILES:
${filesSummary}`
    }).join("\n\n---\n\n")

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 6000,
      system: CHANGELOG_SYSTEM,
      messages: [{
        role: "user",
        content: `Analyze these ${commits.length} commits from ${owner}/${repo} and return the JSON array of plain-language explanations.

${commitsText}

Return the complete JSON array now.`
      }],
    })

    const rawText = response.content
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("")

    const clean = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim()

    let changelog
    try {
      changelog = JSON.parse(clean)
    } catch {
      return NextResponse.json({ error: "Failed to parse changelog", raw: clean }, { status: 500 })
    }

    return NextResponse.json({ changelog, total: commits.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
