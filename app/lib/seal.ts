/**
 * Verification records (iGITit spec, B5, faults fixed 2026-11-08): canonical JSON (keys sorted, no spaces,
 * missing values dropped as JSON does, only finite numbers) and SHA-256 over every finding, so anyone holding
 * the pinned record can recompute the hash. Same method as IRIS's reading seals.
 */
import { createHash } from "node:crypto"

export function canonicalJson(value: unknown): string {
  if (value === null) return "null"
  switch (typeof value) {
    case "string": case "boolean": return JSON.stringify(value)
    case "number":
      if (!Number.isFinite(value)) throw new Error("A sealed value can't hold NaN or Infinity")
      return JSON.stringify(value)
    case "object": {
      if (Array.isArray(value)) return `[${value.map((v) => (v === undefined || typeof v === "function" ? "null" : canonicalJson(v))).join(",")}]`
      const entries = Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined && typeof v !== "function")
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`
    }
    default: throw new Error(`A sealed value can't hold a ${typeof value}`)
  }
}

export const sha256 = (text: string) => createHash("sha256").update(text, "utf8").digest("hex")

/** The fields a record's hash covers, in version 1.1. */
export const COVERED = ["schema", "repository", "commit", "readAt", "analysis"] as const

export function hashRecord(doc: Record<string, unknown>): string {
  const covered: Record<string, unknown> = {}
  for (const k of COVERED) covered[k] = doc[k]
  return sha256(canonicalJson(covered))
}

/** Recomputes a pinned record's hash. Older 1.0 records hashed the analysis alone. */
export function checkRecord(doc: Record<string, unknown>): { matches: boolean; covers: string } {
  const v = doc.verification as { hash?: string } | undefined
  if (!v?.hash) return { matches: false, covers: "nothing" }
  if (doc.schema === "igitit-verification/1.0") {
    try { return { matches: sha256(canonicalJson(doc.analysis)) === v.hash, covers: "the analysis (version 1.0 record)" } } catch { return { matches: false, covers: "the analysis" } }
  }
  try { return { matches: hashRecord(doc) === v.hash, covers: COVERED.join(", ") } } catch { return { matches: false, covers: COVERED.join(", ") } }
}
