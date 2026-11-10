// Fetches IPtoASN's address-ownership tables (public domain, PDDL 1.0, https://iptoasn.com) for
// "Check from outside" (/iris/net/owner). Runs at build on Render. A failed download never fails the
// build: the route then answers with the address and no owner.
import { mkdirSync, writeFileSync } from "node:fs"

const dir = new URL("../data/ip2asn/", import.meta.url)
mkdirSync(dir, { recursive: true })
for (const name of ["ip2asn-v4-u32.tsv.gz", "ip2asn-v6.tsv.gz"]) {
  try {
    const r = await fetch(`https://iptoasn.com/data/${name}`, { signal: AbortSignal.timeout(60_000) })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const buf = Buffer.from(await r.arrayBuffer())
    writeFileSync(new URL(name, dir), buf)
    console.log(`ip2asn: ${name}, ${buf.length} bytes`)
  } catch (e) {
    console.warn(`ip2asn: couldn't fetch ${name} (${e.message}); owners will read as unknown`)
  }
}
