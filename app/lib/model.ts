/**
 * Every model call goes through here (cost control, 2026-11-07):
 *  - the model comes from IGITIT_MODEL, so switching to a cheaper one is a setting, not a code change;
 *  - each call reserves its worst-case cost first and is refused when today's cap (IGITIT_DAILY_BUDGET_USD) is used;
 *  - the real cost, from the model's token counts, is recorded after.
 */
import Anthropic from "@anthropic-ai/sdk"
import { reserve, settle } from "./store"

export const MODEL = process.env.IGITIT_MODEL || "claude-sonnet-5-5"
export const DAILY_BUDGET_USD = Number(process.env.IGITIT_DAILY_BUDGET_USD || "5")

/** US dollars per million tokens: input, output (platform.claude.com pricing, 2026-11-07). */
const PRICES: Record<string, [number, number]> = {
  "claude-haiku-5-5": [0.10, 0.50],
  "claude-sonnet-5-5": [2, 10],
  "claude-opus-5-5": [4, 20],
  "claude-sonnet-4-20250514": [3, 15],
  "claude-haiku-4-5": [1, 5],
}
/** An unknown model is priced like the most expensive one, so the cap errs on the safe side. */
const UNKNOWN: [number, number] = [10, 50]

export const priceOf = (model: string): [number, number] => PRICES[model] ?? UNKNOWN

/** Batch requests (nightly pre-reads) cost half. */
export const BATCH_DISCOUNT = 0.5

export function costUsd(model: string, inputTokens: number, outputTokens: number, batch = false): number {
  const [i, o] = priceOf(model)
  return ((inputTokens * i + outputTokens * o) / 1_000_000) * (batch ? BATCH_DISCOUNT : 1)
}

/** Worst case before calling: about 4 characters a token in, the full output allowance out. */
export const estimateUsd = (model: string, inputChars: number, maxTokens: number) => costUsd(model, Math.ceil(inputChars / 3.5), maxTokens)

export class BudgetReached extends Error {
  constructor() { super("Today's reading budget is used up. Stored readings are still available; new ones resume after midnight UTC.") }
}

/** The model account can't take calls (no credit left, key revoked). Handled like a spent budget: stored readings still answer. */
export class ModelUnavailable extends BudgetReached {
  constructor() { super(); this.message = "Reading new code is paused on OMARO's side. Stored readings are still available." }
}
/** True for errors that mean the account itself can't be used, as opposed to one call failing. */
export function accountProblem(e: unknown): boolean {
  const status = (e as { status?: number })?.status
  const text = e instanceof Error ? e.message : String(e)
  return status === 401 || status === 403 || /credit balance is too low|authentication_error|permission_error/i.test(text)
}

let client: Anthropic | null = null
export function anthropic(): Anthropic {
  const apiKey = process.env.MODEL_API_KEY
  if (!apiKey) throw new Error("MODEL_API_KEY is missing in the host's settings")
  client ??= new Anthropic({ apiKey })
  return client
}

export interface ModelAnswer { text: string; model: string; costUsd: number }

export async function callModel(kind: string, system: string, user: string, maxTokens: number): Promise<ModelAnswer> {
  const estimate = estimateUsd(MODEL, system.length + user.length, maxTokens)
  const id = await reserve(kind, estimate, DAILY_BUDGET_USD)
  if (id === null) throw new BudgetReached()
  let actual = 0
  try {
    const response = await anthropic().messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      // The instructions are the same on every call: cached reads cost a fraction of fresh input.
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: user }],
    })
    const u = response.usage
    const cacheRead = u.cache_read_input_tokens ?? 0
    const cacheWrite = u.cache_creation_input_tokens ?? 0
    const [inPrice] = priceOf(MODEL)
    actual = costUsd(MODEL, u.input_tokens, u.output_tokens) + (cacheRead * inPrice * 0.1 + cacheWrite * inPrice * 1.25) / 1_000_000
    const text = response.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("")
    return { text, model: MODEL, costUsd: actual }
  } catch (e) {
    if (accountProblem(e)) { console.error("model account unavailable:", e instanceof Error ? e.message : e); throw new ModelUnavailable() }
    throw e
  } finally {
    await settle(id, estimate, actual)
  }
}

/** Strips code fences and parses the model's JSON. */
export function parseJson<T>(raw: string): T {
  const clean = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim()
  return JSON.parse(clean) as T
}

// --- Nightly pre-reads through the batch interface (half price, answers within 24 hours) ---------------------

export interface BatchItem { key: string; system: string; user: string; maxTokens: number }

/** Submits pre-reads. Each one's worst-case cost (at batch price) is reserved under today's cap first; ones that don't fit wait. */
export async function submitBatch(items: BatchItem[]): Promise<{ batchId: string | null; submitted: { key: string; reservation: number; estimate: number }[]; deferred: string[] }> {
  const submitted: { key: string; reservation: number; estimate: number }[] = []
  const deferred: string[] = []
  const requests = []
  for (const it of items) {
    const estimate = estimateUsd(MODEL, it.system.length + it.user.length, it.maxTokens) * BATCH_DISCOUNT
    const reservation = await reserve("preread", estimate, DAILY_BUDGET_USD)
    if (reservation === null) { deferred.push(it.key); continue }
    submitted.push({ key: it.key, reservation, estimate })
    requests.push({
      custom_id: customId(it.key),
      params: { model: MODEL, max_tokens: it.maxTokens, system: it.system, messages: [{ role: "user" as const, content: it.user }] },
    })
  }
  if (!requests.length) return { batchId: null, submitted, deferred }
  try {
    const batch = await anthropic().messages.batches.create({ requests })
    return { batchId: batch.id, submitted, deferred }
  } catch (e) {
    for (const s of submitted) await settle(s.reservation, s.estimate, 0)
    throw e
  }
}

/** Batch ids allow 64 characters of letters, digits, "-" and "_": the reading key is hashed into one. */
export function customId(key: string): string {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (Math.imul(31, h) + key.charCodeAt(i)) | 0
  return `r${(h >>> 0).toString(36)}-${key.replace(/[^A-Za-z0-9_-]/g, "_").slice(-50)}`.slice(0, 64)
}

export interface BatchAnswer { customId: string; text: string | null; costUsd: number; error?: string }

/** Results of a finished batch; null while it's still running. */
export async function batchResults(batchId: string): Promise<BatchAnswer[] | null> {
  const b = await anthropic().messages.batches.retrieve(batchId)
  if (b.processing_status !== "ended") return null
  const out: BatchAnswer[] = []
  for await (const r of await anthropic().messages.batches.results(batchId)) {
    if (r.result.type === "succeeded") {
      const m = r.result.message
      const text = m.content.filter((c) => c.type === "text").map((c) => (c as { text: string }).text).join("")
      out.push({ customId: r.custom_id, text, costUsd: costUsd(MODEL, m.usage.input_tokens, m.usage.output_tokens, true) })
    } else {
      out.push({ customId: r.custom_id, text: null, costUsd: 0, error: r.result.type })
    }
  }
  return out
}
