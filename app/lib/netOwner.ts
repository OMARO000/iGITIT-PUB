import { existsSync, readFileSync } from "node:fs"
import { isIP } from "node:net"
import { join } from "node:path"
import { gunzipSync } from "node:zlib"

/**
 * "Check from outside" (IRIS Linux app spec 4.3): which network owns an address. Looked up in IPtoASN's
 * public-domain tables kept on this server (scripts/ip2asn.mjs), so the address goes to no one else.
 * Nothing here writes the address anywhere.
 */
export interface Owner { address: string; owner: string | null; asn: number | null; country: string | null }

interface Table { starts: number[] | string[]; ends: number[] | string[]; asn: number[]; name: string[]; cc: string[] }

/** IPv6 as 32 hex digits, so string order is address order. */
export function v6key(addr: string): string {
  const [head, tail] = addr.toLowerCase().includes("::") ? addr.toLowerCase().split("::") : [addr.toLowerCase(), null]
  const h = head ? head.split(":") : []
  const t = tail ? tail.split(":") : []
  let parts = h
  if (tail !== null) parts = [...h, ...Array(8 - h.length - t.length).fill("0"), ...t]
  // An IPv4 tail (::ffff:1.2.3.4) is two groups.
  const last = parts[parts.length - 1] ?? ""
  if (last.includes(".")) {
    const n = v4num(last)
    parts = [...parts.slice(0, -1), (n >>> 16).toString(16), (n & 0xffff).toString(16)]
    if (tail !== null && parts.length > 8) parts.splice(h.length, parts.length - 8)
  }
  return parts.map((p) => p.padStart(4, "0")).join("")
}

export function v4num(addr: string): number {
  return addr.split(".").reduce((n, o) => n * 256 + Number(o), 0)
}

/** Parses an IPtoASN table: start, end, AS number, country code, AS name; tab-separated. */
export function parseTable(text: string, family: 4 | 6): Table {
  const t: Table = { starts: [], ends: [], asn: [], name: [], cc: [] }
  for (const line of text.split("\n")) {
    const [s, e, asn, cc, ...name] = line.split("\t")
    if (!s || !e || asn === undefined) continue
    const n = Number(asn)
    if (!n) continue // AS 0: not routed
    ;(t.starts as unknown[]).push(family === 4 ? Number(s) : v6key(s))
    ;(t.ends as unknown[]).push(family === 4 ? Number(e) : v6key(e))
    t.asn.push(n)
    t.cc.push(cc && cc !== "None" ? cc : "")
    t.name.push(name.join("\t").trim())
  }
  return t
}

export function find(t: Table, key: number | string): number {
  let lo = 0, hi = t.starts.length - 1, hit = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (t.starts[mid]! <= key) { hit = mid; lo = mid + 1 } else hi = mid - 1
  }
  return hit >= 0 && key <= t.ends[hit]! ? hit : -1
}

const countries = new Intl.DisplayNames(["en"], { type: "region" })
function countryName(cc: string): string | null {
  if (!/^[A-Z]{2}$/.test(cc)) return null
  try { return countries.of(cc) ?? cc } catch { return cc }
}

let tables: { 4: Table | null; 6: Table | null } | null = null
function load(family: 4 | 6): Table | null {
  // Fetched at build into <repository>/data/ip2asn (scripts/ip2asn.mjs); the server starts in the repository.
  const dir = process.env.IP2ASN_DIR || join(/* turbopackIgnore: true */ process.cwd(), "data", "ip2asn")
  const path = join(/* turbopackIgnore: true */ dir, family === 4 ? "ip2asn-v4-u32.tsv.gz" : "ip2asn-v6.tsv.gz")
  if (!existsSync(path)) return null
  try { return parseTable(gunzipSync(readFileSync(path)).toString("utf8"), family) } catch { return null }
}

export function lookup(address: string, given?: { 4: Table | null; 6: Table | null }): Owner {
  const fam = isIP(address)
  const none: Owner = { address, owner: null, asn: null, country: null }
  if (fam !== 4 && fam !== 6) return none
  const t = given ?? (tables ??= { 4: load(4), 6: load(6) })
  const table = t[fam]
  if (!table) return none
  const i = find(table, fam === 4 ? v4num(address) : v6key(address))
  if (i < 0) return none
  return { address, owner: table.name[i] || null, asn: table.asn[i] ?? null, country: countryName(table.cc[i] ?? "") }
}
