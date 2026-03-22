import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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

export async function POST(req: NextRequest) {
  try {
    const { analysisA, analysisB } = await req.json()

    if (!analysisA || !analysisB) {
      return NextResponse.json({ error: "Both analyses required" }, { status: 400 })
    }

    const summarize = (a: {
      meta: { owner: string; repo: string; platform?: string; language: string; stars: number; license?: string | null }
      overview: { title: string; content: string }[]
      dataItems: { type: string; label: string; description: string }[]
      dataFlowSummary: string
      score: { label: string; verdictLabel: string; pass: boolean; reasoning?: string }[]
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

ACCOUNTABILITY SCORE:
${a.score.map((s: { label: string; verdictLabel: string; pass: boolean; reasoning?: string }) => `${s.label}: ${s.verdictLabel}${s.reasoning ? ` — ${s.reasoning}` : ""}`).join("\n")}

OVERALL VERDICT: ${a.overallVerdict}
`

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: COMPARE_SYSTEM,
      messages: [{
        role: "user",
        content: `Compare these two repositories and return the JSON comparison.

=== REPO A ===
${summarize(analysisA)}

=== REPO B ===
${summarize(analysisB)}

Return the complete JSON comparison now.`
      }],
    })

    const rawText = response.content
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("")

    const clean = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim()

    let comparison
    try {
      comparison = JSON.parse(clean)
    } catch {
      return NextResponse.json({ error: "Failed to parse comparison", raw: clean }, { status: 500 })
    }

    return NextResponse.json({ comparison })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
