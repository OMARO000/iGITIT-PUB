import { BASE } from "./address"
/**
 * The public API's limit: 10 fresh readings an hour per address. Stored and carried-forward readings are free
 * and never counted, so IRIS users reading popular repositories aren't held back. In memory, per server.
 */
export const FRESH_PER_HOUR = 10
const WINDOW_MS = 60 * 60 * 1000
const used = new Map<string, { count: number; resetAt: number }>()

export class RateLimited extends Error {
  constructor() { super(`This address has used its ${FRESH_PER_HOUR} fresh readings for the hour. Stored readings are still available.`) }
}

function entry(ip: string, now = Date.now()) {
  const e = used.get(ip)
  if (!e || now > e.resetAt) { const fresh = { count: 0, resetAt: now + WINDOW_MS }; used.set(ip, fresh); return fresh }
  return e
}

/** Whether this address may start a fresh (paid) reading now. */
export const mayReadFresh = (ip: string) => entry(ip).count < FRESH_PER_HOUR
/** Counts one fresh reading against this address. */
export function countFresh(ip: string): void { entry(ip).count++ }
export function remaining(ip: string): { remaining: number; resetAt: number } {
  const e = entry(ip)
  return { remaining: Math.max(0, FRESH_PER_HOUR - e.count), resetAt: e.resetAt }
}

/**
 * The address a request came from, as Render's edge (Cloudflare) saw it. True-Client-IP and CF-Connecting-IP
 * are set by the edge and can't be forged by the sender; the first X-Forwarded-For entry can, since Render
 * appends to that header without clearing it. Null when neither trusted header is there (local runs).
 */
export function trustedClientIp(headers: Headers): string | null {
  return headers.get("true-client-ip")?.trim() || headers.get("cf-connecting-ip")?.trim() || null
}

/** The key for the hourly limit. Falls back to the last X-Forwarded-For entry (added by Render's proxy). */
export function clientIp(headers: Headers): string {
  return trustedClientIp(headers) || headers.get("x-forwarded-for")?.split(",").pop()?.trim() || headers.get("x-real-ip") || "unknown"
}

/** Every API answer may be read from any site or extension: the API holds only public information. */
export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

export const DOCS_URL = `${BASE}/docs`
