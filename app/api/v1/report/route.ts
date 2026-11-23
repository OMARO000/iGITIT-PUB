import { NextResponse, type NextRequest } from "next/server"
import { CORS } from "@/app/lib/limits"
import { allow, checkReport, drop, MAX_BODY, publicKeyFrom } from "@/app/lib/reports"

export const dynamic = "force-dynamic"
const H = { ...CORS, "cache-control": "no-store" }

export function OPTIONS() { return new NextResponse(null, { status: 204, headers: H }) }

/** POST /iris/code/api/v1/report: IRIS's "Send to OMARO". Sealed on arrival; nothing about the sender is kept. */
export async function POST(req: NextRequest) {
  const key = process.env.REPORTS_PUBLIC_KEY
  if (!key) return NextResponse.json({ ok: false, why: "not open yet" }, { status: 503, headers: H })
  const who = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown"
  if (!allow(who)) return NextResponse.json({ ok: false, why: "too many reports this hour" }, { status: 429, headers: H })
  const text = await req.text()
  if (text.length > MAX_BODY) return NextResponse.json({ ok: false, why: "too long" }, { status: 413, headers: H })
  let body: unknown
  try { body = JSON.parse(text) } catch { return NextResponse.json({ ok: false, why: "not a report" }, { status: 400, headers: H }) }
  const c = checkReport(body)
  if (!c.ok) return NextResponse.json({ ok: false, why: c.why }, { status: 400, headers: H })
  const ok = await drop(c.report, publicKeyFrom(key)).catch(() => false)
  return NextResponse.json({ ok }, { status: ok ? 200 : 503, headers: H })
}
