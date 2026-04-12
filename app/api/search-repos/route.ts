import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  if (!q) return NextResponse.json({ repos: [] })

  try {
    const ghRes = await fetch(
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

    if (!ghRes.ok) return NextResponse.json({ repos: [] })

    const data = await ghRes.json()
    const repos = (data.items ?? []).map((r: any) => ({
      name: r.full_name,
      url: r.html_url,
      description: r.description ?? null,
    }))

    return NextResponse.json({ repos })
  } catch {
    return NextResponse.json({ repos: [] })
  }
}
