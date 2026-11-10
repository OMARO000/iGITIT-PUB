import { NextResponse } from "next/server"
import { CORS } from "@/app/lib/limits"
import { status } from "@/app/lib/status"

export const dynamic = "force-dynamic"

/** GET /iris/code/api/v1/status: database, model account and today's spending. 503 when either check fails. */
export async function GET() {
  const s = await status()
  return NextResponse.json(s, { status: s.ok ? 200 : 503, headers: { ...CORS, "cache-control": "no-store" } })
}
