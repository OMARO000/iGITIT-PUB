/**
 * The server's own check, read by the nightly GitHub Actions run (and anyone else: it reveals no secrets).
 * It answers three things: the database connects, the model account takes calls, and how much of today's cap is spent.
 *
 * The model check sends one tiny request (one word in, one token out, the cheapest model) and keeps the answer
 * for six hours, so no number of visitors can make it cost more than four tiny calls a day.
 */
import { anthropic, DAILY_BUDGET_USD, accountProblem } from "./model"
import { ready_, spentToday } from "./store"

export const PROBE_MODEL = "claude-haiku-5-5"
export const PROBE_TTL_MS = 6 * 60 * 60 * 1000

export type ModelState = "ok" | "paused" | "no_key" | "error"
export type DatabaseState = "ok" | "off" | "error"

export interface Status {
  ok: boolean
  checkedAt: string
  database: DatabaseState
  model: ModelState
  modelCheckedAt: string | null
  spentTodayUsd: number
  dailyCapUsd: number
}

let probe: { state: ModelState; at: number } | null = null

/** One tiny model call, kept for six hours. `now` and `call` are injectable for tests. */
export async function modelState(now = Date.now(), call: () => Promise<unknown> = defaultCall): Promise<{ state: ModelState; at: number }> {
  if (probe && now - probe.at < PROBE_TTL_MS) return probe
  if (!process.env.MODEL_API_KEY) return (probe = { state: "no_key", at: now })
  try {
    await call()
    probe = { state: "ok", at: now }
  } catch (e) {
    probe = { state: accountProblem(e) ? "paused" : "error", at: now }
  }
  return probe
}

const defaultCall = () => anthropic().messages.create({ model: PROBE_MODEL, max_tokens: 1, messages: [{ role: "user", content: "ok" }] })

export function resetProbe(): void { probe = null }

async function databaseState(): Promise<DatabaseState> {
  if (!process.env.IGITIT_DATABASE_URL) return "off"
  try {
    const s = await ready_()
    if (!s) return "error"
    await s`select 1`
    return "ok"
  } catch {
    return "error"
  }
}

export async function status(): Promise<Status> {
  const [database, model] = await Promise.all([databaseState(), modelState()])
  let spent = 0
  try { spent = await spentToday() } catch { /* the database line already says it's down */ }
  return {
    ok: database === "ok" && model.state === "ok",
    checkedAt: new Date().toISOString(),
    database,
    model: model.state,
    modelCheckedAt: new Date(model.at).toISOString(),
    spentTodayUsd: Math.round(spent * 100) / 100,
    dailyCapUsd: DAILY_BUDGET_USD,
  }
}
