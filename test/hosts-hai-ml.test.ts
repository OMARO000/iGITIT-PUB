import { describe, expect, it } from "vitest"
import { haiGrade, haiOf } from "../app/lib/hai"
import { mlHints } from "../app/lib/ml"
import { parseRepo, repoKey } from "../app/lib/repo"

describe("parseRepo", () => {
  it("reads GitLab groups up to /-/", () => {
    expect(parseRepo("https://gitlab.com/group/sub/project/-/tree/main")).toEqual({ platform: "GitLab", owner: "group/sub", repo: "project" })
  })
  it("reads Codeberg", () => {
    const r = parseRepo("https://codeberg.org/forgejo/forgejo/src/branch/forgejo")
    expect(r).toEqual({ platform: "Codeberg", owner: "forgejo", repo: "forgejo" })
    expect(repoKey(r!)).toBe("codeberg:forgejo/forgejo")
  })
})

describe("haiOf", () => {
  it("maps readings made with the earlier keys onto the HAI Standard's numbering, leaving VIII unscored", () => {
    const h = haiOf({ rescue: { I: { score: 4, finding: "a" }, A: { score: 3, finding: "b" }, R: { score: 2, finding: "c" }, E2: { score: 5, finding: "d" }, D: { score: 3, finding: "e" } } })
    expect(Object.keys(h).sort()).toEqual(["I", "II", "IX", "VII"])
    expect(h.VIII).toBeUndefined()
  })
  it("grades on the 45-point bands", () => {
    const all = Object.fromEntries(["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"].map((k) => [k, { score: 4, finding: "" }]))
    expect(haiGrade(all)).toEqual({ total: 36, max: 45, grade: "B" })
  })
})

describe("mlHints", () => {
  it("finds weight files, libraries and Hugging Face models", () => {
    const h = mlHints(["model.safetensors", "app.py", "requirements.txt"], {
      "requirements.txt": "torch==2.4\ntransformers\nflask",
      "app.py": "tok = AutoTokenizer.from_pretrained('distilbert/distilbert-base-uncased')",
    })
    expect(h.weights).toEqual(["model.safetensors"])
    expect(h.libraries).toEqual(expect.arrayContaining(["torch", "transformers"]))
    expect(h.huggingFace).toEqual(["distilbert/distilbert-base-uncased"])
  })
  it("finds nothing in ordinary web code", () => {
    expect(mlHints(["index.ts"], { "index.ts": "export const x = 1" })).toEqual({ weights: [], libraries: [], huggingFace: [] })
  })
})
