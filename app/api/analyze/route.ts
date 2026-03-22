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
  "score": [
    { "label": "data minimization", "verdictLabel": "[ transparent ] or [ unclear ] or [ flagged ]", "pass": true | false },
    { "label": "third-party disclosure", "verdictLabel": "[ disclosed ] or [ partial ] or [ not disclosed ]", "pass": true | false },
    { "label": "auditability", "verdictLabel": "[ fully auditable ] or [ partially auditable ] or [ not auditable ]", "pass": true | false },
    { "label": "data retention policy", "verdictLabel": "[ defined ] or [ not defined ] or [ partial ]", "pass": true | false },
    { "label": "encryption", "verdictLabel": "[ encrypted ] or [ partial ] or [ not found ]", "pass": true | false }
  ],
  "overallVerdict": "2-3 sentence plain language verdict on this codebase's transparency and accountability posture"
}

Rules:
- Never use technical jargon without immediately explaining it in plain terms
- dataItems must cover ALL data the software touches — collected, stored, and transmitted
- modules should explain the 3-6 most important parts of the codebase
- score verdicts must be grounded in actual evidence from the code
- overallVerdict should be honest — flag real gaps, don't just praise
- sourceSnippet should be actual code from the files provided, kept under 10 lines
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
