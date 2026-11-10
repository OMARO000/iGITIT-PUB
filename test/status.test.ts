import { afterEach, describe, expect, it } from "vitest"
import { modelState, PROBE_TTL_MS, resetProbe } from "../app/lib/status"

describe("server status: model account check", () => {
  afterEach(() => { resetProbe(); delete process.env.MODEL_API_KEY })

  it("says no_key when the key is missing, without calling", async () => {
    let calls = 0
    expect((await modelState(0, async () => { calls++ })).state).toBe("no_key")
    expect(calls).toBe(0)
  })

  it("reports an empty credit balance as paused", async () => {
    process.env.MODEL_API_KEY = "test"
    const r = await modelState(0, async () => { throw Object.assign(new Error("Your credit balance is too low to access the Anthropic API."), { status: 400 }) })
    expect(r.state).toBe("paused")
  })

  it("calls at most once every six hours", async () => {
    process.env.MODEL_API_KEY = "test"
    let calls = 0
    const call = async () => { calls++ }
    await modelState(0, call)
    await modelState(PROBE_TTL_MS - 1, call)
    expect(calls).toBe(1)
    await modelState(PROBE_TTL_MS, call)
    expect(calls).toBe(2)
  })

  it("separates one failed call from an account problem", async () => {
    process.env.MODEL_API_KEY = "test"
    expect((await modelState(0, async () => { throw Object.assign(new Error("529 overloaded"), { status: 529 }) })).state).toBe("error")
  })
})
