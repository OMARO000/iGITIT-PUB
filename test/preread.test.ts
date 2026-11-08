/** Change rules, carrying readings forward, and the nightly pre-reads (2026-11-08). */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { classify } from "@/app/lib/changes"

describe("which changes mean reading again", () => {
  it("docs, tests and interface tweaks carry the reading forward", () => {
    expect(classify(["README.md", "docs/setup.md", "src/components/Button.tsx", "test/button.test.ts"]).flagged).toBe(false)
    expect(classify([]).flagged).toBe(false)
  })
  it("dependency manifests, data, sign-in, tracking and permissions mean reading again", () => {
    for (const p of ["package.json", "apps/web/pnpm-lock.yaml", "go.mod", "app/build.gradle", "prisma/schema.prisma", "db/migrations/0004_add_email.sql",
      "src/auth/session.ts", "lib/analytics.ts", "src/telemetry/send.ts", "android/app/src/main/AndroidManifest.xml", "ios/App/Info.plist",
      "src/ads/banner.ts", "server/payments/stripe.ts", "docs/PRIVACY.md", ".env.example"]) {
      expect(classify([p]).flagged, p).toBe(true)
    }
  })
  it("too many files to see counts as reading again", () => {
    expect(classify(Array.from({ length: 300 }, (_, i) => `docs/p${i}.md`)).flagged).toBe(true)
    expect(classify(["README.md"], true).flagged).toBe(true)
  })
})

const DB = process.env.IGITIT_TEST_DB
const run = DB ? describe : describe.skip

run("nightly pre-reads and carrying forward (real Postgres)", () => {
  let heads: Record<string, string> = {}
  let compareFiles: string[] = []
  let batches: { id: string; requests: { custom_id: string }[]; ended: boolean }[] = []
  let prepared = 0
  const reading = { overview: [{ title: "WHAT THIS SOFTWARE DOES", content: "Notes." }] }

  beforeEach(async () => {
    vi.resetModules()
    vi.stubEnv("IGITIT_DATABASE_URL", DB!)
    vi.stubEnv("MODEL_API_KEY", "test")
    vi.stubEnv("IGITIT_MODEL", "claude-sonnet-5-5")
    vi.stubEnv("IGITIT_DAILY_BUDGET_USD", "5")
    vi.doMock("@anthropic-ai/sdk", () => ({
      default: class {
        messages = {
          create: async () => { throw new Error("live calls aren't expected here") },
          batches: {
            create: async ({ requests }: { requests: { custom_id: string }[] }) => { const b = { id: `msgbatch_${batches.length + 1}`, requests, ended: false }; batches.push(b); return { id: b.id } },
            retrieve: async (id: string) => ({ processing_status: batches.find((b) => b.id === id)!.ended ? "ended" : "in_progress" }),
            results: async (id: string) => (async function* () {
              for (const r of batches.find((b) => b.id === id)!.requests) {
                yield { custom_id: r.custom_id, result: { type: "succeeded", message: { content: [{ type: "text", text: JSON.stringify(reading) }], usage: { input_tokens: 20_000, output_tokens: 3_000 } } } }
              }
            })(),
          },
        }
      },
    }))
    vi.doMock("@/app/lib/repo", async (orig) => ({
      ...(await orig<typeof import("@/app/lib/repo")>()),
      headCommit: async (ref: { owner: string }) => heads[ref.owner]!,
      readRepo: async (ref: { owner: string; repo: string }) => { prepared++; return { meta: { owner: ref.owner, repo: ref.repo, description: "", language: "TS", stars: 1, platform: "GitHub", commit: heads[ref.owner] }, files: { "a.ts": "x" }, filePaths: ["a.ts"] } },
    }))
    vi.stubGlobal("fetch", async (url: string) => {
      if (String(url).includes("/compare/")) return new Response(JSON.stringify({ status: "ahead", files: compareFiles.map((filename) => ({ filename })) }))
      throw new Error(`unexpected fetch ${url}`)
    })
  })

  afterEach(() => { vi.unstubAllGlobals() })

  it("queues new repositories as one half-price batch, then stores the answers the next night", async () => {
    const { db } = await import("@/app/lib/store")
    await db()!`drop schema if exists igitit cascade`
    heads = { one: "1".repeat(40), two: "2".repeat(40) }
    batches = []; prepared = 0
    const { runPrereads } = await import("@/app/lib/preread")
    const urls = ["https://github.com/one/app", "https://github.com/two/app"]
    const night1 = await runPrereads(urls)
    expect(night1).toMatchObject({ submitted: 2, collected: 0, current: 0 })
    expect(batches.length).toBe(1)
    // Running again before the batch ends doesn't queue the same commits twice.
    expect(await runPrereads(urls)).toMatchObject({ submitted: 0, current: 2 })
    batches[0]!.ended = true
    const night2 = await runPrereads(urls)
    expect(night2).toMatchObject({ collected: 2, current: 2, submitted: 0 })
    const { spentToday } = await import("@/app/lib/store")
    expect(await spentToday()).toBeCloseTo(2 * 0.035, 4) // two readings at half price
  })

  it("a new commit that only touched docs is carried forward free; one that touched sign-in is read again", async () => {
    heads = { one: "3".repeat(40), two: "4".repeat(40) }
    compareFiles = ["README.md", "docs/guide.md"]
    const { runPrereads } = await import("@/app/lib/preread")
    const r1 = await runPrereads(["https://github.com/one/app"])
    expect(r1).toMatchObject({ carried: 1, submitted: 0 })
    compareFiles = ["src/auth/login.ts"]
    const r2 = await runPrereads(["https://github.com/two/app"])
    expect(r2).toMatchObject({ carried: 0, submitted: 1 })
  })

  it("a person's own request uses the carried reading and says so", async () => {
    heads = { one: "5".repeat(40) }
    compareFiles = ["CHANGELOG.md"]
    const { analyzeRepo } = await import("@/app/lib/analyze")
    const r = await analyzeRepo("https://github.com/one/app")
    expect(r.stored).toMatchObject({ current: true, commit: "5".repeat(40), carriedFrom: "3".repeat(40) })
    expect(r.meta.readCommit).toBe("1".repeat(40))
  })
})
