/**
 * One analysis of a repository, shared by the website, the public API and IRIS. Order of work, cheapest first:
 *  1. the stored reading for this exact commit (free, shared by everyone);
 *  2. the newest stored reading carried forward, when no file that could change it was touched since (changes.ts);
 *  3. a fresh reading, only if today's budget allows (model.ts);
 *  4. when the budget is used up, the newest stored reading of the repository, marked with its commit and date.
 */
import { BudgetReached, MODEL, callModel, parseJson } from "./model"
import { checkChanges } from "./changes"
import { mlHints, withHuggingFace } from "./ml"
import { RateLimited } from "./limits"
import { headCommit, parseRepo, readRepo, repoKey, type RepoRef } from "./repo"
import { getReading, latestReading, putReading } from "./store"

export const SYSTEM_PROMPT = `You are iGITit, a plain-language code analysis engine. Your job is to analyze a software repository and explain what it does to non-technical readers — journalists, regulators, researchers, and the general public.

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
  "hai": {
    "I": { "score": 1-5, "finding": "one sentence plain language finding" },
    "II": { "score": 1-5, "finding": "..." },
    "III": { "score": 1-5, "finding": "..." },
    "IV": { "score": 1-5, "finding": "..." },
    "V": { "score": 1-5, "finding": "..." },
    "VI": { "score": 1-5, "finding": "..." },
    "VII": { "score": 1-5, "finding": "..." },
    "VIII": { "score": 1-5, "finding": "..." },
    "IX": { "score": 1-5, "finding": "..." }
  },
  "ml": {
    "detected": true | false,
    "summary": "one or two sentences: what machine learning or AI the code trains, runs or calls, or 'No machine learning found in the files read.'",
    "models": [ { "name": "model or service name as written in the code", "use": "what it is used for", "source": "file path", "huggingFace": "owner/model if the code loads a Hugging Face model, otherwise omit" } ],
    "modelCard": { "present": true | false, "path": "file path of the model card if one exists", "gaps": "what a model card should say that this one leaves out, or what's missing when there is none" }
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
- HAI score: the nine pillars of the HAI Standard v1.1 (OMARO PBC), read as evidence in code. Score each 1 to 5:
  I Integrity & Transparency: purpose stated plainly, decisions explainable, limits disclosed, no dark patterns (README, docs, disclosures, model cards).
  II Accountability Chain: a named, reachable human responsibility (maintainers, CODEOWNERS, security contact, license, governance file).
  III Safety & Robustness: input checks, how secrets are kept, failure handling, tests, monitoring.
  IV Equality & Non-Discrimination: bias and fairness checks where the code makes decisions about people or uses ML.
  V Human Override & Control: a person can review, reverse or switch off what the software decides.
  VI Use Limits & Proportionality: data collected only for stated purposes, narrow permissions, consent before new uses.
  VII Data Ownership & Empowerment: people can see, correct, limit, export and delete their data in practice.
  VIII Independent Audit: evidence of outside review: published audit reports, a security policy, a bug bounty, third-party security scans, reproducible builds.
  IX Human Dignity Across the Full Stack: protections for children and vulnerable people, no exploitative design, disclosure of human labor and environmental cost where ML is trained.
- All scores rest on evidence in the files read. If no ML and no decisions about people, IV=3 with finding "no ML or decisions about people found; pillar held at baseline". If no user-facing components, IX=3 with finding "no user-facing components; pillar held at baseline for infrastructure tools".
- ml: set detected=true only when the files read train, fine-tune, load or call a machine learning model or AI service (for example torch, tensorflow, transformers, sklearn, onnx, .safetensors or .gguf files, calls to AI APIs). List each model by the name the code uses. A model card is a README or MODEL_CARD file with model details (intended use, training data, limits, evaluation).
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

const MAX_TOTAL_CHARS = 80000

export class NotARepo extends Error {}

export interface AnalysisResult {
  analysis: Record<string, unknown>
  meta: Record<string, unknown>
  /** Present when this came from the store: when and at which commit it was read, and by which model. */
  stored?: { readAt: string; commit: string | null; model: string; current: boolean; carriedFrom?: string; why?: string }
}

/** `allowFresh: false` answers only from the store (the address used its fresh readings for the hour). */
export async function analyzeRepo(url: string, allowFresh = true): Promise<AnalysisResult> {
  const ref = parseRepo(url)
  if (!ref) throw new NotARepo("Only GitHub, GitLab, Codeberg and Radicle addresses are supported")
  const repo = repoKey(ref)
  const commit = await headCommit(ref)
  const key = `${repo}@${commit}`

  const hit = await getReading<{ analysis: Record<string, unknown>; meta: Record<string, unknown> }>("analysis", key)
  if (hit) return { ...hit.result, stored: { readAt: hit.readAt, commit: hit.commit, model: hit.model, current: true } }

  const prev = await latestReading<Reading>("analysis", repo)
  const carried = await carryForward(ref, key, repo, commit, prev)
  if (carried) return carried

  if (!allowFresh) {
    if (prev) return { ...prev.result, stored: { readAt: prev.readAt, commit: prev.commit, model: prev.model, current: false } }
    throw new RateLimited()
  }
  const prepared = await prepare(ref)
  let answer
  try {
    answer = await callModel("analysis", SYSTEM_PROMPT, prepared.userMessage, 4000)
  } catch (e) {
    if (!(e instanceof BudgetReached)) throw e
    if (!prev) throw e
    return { ...prev.result, stored: { readAt: prev.readAt, commit: prev.commit, model: prev.model, current: false } }
  }
  const analysis = parseJson<Record<string, unknown>>(answer.text)
  analysis.ml = await withHuggingFace(analysis.ml as Parameters<typeof withHuggingFace>[0])
  const result = { analysis, meta: { ...prepared.meta, commit: prepared.meta.commit ?? commit } }
  await putReading("analysis", key, repo, String(prepared.meta.commit ?? commit), answer.model, result, answer.costUsd)
  return result
}

type Reading = { analysis: Record<string, unknown>; meta: Record<string, unknown> }

/**
 * A newer commit that touched nothing a reading depends on: the last reading is carried forward and stored under
 * the new commit, at no cost. Returns null when the repository needs reading again.
 */
export async function carryForward(ref: RepoRef, key: string, repo: string, commit: string, prev: Awaited<ReturnType<typeof latestReading<Reading>>>): Promise<AnalysisResult | null> {
  if (!prev?.commit) return null
  const check = await checkChanges(ref, prev.commit, commit, prev.readAt)
  if (check.flagged) return null
  const carried = { ...prev.result, meta: { ...prev.result.meta, commit, readCommit: prev.result.meta.readCommit ?? prev.commit } }
  await putReading("analysis", key, repo, commit, prev.model, carried, 0)
  return { ...carried, stored: { readAt: prev.readAt, commit, model: prev.model, current: true, carriedFrom: prev.commit, why: check.reason } }
}

/** Reads the repository and builds the model's message. Shared with the nightly pre-reads. */
export async function prepare(ref: RepoRef): Promise<{ meta: Record<string, unknown>; userMessage: string }> {
  const data = await readRepo(ref)
  const files = data.files as Record<string, string>
  if (!Object.keys(files).length) throw new NotARepo("No readable files in this repository")
  let fileContentsStr = ""
  for (const [path, content] of Object.entries(files)) {
    const entry = `\n\n=== FILE: ${path} ===\n${content}`
    if (fileContentsStr.length + entry.length > MAX_TOTAL_CHARS) break
    fileContentsStr += entry
  }
  const meta = data.meta as Record<string, unknown>
  const hints = mlHints(data.filePaths, files)
  const mlLine = hints.weights.length || hints.libraries.length || hints.huggingFace.length
    ? `MACHINE LEARNING HINTS (found by fixed rules): weight files ${hints.weights.join(", ") || "none"}; libraries ${hints.libraries.join(", ") || "none"}; Hugging Face models ${hints.huggingFace.join(", ") || "none"}`
    : "MACHINE LEARNING HINTS (found by fixed rules): none"
  const userMessage = `Analyze this repository and return the JSON analysis.

REPOSITORY: ${meta.owner}/${meta.repo}
DESCRIPTION: ${meta.description || "No description provided"}
LANGUAGE: ${meta.language}
STARS: ${meta.stars}
FILES ANALYZED: ${data.filePaths.join(", ")}
${mlLine}

FILE CONTENTS:
${fileContentsStr}

Return the complete JSON analysis now.`
  return { meta, userMessage }
}

export { MODEL }
