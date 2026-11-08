/**
 * The HAI Standard v1.1 (OMARO PBC): nine pillars, each scored 1 to 5 in a code reading, 45 points in all.
 * Readings made before 2026-11-08 used letter keys and a "Resilience" pillar in place of VIII Independent Audit;
 * haiOf maps them onto the standard's numbering and leaves VIII unscored.
 */
export const HAI_PILLARS = [
  { id: "I", name: "Integrity & Transparency" },
  { id: "II", name: "Accountability Chain" },
  { id: "III", name: "Safety & Robustness" },
  { id: "IV", name: "Equality & Non-Discrimination" },
  { id: "V", name: "Human Override & Control" },
  { id: "VI", name: "Use Limits & Proportionality" },
  { id: "VII", name: "Data Ownership & Empowerment" },
  { id: "VIII", name: "Independent Audit" },
  { id: "IX", name: "Human Dignity Across the Full Stack" },
] as const

export type PillarScore = { score: number; finding: string }
const LEGACY: Record<string, string> = { I: "I", A: "II", S: "III", E: "IV", C: "V", U: "VI", E2: "VII", D: "IX" }

/** The reading's pillar scores keyed I to IX, from either form. */
export function haiOf(analysis: Record<string, unknown>): Record<string, PillarScore> {
  const hai = analysis.hai as Record<string, PillarScore> | undefined
  if (hai && typeof hai === "object") return hai
  const old = analysis.rescue as Record<string, PillarScore> | undefined
  const out: Record<string, PillarScore> = {}
  if (old && typeof old === "object") for (const [k, v] of Object.entries(old)) if (LEGACY[k] && v) out[LEGACY[k]] = v
  return out
}

/** Total, maximum and letter grade (bands over 45: A 41, B 34, C 27, D 18). */
export function haiGrade(scores: Record<string, PillarScore>): { total: number; max: number; grade: string } {
  const vals = HAI_PILLARS.map((p) => scores[p.id]?.score).filter((n): n is number => typeof n === "number")
  const total = vals.reduce((a, b) => a + b, 0), max = vals.length * 5
  const of45 = max ? (total / max) * 45 : 0
  return { total, max, grade: !max ? "–" : of45 >= 41 ? "A" : of45 >= 34 ? "B" : of45 >= 27 ? "C" : of45 >= 18 ? "D" : "F" }
}
