/**
 * Compare: two repositories side by side, written by the model. Takes two analyses the server made itself
 * (analyzeRepo), so nothing a browser sends reaches the model. Stored by the two readings' contents.
 */
import { HAI_PILLARS, haiOf } from "./hai"
import { createHash } from "node:crypto"
import type { AnalysisResult } from "./analyze"
import { callModel, parseJson } from "./model"
import { getReading, putReading } from "./store"
import { RateLimited } from "./limits"

const COMPARE_SYSTEM = `You are iGITit's Compare engine. You receive two software repository analyses and write a structured plain-language comparison — for journalists, regulators, researchers, and the general public.

You write like an investigative journalist doing a side-by-side product comparison. Direct, honest, specific. No jargon without explanation.

You always respond with a valid JSON object:

{
  "headline": "One sentence that captures the most important difference between these two codebases",
  "sections": [
    {
      "title": "WHAT EACH ONE DOES",
      "leftSummary": "2-3 sentences on what repo A does, written for a non-technical reader",
      "rightSummary": "2-3 sentences on what repo B does, written for a non-technical reader",
      "verdict": "1-2 sentences on how they compare in purpose and scope"
    },
    {
      "title": "DATA & PRIVACY",
      "leftSummary": "How does repo A handle data? What does it collect, store, transmit?",
      "rightSummary": "How does repo B handle data? What does it collect, store, transmit?",
      "verdict": "Which handles data more responsibly, and why? Be specific."
    },
    {
      "title": "TRANSPARENCY & AUDITABILITY",
      "leftSummary": "How open and auditable is repo A's code?",
      "rightSummary": "How open and auditable is repo B's code?",
      "verdict": "Which is more transparent, and what does that mean for users?"
    },
    {
      "title": "LICENSE & USAGE RIGHTS",
      "leftSummary": "What license does repo A use? What does that allow?",
      "rightSummary": "What license does repo B use? What does that allow?",
      "verdict": "How do the license terms differ? Who benefits from each?"
    },
    {
      "title": "ACCOUNTABILITY SCORE COMPARISON",
      "leftSummary": "Summary of repo A's accountability strengths and gaps",
      "rightSummary": "Summary of repo B's accountability strengths and gaps",
      "verdict": "Which scores better overall and why?"
    }
  ],
  "overallWinner": {
    "label": "[ repo A ] or [ repo B ] or [ tied ]",
    "repoName": "owner/repo of winner, or 'tied'",
    "reasoning": "2-3 sentences explaining the overall comparison verdict. Be honest — if one is clearly better on accountability and transparency, say so directly."
  },
  "keyDifferences": [
    "Short bullet (1 sentence) describing a key difference — write 4-6 of these"
  ],
  "forJournalists": "2-3 sentences on what a journalist or regulator should pay most attention to when comparing these two codebases"
}`

  const summarize = (a: {
    meta: { owner: string; repo: string; platform?: string; language: string; stars: number; license?: string | null }
    overview: { title: string; content: string }[]
    dataItems: { type: string; label: string; description: string }[]
    dataFlowSummary: string
    score?: { label: string; verdictLabel: string; pass: boolean; reasoning?: string }[]
    rescue?: Record<string, { score: number; finding: string }>
    overallVerdict: string
  }) => `
REPO: ${a.meta.owner}/${a.meta.repo}
PLATFORM: ${a.meta.platform ?? "GitHub"}
LANGUAGE: ${a.meta.language}
STARS: ${a.meta.stars}
LICENSE: ${a.meta.license ?? "not detected"}

OVERVIEW:
${a.overview.map((s: { title: string; content: string }) => `${s.title}:\n${s.content}`).join("\n\n")}

DATA ITEMS:
${a.dataItems.map((d: { type: string; label: string; description: string }) => `[${d.type.toUpperCase()}] ${d.label}: ${d.description}`).join("\n")}

DATA FLOW: ${a.dataFlowSummary}

HAI SCORE (9 pillars, 1-5 each):
${Object.keys(haiOf(a as unknown as Record<string, unknown>)).length ? HAI_PILLARS.filter((p) => haiOf(a as unknown as Record<string, unknown>)[p.id]).map((p) => { const v = haiOf(a as unknown as Record<string, unknown>)[p.id]!; return `${p.id} ${p.name}: ${v.score}/5. ${v.finding}` }).join("\n")
: (a.score ?? []).map((s: { label: string; verdictLabel: string; reasoning?: string }) => `${s.label}: ${s.verdictLabel}${s.reasoning ? ` — ${s.reasoning}` : ""}`).join("\n")}

OVERALL VERDICT: ${a.overallVerdict}
`

export async function compareRepos(a: AnalysisResult, b: AnalysisResult, allowFresh = true): Promise<{ comparison: unknown; stored?: { readAt: string } }> {
  const asInput = (r: AnalysisResult) => ({ ...(r.analysis as Record<string, unknown>), meta: r.meta }) as unknown as Parameters<typeof summarize>[0]
  const left = summarize(asInput(a)).slice(0, 12000), right = summarize(asInput(b)).slice(0, 12000)
  const key = createHash("sha256").update(left).update("\u0000").update(right).digest("hex")
  const hit = await getReading<unknown>("compare", key)
  if (hit) return { comparison: hit.result, stored: { readAt: hit.readAt } }
  if (!allowFresh) throw new RateLimited()
  const answer = await callModel("compare", COMPARE_SYSTEM, `Compare these two repositories and return the JSON comparison.

=== REPO A ===
${left}

=== REPO B ===
${right}

Return the complete JSON comparison now.`, 4000)
  const comparison = parseJson(answer.text)
  await putReading("compare", key, null, null, answer.model, comparison, answer.costUsd)
  return { comparison }
}
