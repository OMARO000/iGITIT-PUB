import { NextResponse } from "next/server"
import { CORS, trustedClientIp } from "@/app/lib/limits"
import { lookup } from "@/app/lib/netOwner"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /iris/code/api/v1/net-owner ("Check from outside"; the OMARO site will forward /iris/net/owner here
 * once omaro.org is bought): the address this request came from
 * and the network that owns it. IRIS asks first, every time (Linux app spec 4.3). No cookies; nothing here
 * logs or stores the address.
 */
export async function GET(req: Request) {
  const ip = trustedClientIp(req.headers)
  if (!ip) return NextResponse.json({ error: "IRIS couldn't see the address this request came from." }, { status: 503, headers: { ...CORS, "cache-control": "no-store" } })
  return NextResponse.json(lookup(ip), { headers: { ...CORS, "cache-control": "no-store", "referrer-policy": "no-referrer" } })
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}
