import { NextRequest, NextResponse } from 'next/server'

// Company → GitHub org resolver table
const COMPANY_MAP: Record<string, string> = {
  // Social / Meta
  twitter: "twitter",
  "x.com": "twitter",
  instagram: "facebook",
  whatsapp: "facebook",
  facebook: "facebook",
  meta: "facebook",
  snapchat: "Snapchat",
  snap: "Snapchat",
  tiktok: "bytedance",
  bytedance: "bytedance",
  // Big Tech
  google: "google",
  alphabet: "google",
  microsoft: "microsoft",
  apple: "apple",
  amazon: "amzn",
  aws: "aws",
  // Streaming / Media
  netflix: "Netflix",
  spotify: "spotify",
  // Ride / Travel
  uber: "uber",
  airbnb: "airbnb",
  lyft: "lyft",
  // Dev tools / Infra
  vercel: "vercel",
  nextjs: "vercel",
  stripe: "stripe",
  shopify: "Shopify",
  discord: "discord",
  slack: "slackhq",
  zoom: "zoom",
  figma: "figma",
  notion: "makenotion",
  supabase: "supabase",
  firebase: "firebase",
  cloudflare: "cloudflare",
  hashicorp: "hashicorp",
  terraform: "hashicorp",
  grafana: "grafana",
  // AI
  openai: "openai",
  anthropic: "anthropic",
  huggingface: "huggingface",
  // ML / OSS frameworks
  pytorch: "pytorch",
  tensorflow: "tensorflow",
  react: "facebook",
  "react native": "facebook",
  vue: "vuejs",
  angular: "angular",
  svelte: "sveltejs",
  // Databases
  redis: "redis",
  postgres: "postgres",
  postgresql: "postgres",
  mongodb: "mongodb",
  // Systems
  linux: "torvalds",
  kubernetes: "kubernetes",
  docker: "docker",
  nginx: "nginx",
}

/**
 * Resolve a free-text company/product name to a GitHub org slug.
 * Returns the original query if no match found.
 */
function resolveOrg(query: string): { org: string; resolved: boolean } {
  const lower = query.toLowerCase().trim()

  // 1. Exact match
  if (COMPANY_MAP[lower]) return { org: COMPANY_MAP[lower], resolved: true }

  // 2. Fuzzy: query contains a known key (e.g. "Meta Platforms" → "facebook")
  for (const [key, org] of Object.entries(COMPANY_MAP)) {
    if (lower.includes(key)) return { org, resolved: true }
  }

  // 3. Fuzzy: a known key contains the query (e.g. "postgre" → "postgres")
  for (const [key, org] of Object.entries(COMPANY_MAP)) {
    if (key.includes(lower) && lower.length >= 4) return { org, resolved: true }
  }

  return { org: query, resolved: false }
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  if (!q) return NextResponse.json({ repos: [] })

  try {
    const { org, resolved } = resolveOrg(q)

    // If we resolved to a known org, search within that org; otherwise free search
    const searchQuery = resolved ? `org:${org}` : q

    const ghRes = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(searchQuery)}&sort=stars&per_page=5`,
      {
        headers: {
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'iGITit-app',
          ...(process.env.GITHUB_TOKEN ? { 'Authorization': `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
        },
        next: { revalidate: 300 },
      }
    )

    if (!ghRes.ok) return NextResponse.json({ repos: [] })

    const data = await ghRes.json()

    // If org search returned nothing, fall back to free text
    let items = data.items ?? []
    if (resolved && items.length === 0) {
      const fallback = await fetch(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&per_page=5`,
        {
          headers: {
            'Accept': 'application/vnd.github+json',
            'User-Agent': 'iGITit-app',
            ...(process.env.GITHUB_TOKEN ? { 'Authorization': `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
          },
          next: { revalidate: 300 },
        }
      )
      const fallbackData = await fallback.json()
      items = fallbackData.items ?? []
    }

    const repos = items.map((r: any) => ({
      name: r.full_name,
      url: r.html_url,
      description: r.description ?? null,
    }))

    return NextResponse.json({ repos })
  } catch {
    return NextResponse.json({ repos: [] })
  }
}
