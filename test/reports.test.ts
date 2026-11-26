import { generateKeyPairSync } from "node:crypto"
import { describe, expect, it } from "vitest"
import { allow, checkReport, open, publicKeyFrom, seal, tokenOk } from "@/app/lib/reports"

function keys() {
  const k = generateKeyPairSync("x25519")
  const pub = Buffer.from(k.publicKey.export({ format: "jwk" }).x!, "base64url").toString("base64")
  const priv = (k.privateKey.export({ format: "der", type: "pkcs8" }) as Buffer).toString("base64")
  return { pub, priv }
}

describe("the report drop box", () => {
  it("seals so only the review desk's key opens it", () => {
    const a = keys(), b = keys()
    const s = seal('{"kind":"idea","said":"more voices"}', publicKeyFrom(a.pub))
    expect(open(s, a.priv)).toBe('{"kind":"idea","said":"more voices"}')
    expect(() => open(s, b.priv)).toThrow()
  })
  it("takes the three kinds and refuses security reports, extra fields and empty text", () => {
    expect(checkReport({ kind: "broke", said: "x" }).ok).toBe(true)
    expect(checkReport({ kind: "security", said: "x" }).ok).toBe(false)
    expect(checkReport({ kind: "idea", said: "x", account: "1234" }).ok).toBe(false)
    expect(checkReport({ kind: "idea", said: "  " }).ok).toBe(false)
    expect(checkReport({ kind: "idea", said: "x".repeat(4001) }).ok).toBe(false)
  })
  it("takes a company request with only the company's name (Ask IRIS to look into this company)", () => {
    expect(checkReport({ kind: "request", said: "Mozilla" })).toEqual({ ok: true, report: { kind: "request", said: "Mozilla" } })
    expect(checkReport({ kind: "request", said: "Mozilla", app: "IRIS 0.1.51" }).ok).toBe(false)
    expect(checkReport({ kind: "request", said: "Mozilla", facts: "System: Linux" }).ok).toBe(false)
    expect(checkReport({ kind: "request", said: "Mozilla\nmy address" }).ok).toBe(false)
    expect(checkReport({ kind: "request", said: "x".repeat(121) }).ok).toBe(false)
  })
  it("counts five an hour per sender", () => {
    for (let i = 0; i < 5; i++) expect(allow("t", 1000 + i)).toBe(true)
    expect(allow("t", 2000)).toBe(false)
    expect(allow("t", 1000 + 3_600_001)).toBe(true)
  })
  it("pulls only with the full token", () => {
    const t = "a".repeat(40)
    expect(tokenOk(t, t)).toBe(true)
    expect(tokenOk("a".repeat(39), t)).toBe(false)
    expect(tokenOk(t, undefined)).toBe(false)
    expect(tokenOk("short", "short")).toBe(false)
  })
})
