import { describe, expect, it } from "vitest"
import { accountProblem, BudgetReached, ModelUnavailable } from "../app/lib/model"

describe("model account problems", () => {
  it("treats an empty credit balance or a bad key as the account being unavailable", () => {
    expect(accountProblem(Object.assign(new Error('400 {"error":{"message":"Your credit balance is too low to access the Anthropic API."}}'), { status: 400 }))).toBe(true)
    expect(accountProblem(Object.assign(new Error("401 authentication_error"), { status: 401 }))).toBe(true)
    expect(accountProblem(Object.assign(new Error("529 overloaded"), { status: 529 }))).toBe(false)
  })
  it("falls back like a spent budget, with its own message", () => {
    const e = new ModelUnavailable()
    expect(e).toBeInstanceOf(BudgetReached)
    expect(e.message).toContain("paused")
  })
})
