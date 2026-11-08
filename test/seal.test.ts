import { describe, expect, it } from "vitest"
import { canonicalJson, checkRecord, hashRecord, sha256 } from "../app/lib/seal"

const doc = (over: Record<string, unknown> = {}) => {
  const d: Record<string, unknown> = { schema: "igitit-verification/1.1", repository: { owner: "o", repo: "r" }, commit: "abc", readAt: "2026-11-08T00:00:00.000Z", analysis: { overallVerdict: "fine", rescue: { I: { score: 4 } } }, ...over }
  d.verification = { method: "sha256-canonical-json", hash: hashRecord(d) }
  return d
}

describe("verification records", () => {
  it("sorts keys so the same content always gives the same text", () => {
    expect(canonicalJson({ b: 1, a: [2, { d: 1, c: 2 }] })).toBe('{"a":[2,{"c":2,"d":1}],"b":1}')
  })
  it("a sealed record checks out", () => {
    expect(checkRecord(doc()).matches).toBe(true)
  })
  it("changing the repository, commit or date breaks the hash", () => {
    for (const k of ["repository", "commit", "readAt"]) {
      const d = doc(); d[k] = "something else"
      expect(checkRecord(d).matches).toBe(false)
    }
  })
  it("still checks 1.0 records that hashed the analysis alone", () => {
    const analysis = { overallVerdict: "x" }
    expect(checkRecord({ schema: "igitit-verification/1.0", analysis, verification: { hash: sha256(canonicalJson(analysis)) } }).matches).toBe(true)
  })
})
