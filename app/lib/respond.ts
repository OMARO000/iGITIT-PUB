/** Shared answers for the public API: errors in one shape, CORS on everything, the limit in headers. */
import { NextResponse } from "next/server"
import { NotARepo } from "./analyze"
import { CORS, DOCS_URL, RateLimited, remaining } from "./limits"
import { BudgetReached } from "./model"

export function ok(ip: string, body: Record<string, unknown>): NextResponse {
  const { remaining: left, resetAt } = remaining(ip)
  return NextResponse.json({ ok: true, ...body }, {
    headers: { ...CORS, "X-Fresh-Readings-Remaining": String(left), "X-Fresh-Readings-Reset": String(Math.ceil(resetAt / 1000)) },
  })
}

export function fail(status: number, error: string, message: string): NextResponse {
  return NextResponse.json({ ok: false, error, message, docs: DOCS_URL }, { status, headers: CORS })
}

/** Maps any thrown error to the API's answer. */
export function failFrom(e: unknown): NextResponse {
  if (e instanceof RateLimited) return fail(429, "fresh_limit_reached", e.message)
  if (e instanceof BudgetReached) return fail(503, "budget_reached", e.message)
  if (e instanceof NotARepo) return fail(400, "invalid_repo", e.message)
  console.error("reading failed:", e instanceof Error ? e.message : e)
  return fail(502, "reading_failed", "IRIS's code server couldn't read this repository just now. Try again later.")
}

export const preflight = () => new NextResponse(null, { status: 204, headers: CORS })
