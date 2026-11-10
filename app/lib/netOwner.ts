import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
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

type Tables = { 4: Table | null; 6: Table | null }
let tables: Tables | null = null
let loadedAt = 0
let loading: Promise<Tables> | null = null
const FILES = { 4: "ip2asn-v4-u32.tsv.gz", 6: "ip2asn-v6.tsv.gz" } as const
const WEEK = 7 * 24 * 60 * 60 * 1000

function dir(): string {
  // Fetched at build into <repository>/data/ip2asn (scripts/ip2asn.mjs); the server starts in the repository.
  return process.env.IP2ASN_DIR || join(/* turbopackIgnore: true */ process.cwd(), "data", "ip2asn")
}

/** One table: from disk when the build fetched it, otherwise downloaded once from IPtoASN (no address sent). */
async function loadOne(family: 4 | 6): Promise<Table | null> {
  const path = join(/* turbopackIgnore: true */ dir(), FILES[family])
  try {
    let gz: Buffer
    if (existsSync(path) && Date.now() - statSync(path).mtimeMs < WEEK) gz = readFileSync(path)
    else {
      const r = await fetch(`https://iptoasn.com/data/${FILES[family]}`, { signal: AbortSignal.timeout(60_000) })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      gz = Buffer.from(await r.arrayBuffer())
      try { mkdirSync(dir(), { recursive: true }); writeFileSync(path, gz) } catch { /* kept in memory only */ }
    }
    return parseTable(gunzipSync(gz).toString("utf8"), family)
  } catch (e) {
    console.warn(`net-owner: table ${FILES[family]} unavailable (${(e as Error).message})`)
    return null
  }
}

/** Loads both tables once, refreshing weekly; concurrent callers share one load. */
export function ensureTables(): Promise<Tables> {
  if (tables && Date.now() - loadedAt < WEEK) return Promise.resolve(tables)
  loading ??= Promise.all([loadOne(4), loadOne(6)]).then(([v4, v6]) => {
    loading = null
    if (v4 || v6) { tables = { 4: v4, 6: v6 }; loadedAt = Date.now() }
    return tables ?? { 4: null, 6: null }
  })
  return loading
}

export function lookup(address: string, given?: Tables): Owner {
  const fam = isIP(address)
  const none: Owner = { address, owner: null, asn: null, country: null }
  if (fam !== 4 && fam !== 6) return none
  const t = given ?? tables
  if (!t) return none
  const table = t[fam]
  if (!table) return none
  const i = find(table, fam === 4 ? v4num(address) : v6key(address))
  if (i < 0) return none
  return { address, owner: table.name[i] || null, asn: table.asn[i] ?? null, country: countryName(table.cc[i] ?? "") }
}
