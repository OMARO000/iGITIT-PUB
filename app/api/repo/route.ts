import { NextRequest, NextResponse } from "next/server"

const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const MAX_FILES = 20
const MAX_FILE_SIZE = 50000 // 50kb per file
const PRIORITY_FILES = [
  "README.md", "readme.md",
  "package.json", "package-lock.json",
  "tsconfig.json", ".env.example", ".env.sample",
  "schema.ts", "schema.sql", "db.ts",
  "middleware.ts", "next.config.ts", "next.config.js",
]
const PRIORITY_DIRS = ["lib", "app", "src", "components", "scripts", "api"]
const SKIP_DIRS = ["node_modules", ".git", ".next", "dist", "build", ".cache", "coverage"]
const SKIP_EXTS = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".woff", ".ttf", ".mp4", ".mp3", ".pdf", ".zip", ".lock"]

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/?\s#]+)/)
  if (!match) return null
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") }
}

function parseGitLabUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/gitlab\.com\/([^/]+)\/([^/?\s#]+)/)
  if (!match) return null
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") }
}

function shouldSkipFile(path: string): boolean {
  const ext = "." + path.split(".").pop()?.toLowerCase()
  if (SKIP_EXTS.includes(ext)) return true
  if (SKIP_DIRS.some(dir => path.startsWith(dir + "/") || path.includes("/" + dir + "/"))) return true
  return false
}

function priorityScore(path: string): number {
  const filename = path.split("/").pop() ?? ""
  if (PRIORITY_FILES.includes(filename)) return 100
  const topDir = path.split("/")[0]
  if (PRIORITY_DIRS.includes(topDir)) return 50
  if (path.includes("auth") || path.includes("db") || path.includes("data")) return 40
  if (path.endsWith(".ts") || path.endsWith(".tsx")) return 20
  if (path.endsWith(".js") || path.endsWith(".jsx")) return 15
  return 0
}

async function fetchGitHubRepo(owner: string, repo: string) {
  const headers: Record<string, string> = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  }
  if (GITHUB_TOKEN) headers["Authorization"] = `Bearer ${GITHUB_TOKEN}`

  // Get repo metadata
  const metaRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers })
  if (!metaRes.ok) throw new Error(`GitHub API error: ${metaRes.status}`)
  const meta = await metaRes.json()

  // Get file tree
  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
    { headers }
  )
  if (!treeRes.ok) throw new Error(`GitHub tree error: ${treeRes.status}`)
  const treeData = await treeRes.json()

  const allFiles = (treeData.tree ?? [])
    .filter((f: { type: string; path: string }) => f.type === "blob" && !shouldSkipFile(f.path))
    .sort((a: { path: string }, b: { path: string }) => priorityScore(b.path) - priorityScore(a.path))
    .slice(0, MAX_FILES)

  // Fetch file contents
  const fileContents: Record<string, string> = {}
  await Promise.all(
    allFiles.map(async (file: { path: string; url: string }) => {
      try {
        const contentRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`,
          { headers }
        )
        if (!contentRes.ok) return
        const contentData = await contentRes.json()
        if (contentData.encoding === "base64" && contentData.content) {
          const decoded = Buffer.from(contentData.content, "base64").toString("utf-8")
          if (decoded.length <= MAX_FILE_SIZE) {
            fileContents[file.path] = decoded
          }
        }
      } catch { /* skip failed files */ }
    })
  )

  return {
    meta: {
      owner,
      repo,
      description: meta.description ?? "",
      language: meta.language ?? "Unknown",
      stars: meta.stargazers_count ?? 0,
      fileCount: treeData.tree?.filter((f: { type: string }) => f.type === "blob").length ?? 0,
      topics: meta.topics ?? [],
      license: meta.license?.name ?? null,
      updatedAt: meta.updated_at ?? null,
    },
    files: fileContents,
    filePaths: Object.keys(fileContents),
  }
}

async function fetchGitLabRepo(owner: string, repo: string) {
  const projectId = encodeURIComponent(`${owner}/${repo}`)
  const GITLAB_TOKEN = process.env.GITLAB_TOKEN
  const headers: Record<string, string> = { "Accept": "application/json" }
  if (GITLAB_TOKEN) headers["Authorization"] = `Bearer ${GITLAB_TOKEN}`

  const metaRes = await fetch(`https://gitlab.com/api/v4/projects/${projectId}`, { headers })
  if (!metaRes.ok) throw new Error(`GitLab API error: ${metaRes.status}`)
  const meta = await metaRes.json()

  const defaultBranch = meta.default_branch ?? "main"

  // Don't use recursive — fetch files from priority dirs directly
  const priorityPaths = ["", "src", "app", "lib", "api", "scripts"]
  let allTreeItems: { type: string; path: string }[] = []

  for (const dirPath of priorityPaths) {
    try {
      const url = `https://gitlab.com/api/v4/projects/${projectId}/repository/tree?per_page=100&ref=${defaultBranch}${dirPath ? `&path=${encodeURIComponent(dirPath)}` : ""}`
      const res = await fetch(url, { headers })
      if (!res.ok) continue
      const data = await res.json()
      if (Array.isArray(data)) allTreeItems = [...allTreeItems, ...data]
    } catch { continue }
  }

  const allFiles = allTreeItems
    .filter((f: { type: string; path: string }) => f.type === "blob" && !shouldSkipFile(f.path))
    .sort((a: { path: string }, b: { path: string }) => priorityScore(b.path) - priorityScore(a.path))
    .slice(0, MAX_FILES)

  const fileContents: Record<string, string> = {}
  await Promise.all(
    allFiles.map(async (file: { path: string }) => {
      try {
        const contentRes = await fetch(
          `https://gitlab.com/api/v4/projects/${projectId}/repository/files/${encodeURIComponent(file.path)}/raw?ref=${defaultBranch}`,
          { headers }
        )
        if (!contentRes.ok) return
        const text = await contentRes.text()
        if (text.length <= MAX_FILE_SIZE) {
          fileContents[file.path] = text
        }
      } catch { /* skip failed files */ }
    })
  )

  return {
    meta: {
      owner,
      repo,
      description: meta.description ?? "",
      language: meta.predominant_language ?? "Unknown",
      stars: meta.star_count ?? 0,
      fileCount: allTreeItems.filter(f => f.type === "blob").length,
      topics: meta.topics ?? [],
      license: meta.license?.name ?? null,
      updatedAt: meta.last_activity_at ?? null,
    },
    files: fileContents,
    filePaths: Object.keys(fileContents),
  }
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 })

    let result
    if (url.includes("github.com")) {
      const parsed = parseGitHubUrl(url)
      if (!parsed) return NextResponse.json({ error: "Invalid GitHub URL" }, { status: 400 })
      result = await fetchGitHubRepo(parsed.owner, parsed.repo)
    } else if (url.includes("gitlab.com")) {
      const parsed = parseGitLabUrl(url)
      if (!parsed) return NextResponse.json({ error: "Invalid GitLab URL" }, { status: 400 })
      result = await fetchGitLabRepo(parsed.owner, parsed.repo)
    } else {
      return NextResponse.json({ error: "Only GitHub and GitLab URLs are supported" }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
