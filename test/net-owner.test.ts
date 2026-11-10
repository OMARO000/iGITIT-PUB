import { describe, expect, it } from "vitest"
import { clientIp, trustedClientIp } from "@/app/lib/limits"
import { find, lookup, parseTable, v4num, v6key } from "@/app/lib/netOwner"

const v4 = parseTable(
  ["16777216\t16777471\t13335\tUS\tCLOUDFLARENET", "16777472\t16778239\t0\tNone\tNot routed", "3108077568\t3108093951\t9009\tRO\tM247 Europe SRL", ""].join("\n"),
  4,
)
const v6 = parseTable(["2606:4700::\t2606:4700:ffff:ffff:ffff:ffff:ffff:ffff\t13335\tUS\tCLOUDFLARENET"].join("\n"), 6)

describe("network owner", () => {
  it("reads addresses as numbers and keys", () => {
    expect(v4num("1.0.0.1")).toBe(16777217)
    expect(v6key("2606:4700::1111")).toBe("2606470000000000000000000000" + "1111")
    expect(v6key("::ffff:1.2.3.4")).toBe("00000000000000000000ffff01020304")
  })

  it("finds the owning network, and nothing for unrouted or unknown space", () => {
    expect(lookup("1.0.0.1", { 4: v4, 6: v6 })).toEqual({ address: "1.0.0.1", owner: "CLOUDFLARENET", asn: 13335, country: "United States" })
    expect(lookup("185.65.134.1", { 4: v4, 6: v6 }).owner).toBe("M247 Europe SRL")
    expect(lookup("185.65.134.1", { 4: v4, 6: v6 }).country).toBe("Romania")
    expect(lookup("1.0.2.1", { 4: v4, 6: v6 }).owner).toBeNull()
    expect(lookup("2606:4700:4700::1111", { 4: v4, 6: v6 }).asn).toBe(13335)
    expect(lookup("not an address", { 4: v4, 6: v6 }).owner).toBeNull()
    expect(find(v4, 5)).toBe(-1)
  })

  it("trusts only the edge's headers for the sender's address", () => {
    const h = new Headers({ "x-forwarded-for": "6.6.6.6, 203.0.113.9", "true-client-ip": "203.0.113.9" })
    expect(trustedClientIp(h)).toBe("203.0.113.9")
    expect(clientIp(h)).toBe("203.0.113.9")
    // A forged first entry is never used as the address.
    expect(clientIp(new Headers({ "x-forwarded-for": "6.6.6.6, 198.51.100.4" }))).toBe("198.51.100.4")
    expect(trustedClientIp(new Headers({ "x-forwarded-for": "6.6.6.6" }))).toBeNull()
  })
})
