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

export function costUsd(model: string, inputTokens: number, outputTokens: number): number {
  const [i, o] = priceOf(model)
  return (inputTokens * i + outputTokens * o) / 1_000_000
}

/** Worst case before calling: about 4 characters a token in, the full output allowance out. */
export const estimateUsd = (model: string, inputChars: number, maxTokens: number) => costUsd(model, Math.ceil(inputChars / 3.5), maxTokens)

export class BudgetReached extends Error {
  constructor() { super("Today's reading budget is used up. Stored readings are still available; new ones resume after midnight UTC.") }
}

let client: Anthropic | null = null
function anthropic(): Anthropic {
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
  } finally {
    await settle(id, estimate, actual)
  }
}

/** Strips code fences and parses the model's JSON. */
export function parseJson<T>(raw: string): T {
  const clean = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim()
  return JSON.parse(clean) as T
}
