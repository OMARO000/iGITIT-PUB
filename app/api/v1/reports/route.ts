import { NextResponse, type NextRequest } from "next/server"
import { collected, tokenOk, waiting } from "@/app/lib/reports"

export const dynamic = "force-dynamic"
const H = { "cache-control": "no-store" }
const authed = (req: NextRequest) => tokenOk((req.headers.get("authorization") ?? "").replace(/^Bearer /, "") || null, process.env.REPORTS_PULL_TOKEN)

/** GET: the sealed reports waiting for OMARO's review desk. Only with the pull token; anyone else gets a bare 404. */
export async function GET(req: NextRequest) {
  if (!authed(req)) return new NextResponse("Not Found", { status: 404 })
  return NextResponse.json({ reports: await waiting() }, { headers: H })
}

/** DELETE: the review desk has them; the drop box forgets them. Body: { ids: string[] }. */
export async function DELETE(req: NextRequest) {
  if (!authed(req)) return new NextResponse("Not Found", { status: 404 })
  const { ids } = (await req.json().catch(() => ({}))) as { ids?: unknown }
  const list = Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string").slice(0, 200) : []
  return NextResponse.json({ deleted: await collected(list) }, { headers: H })
}
