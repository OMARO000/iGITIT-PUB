import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are iGITit, a plain-language code analysis engine. Your job is to analyze a software repository and explain what it does to non-technical readers — journalists, regulators, researchers, and the general public.

You write like a journalist, not a developer. No jargon. No assumed technical knowledge. Clear, direct sentences.

You always respond with a valid JSON object matching this exact structure:

{
  "overview": [
    { "title": "WHAT THIS SOFTWARE DOES", "content": "..." },
    { "title": "WHO IT SERVES", "content": "..." },
    { "title": "WHY IT WAS BUILT", "content": "..." }
  ],
  "dataItems": [
    { "type": "collect" | "store" | "send", "label": "short label", "description": "plain english description", "sourceLine": "optional: file path or code snippet" }
  ],
  "dataFlowSummary": "2-3 sentence plain language summary of how data moves through this system",
  "modules": [
    { "name": "module name", "path": "folder/path/", "description": "plain language explanation — what does this do, why does it exist, what does it touch", "sourceSnippet": "relevant code excerpt if available" }
  ],
  "rescue": {
    "R": { "score": 1-5, "finding": "one sentence plain language finding" },
    "E": { "score": 1-5, "finding": "one sentence plain language finding" },
    "S": { "score": 1-5, "finding": "one sentence plain language finding" },
    "C": { "score": 1-5, "finding": "one sentence plain language finding" },
    "U": { "score": 1-5, "finding": "one sentence plain language finding" },
    "E2": { "score": 1-5, "finding": "one sentence plain language finding" },
    "A": { "score": 1-5, "finding": "one sentence plain language finding" },
    "I": { "score": 1-5, "finding": "one sentence plain language finding" },
    "D": { "score": 1-5, "finding": "one sentence plain language finding" }
  },
  "overallVerdict": "2-3 sentence plain language verdict on this codebase's accountability posture",
  "platformContext": "2-3 sentence factual description of the ORGANIZATION behind this repo — not the repo itself. Stick to verifiable public facts only: their industry, known products, business model, and documented scale. No opinions, no speculation, no unverifiable claims. If the org is unknown or small, say so plainly.",
  "uxEthics": {
    "signals": [
      { "pattern": "pattern-slug", "description": "plain language explanation of the code evidence", "severity": "low | medium | high" }
    ],
    "summary": "2-3 sentence plain language summary of the UX ethics posture of this codebase"
  }
}

Rules:
- Never use technical jargon without immediately explaining it in plain terms
- dataItems must cover ALL data the software touches — collected, stored, and transmitted
- modules should explain the 3-6 most important parts of the codebase
- HAI score rules: I=Integrity & Transparency(docs/disclosures/model cards), A=Accountability(license/audit logs/named responsible parties), S=Safety & Robustness(validation/secrets/failure modes), E=Equality & Non-Discrimination(bias checks/ML fairness, default 3 if no ML), C=Human Override & Control(human oversight/override mechanisms), U=Use Limits & Proportionality(data scope/permissions/consent), E2=Data Sovereignty & Empowerment(deletion/export/opt-out), R=Resilience & Dependency Prevention(vendor lock-in/fallbacks/unmaintained deps), D=Human Dignity(child safety protections, labor rights of people affected by the software, dignitary harm prevention — age-inappropriate targeting, exploitative patterns; pin at 3 if no user-facing components — pure infrastructure tool with no end-user interaction)
- All scores grounded in actual code evidence. If no ML detected, E=3 with finding "no ML detected — equality pillar not applicable". If no user-facing components, D=3 with finding "no user-facing components — human dignity pillar pinned at baseline for pure infrastructure tools"
- overallVerdict should be honest — flag real gaps, don't just praise
- platformContext must describe the ORG not the repo — stick strictly to verifiable public facts: company size, business model, known products, public filings, and documented practices. No opinions, no speculation, no characterizations that could not be sourced. For unknown or small orgs, simply note limited public footprint and available facts only.
- sourceSnippet should be actual code from the files provided, kept under 10 lines
- uxEthics.signals: scan the code for evidence of these 8 manipulation patterns. For each one found, add an entry. If none found, return an empty array.
  · confirm-shaming: opt-out/decline buttons or labels framed with negative, self-shaming language ("No thanks, I hate saving money", "I don't want to improve")
  · infinite-scroll: endless content pagination or feed without a natural stopping point or "load more" gate
  · pre-checked-consent: checkboxes or toggles defaulted to true for marketing, tracking, or data-sharing consent
  · hidden-opt-out: account deletion, unsubscribe, or privacy opt-out buried deep in settings or requiring many navigation steps
  · fake-urgency: countdown timers, artificially inflated scarcity messages ("only 2 left!"), or deadline pressure not grounded in real constraints
  · variable-reward-loops: randomised reward timing in notification batching, feed-refresh randomisation, or gamification that maximises compulsion
  · misleading-buttons: UI elements that appear to dismiss or cancel but trigger a different or irreversible action
  · cookie-walls: access to core content or functionality blocked unless the user accepts full tracking consent
- uxEthics.summary: 2-3 sentence honest plain-language assessment of the UX ethics posture; if no signals found, say so clearly
- Respond ONLY with the JSON object. No preamble, no markdown backticks, no explanation.`

export async function POST(req: NextRequest) {
  try {
    const { meta, files, filePaths } = await req.json()

    if (!files || Object.keys(files).length === 0) {
      return NextResponse.json({ error: "No files to analyze" }, { status: 400 })
    }

    // Build the file contents string — truncate if too long
    let fileContentsStr = ""
    let totalChars = 0
    const MAX_TOTAL_CHARS = 80000

    for (const [path, content] of Object.entries(files)) {
      const entry = `\n\n=== FILE: ${path} ===\n${content}`
      if (totalChars + entry.length > MAX_TOTAL_CHARS) break
      fileContentsStr += entry
      totalChars += entry.length
    }

    const userMessage = `Analyze this repository and return the JSON analysis.

REPOSITORY: ${meta.owner}/${meta.repo}
DESCRIPTION: ${meta.description || "No description provided"}
LANGUAGE: ${meta.language}
STARS: ${meta.stars}
FILES ANALYZED: ${filePaths.join(", ")}

FILE CONTENTS:
${fileContentsStr}

Return the complete JSON analysis now.`

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    })

    const rawText = response.content
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("")

    // Strip markdown fences if present
    const clean = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim()

    let analysis
    try {
      analysis = JSON.parse(clean)
    } catch {
      return NextResponse.json({ error: "Failed to parse analysis", raw: clean }, { status: 500 })
    }

    return NextResponse.json({ analysis, meta })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
