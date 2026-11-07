import { NextRequest, NextResponse } from "next/server"
import { parseRepo, readRepo } from "@/app/lib/repo"

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 })
    const ref = parseRepo(String(url))
    if (!ref) return NextResponse.json({ error: "Only GitHub, GitLab, and Radicle URLs are supported" }, { status: 400 })
    return NextResponse.json(await readRepo(ref))
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
