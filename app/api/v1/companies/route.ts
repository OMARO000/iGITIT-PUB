import { NextRequest, NextResponse } from 'next/server'
import { CORS } from '@/app/lib/limits'

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

const GH_HEADERS = () => ({
  'Accept': 'application/vnd.github+json',
  'User-Agent': 'iGITit-app',
  ...(process.env.GITHUB_TOKEN ? { 'Authorization': `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
})

/**
 * ?site=example.com: the company's public code, found from its website. Tries the company list, then a GitHub
 * organization named like the site, and checks the organization's own website field against the site.
 * Answers with the public repositories, or says plainly that none were found (private code, or none published).
 */
async function bySite(siteRaw: string) {
  const site = siteRaw.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(site)) return { site, found: false, message: 'That isn\'t a website address.' }
  const brand = site.split('.').slice(-2)[0]
  const candidates = [...new Set([COMPANY_MAP[brand], brand, brand.replace(/-/g, '')].filter(Boolean) as string[])]
  for (const login of candidates) {
    const res = await fetch(`https://api.github.com/orgs/${encodeURIComponent(login)}`, { headers: GH_HEADERS(), next: { revalidate: 3600 } })
    if (!res.ok) continue
    const org = await res.json() as { login: string; name?: string; blog?: string; public_repos?: number; html_url: string }
    const blog = (org.blog ?? '').toLowerCase()
    const confirmed = blog.includes(site) || (!!COMPANY_MAP[brand] && COMPANY_MAP[brand] === login)
    if ((org.public_repos ?? 0) === 0) {
      return { site, found: true, confirmed, org: org.login, orgUrl: org.html_url, publicRepos: 0, repos: [], message: `${org.name ?? org.login} has a code organization on GitHub with no public repositories. Its code is private or unpublished.` }
    }
    const rr = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(`org:${org.login}`)}&sort=stars&per_page=10`, { headers: GH_HEADERS(), next: { revalidate: 3600 } })
    const items = rr.ok ? ((await rr.json()).items ?? []) : []
    return {
      site, found: true, confirmed, org: org.login, orgUrl: org.html_url, publicRepos: org.public_repos,
      repos: items.map((r: { full_name: string; html_url: string; description?: string; stargazers_count?: number }) => ({ name: r.full_name, url: r.html_url, description: r.description ?? null, stars: r.stargazers_count ?? 0 })),
      message: confirmed ? undefined : `IRIS matched ${site} to the GitHub organization "${org.login}" by name; that organization doesn't list ${site} as its website, so check it's the same company.`,
    }
  }
  return { site, found: false, repos: [], message: `IRIS found no public code from ${site}. The company's code may be private, or published under a name IRIS doesn't know.` }
}

export async function GET(req: NextRequest) {
  const siteParam = req.nextUrl.searchParams.get('site')
  if (siteParam) {
    try { return NextResponse.json({ ok: true, ...(await bySite(siteParam)) }, { headers: CORS }) }
    catch { return NextResponse.json({ ok: false, error: 'reading_failed', message: 'GitHub couldn\'t be reached. Try again later.' }, { status: 502, headers: CORS }) }
  }
  const q = req.nextUrl.searchParams.get('q')
  if (!q) return NextResponse.json({ repos: [] }, { headers: CORS })

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

    if (!ghRes.ok) return NextResponse.json({ repos: [] }, { headers: CORS })

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

    return NextResponse.json({ repos }, { headers: CORS })
  } catch {
    return NextResponse.json({ repos: [] }, { headers: CORS })
  }
}

export function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }) }
