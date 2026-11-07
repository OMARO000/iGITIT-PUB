/**
 * Cost controls (2026-11-07). The database tests run when IGITIT_TEST_DB points at an empty Postgres database.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"

const DB = process.env.IGITIT_TEST_DB

describe("prices", () => {
  it("costs a call from its tokens, and prices an unknown model as the most expensive", async () => {
    const { costUsd, estimateUsd } = await import("@/app/lib/model")
    expect(costUsd("claude-haiku-5-5", 20_000, 3_000)).toBeCloseTo(0.0035, 6)
    expect(costUsd("claude-sonnet-5-5", 20_000, 3_000)).toBeCloseTo(0.07, 6)
    expect(costUsd("claude-sonnet-4-20250514", 20_000, 3_000)).toBeCloseTo(0.105, 6)
    expect(costUsd("some-new-model", 1_000_000, 0)).toBe(10)
    expect(estimateUsd("claude-sonnet-5-5", 70_000, 4000)).toBeGreaterThan(costUsd("claude-sonnet-5-5", 20_000, 3_000))
  })
})

const run = DB ? describe : describe.skip

run("the daily cap and the shared store (real Postgres)", () => {
  let created = 0
  const answer = { analysis: { overview: [{ title: "WHAT THIS SOFTWARE DOES", content: "It counts." }] } }
  let head = "a".repeat(40)

  beforeEach(async () => {
    vi.resetModules()
    vi.stubEnv("IGITIT_DATABASE_URL", DB!)
    vi.stubEnv("MODEL_API_KEY", "test")
    vi.stubEnv("IGITIT_MODEL", "claude-sonnet-5-5")
    created = 0
    vi.doMock("@anthropic-ai/sdk", () => ({
      default: class {
        messages = {
          create: async () => {
            created++
            return { content: [{ type: "text", text: JSON.stringify(answer.analysis) }], usage: { input_tokens: 20_000, output_tokens: 3_000, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } }
          },
        }
      },
    }))
    vi.doMock("@/app/lib/repo", async (orig) => ({
      ...(await orig<typeof import("@/app/lib/repo")>()),
      headCommit: async () => head,
      readRepo: async () => ({ meta: { owner: "acme", repo: "counter", description: "", language: "TS", stars: 1, platform: "GitHub", commit: head }, files: { "index.ts": "export const n = 1" }, filePaths: ["index.ts"] }),
    }))
  })
  afterAll(() => { vi.unstubAllEnvs() })

  async function fresh() {
    const { db } = await import("@/app/lib/store")
    const s = db()!
    await s`drop schema if exists igitit cascade`
  }

  it("reads a commit once: the second request for it costs nothing", async () => {
    vi.stubEnv("IGITIT_DAILY_BUDGET_USD", "5")
    await fresh()
    const { analyzeRepo } = await import("@/app/lib/analyze")
    const first = await analyzeRepo("https://github.com/acme/counter")
    expect(first.stored).toBeUndefined()
    const second = await analyzeRepo("https://github.com/acme/counter")
    expect(second.stored).toMatchObject({ current: true, commit: head, model: "claude-sonnet-5-5" })
    expect(created).toBe(1)
    const { spentToday } = await import("@/app/lib/store")
    expect(await spentToday()).toBeCloseTo(0.07, 4)
  })

  it("when today's budget is used up, the newest stored reading is shown, marked as older", async () => {
    vi.stubEnv("IGITIT_DAILY_BUDGET_USD", "0.08")
    head = "b".repeat(40) // a new commit: would need a fresh read, which no longer fits under the cap
    const { analyzeRepo } = await import("@/app/lib/analyze")
    const r = await analyzeRepo("https://github.com/acme/counter")
    expect(r.stored).toMatchObject({ current: false, commit: "a".repeat(40) })
    expect(created).toBe(0)
  })

  it("with nothing stored and no budget, it says the budget is used up", async () => {
    vi.stubEnv("IGITIT_DAILY_BUDGET_USD", "0.08")
    const { analyzeRepo } = await import("@/app/lib/analyze")
    const { BudgetReached } = await import("@/app/lib/model")
    await expect(analyzeRepo("https://github.com/other/thing")).rejects.toBeInstanceOf(BudgetReached)
  })

  it("two calls racing for the last of the budget: only one gets through", async () => {
    await fresh()
    const { reserve } = await import("@/app/lib/store")
    const results = await Promise.all(Array.from({ length: 40 }, () => reserve("analysis", 0.4, 1)))
    expect(results.filter((r) => r !== null).length).toBe(2)
  })
})
