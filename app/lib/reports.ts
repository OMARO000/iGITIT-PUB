/**
 * The report drop box. IRIS's "Send to OMARO" posts a report here; OMARO's review desk collects it later and the
 * drop box deletes it. Each report is sealed on arrival to OMARO's public key (X25519, HKDF-SHA256, AES-256-GCM), so
 * this server can't read what it holds. Nothing about the sender is kept: no address, no headers, no account.
 */
import { createCipheriv, createDecipheriv, createPrivateKey, createPublicKey, diffieHellman, generateKeyPairSync, hkdfSync, randomBytes, timingSafeEqual, type KeyObject } from "node:crypto"
import { ready_ } from "./store"

export const KINDS = ["broke", "reading", "idea"] as const
export type Kind = (typeof KINDS)[number]
export interface Report { kind: Kind; said: string; expected?: string; facts?: string; app?: string }
export const MAX_TEXT = 4000, MAX_FACTS = 600, MAX_BODY = 12_000

/** Pure: a report as IRIS sends it, or the reason it's refused. A security problem never comes here. */
export function checkReport(x: unknown): { ok: true; report: Report } | { ok: false; why: string } {
  if (!x || typeof x !== "object") return { ok: false, why: "not a report" }
  const r = x as Record<string, unknown>
  if (!KINDS.includes(r.kind as Kind)) return { ok: false, why: "unknown kind" }
  const str = (v: unknown, max: number) => (v === undefined || v === null ? "" : typeof v === "string" && v.length <= max ? v.trim() : null)
  const said = str(r.said, MAX_TEXT), expected = str(r.expected, MAX_TEXT), facts = str(r.facts, MAX_FACTS), app = str(r.app, 40)
  if (said === null || expected === null || facts === null || app === null) return { ok: false, why: "too long" }
  if (!said) return { ok: false, why: "empty" }
  const known = new Set(["kind", "said", "expected", "facts", "app"])
  if (Object.keys(r).some((k) => !known.has(k))) return { ok: false, why: "unexpected field" }
  return { ok: true, report: { kind: r.kind as Kind, said, ...(expected ? { expected } : {}), ...(facts ? { facts } : {}), ...(app ? { app } : {}) } }
}

const INFO = Buffer.from("omaro report v1")

export function publicKeyFrom(b64: string): KeyObject {
  return createPublicKey({ key: { kty: "OKP", crv: "X25519", x: Buffer.from(b64, "base64").toString("base64url") }, format: "jwk" })
}

/** Seal to the review desk's public key. Output: ephemeral public key (32) | nonce (12) | tag (16) | ciphertext, base64. */
export function seal(plain: string, to: KeyObject): string {
  const eph = generateKeyPairSync("x25519")
  const shared = diffieHellman({ privateKey: eph.privateKey, publicKey: to })
  const ephRaw = Buffer.from(eph.publicKey.export({ format: "jwk" }).x!, "base64url")
  const key = Buffer.from(hkdfSync("sha256", shared, ephRaw, INFO, 32))
  const nonce = randomBytes(12)
  const c = createCipheriv("aes-256-gcm", key, nonce)
  const body = Buffer.concat([c.update(plain, "utf8"), c.final()])
  return Buffer.concat([ephRaw, nonce, c.getAuthTag(), body]).toString("base64")
}

/** The other half, used by the review desk (and the tests). The private key is PKCS#8 DER, base64. */
export function open(sealed: string, privateKeyB64: string): string {
  const b = Buffer.from(sealed, "base64")
  const ephRaw = b.subarray(0, 32), nonce = b.subarray(32, 44), tag = b.subarray(44, 60), body = b.subarray(60)
  const priv = createPrivateKey({ key: Buffer.from(privateKeyB64, "base64"), format: "der", type: "pkcs8" })
  const shared = diffieHellman({ privateKey: priv, publicKey: publicKeyFrom(ephRaw.toString("base64")) })
  const key = Buffer.from(hkdfSync("sha256", shared, ephRaw, INFO, 32))
  const dc = createDecipheriv("aes-256-gcm", key, nonce)
  dc.setAuthTag(tag)
  return Buffer.concat([dc.update(body), dc.final()]).toString("utf8")
}

/** Pure: the pull token check, in constant time. */
export function tokenOk(given: string | null, expected: string | undefined): boolean {
  if (!expected || expected.length < 32 || !given) return false
  const a = Buffer.from(given), b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

// A sender's address is held in memory for an hour only to count reports (5 an hour), and never written down.
const recent = new Map<string, number[]>()
export function allow(who: string, now = Date.now()): boolean {
  const hour = (recent.get(who) ?? []).filter((t) => now - t < 3_600_000)
  if (hour.length >= 5) { recent.set(who, hour); return false }
  hour.push(now)
  recent.set(who, hour)
  if (recent.size > 50_000) recent.clear()
  return true
}

async function migrate() {
  const s = await ready_()
  if (!s) return null
  await s`create table if not exists igitit.reports (id bigserial primary key, sealed text not null, created_at timestamptz not null default now())`
  return s
}

export async function drop(report: Report, key: KeyObject): Promise<boolean> {
  const s = await migrate()
  if (!s) return false
  const [{ n }] = await s<{ n: number }[]>`select count(*)::int as n from igitit.reports`
  if (n >= 5000) return false
  await s`insert into igitit.reports (sealed) values (${seal(JSON.stringify(report), key)})`
  return true
}

export async function waiting(): Promise<{ id: string; sealed: string; at: string }[]> {
  const s = await migrate()
  if (!s) return []
  const rows = await s<{ id: string; sealed: string; created_at: Date }[]>`select id::text, sealed, created_at from igitit.reports order by id limit 200`
  return rows.map((r) => ({ id: r.id, sealed: r.sealed, at: r.created_at.toISOString() }))
}

export async function collected(ids: string[]): Promise<number> {
  const s = await migrate()
  if (!s || !ids.length) return 0
  const r = await s`delete from igitit.reports where id = any(${ids.map(Number).filter(Number.isFinite)}::bigint[])`
  return r.count
}
