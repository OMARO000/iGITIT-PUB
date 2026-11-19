import { describe, expect, it } from "vitest"
import { AnswerCutShort, RETRY_NOTE, callModelJson, parseJson, type ModelAnswer } from "../app/lib/model"
import { failFrom } from "../app/lib/respond"

/** A stand-in for callModel that hands back prepared answers in order and records what it was asked. */
function fake(...answers: Partial<ModelAnswer>[]) {
  const asked: { user: string; maxTokens: number }[] = []
  const call = async (_k: string, _s: string, user: string, maxTokens: number): Promise<ModelAnswer> => {
    asked.push({ user, maxTokens })
    return { text: "", model: "m", costUsd: 0.01, stopReason: "end_turn", ...answers[asked.length - 1] }
  }
  return { call, asked }
}

describe("answers cut off mid-JSON (Render log, 2026-11-19)", () => {
  it("parses JSON with fences or a stray line around it", () => {
    expect(parseJson('```json\n{"a":1}\n```')).toEqual({ a: 1 })
    expect(parseJson('Here it is:\n{"a":[1,2]}\nDone.')).toEqual({ a: [1, 2] })
  })
  it("still refuses a cut-off object", () => {
    expect(() => parseJson('{"overview":"a reading that stops in the middle of a str')).toThrow()
    expect(() => parseJson('{"a":1,\n  ')).toThrow()
  })
  it("uses a good first answer without asking again", async () => {
    const f = fake({ text: '{"ok":true}' })
    const r = await callModelJson("analysis", "sys", "user", 8000, f.call)
    expect(r).toMatchObject({ value: { ok: true }, retried: false })
    expect(f.asked).toHaveLength(1)
  })
  it("asks once more, with twice the room and a note to be brief, when the answer ran out of room", async () => {
    const f = fake({ text: '{"overview":"cut', stopReason: "max_tokens" }, { text: '{"overview":"short"}' })
    const r = await callModelJson("analysis", "sys", "user", 8000, f.call)
    expect(r.value).toEqual({ overview: "short" })
    expect(r.retried).toBe(true)
    expect(r.costUsd).toBeCloseTo(0.02)
    expect(f.asked[1]).toEqual({ user: "user" + RETRY_NOTE, maxTokens: 16000 })
  })
  it("asks once more when the answer ended but doesn't parse", async () => {
    const f = fake({ text: '{"a":1,' }, { text: '{"a":1}' })
    expect((await callModelJson("analysis", "sys", "user", 8000, f.call)).value).toEqual({ a: 1 })
  })
  it("gives up after the second try with its own error, and the API says so plainly", async () => {
    const f = fake({ text: "{", stopReason: "max_tokens" }, { text: "{", stopReason: "max_tokens" })
    const err = await callModelJson("analysis", "sys", "user", 8000, f.call).catch((e) => e)
    expect(err).toBeInstanceOf(AnswerCutShort)
    expect(f.asked).toHaveLength(2)
    const res = failFrom(err)
    expect(res.status).toBe(502)
    expect((await res.json()).error).toBe("reading_too_long")
  })
})
