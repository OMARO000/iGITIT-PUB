import { NextRequest, NextResponse } from "next/server"
import { BudgetReached } from "@/app/lib/model"
import { NotARepo, analyzeRepo } from "@/app/lib/analyze"

/**
 * POST { url }. The server reads the repository itself, at one commit; files sent by a browser are ignored,
 * so stored readings can be trusted and shared, and nobody can run the model on text of their own.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const url = typeof body.url === "string" ? body.url
      : body.meta?.owner && body.meta?.repo ? `https://${String(body.meta.platform ?? "GitHub").toLowerCase() === "gitlab" ? "gitlab" : "github"}.com/${body.meta.owner}/${body.meta.repo}` : ""
    if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 })
    return NextResponse.json(await analyzeRepo(url))
  } catch (err) {
    if (err instanceof NotARepo) return NextResponse.json({ error: err.message }, { status: 400 })
    if (err instanceof BudgetReached) return NextResponse.json({ error: err.message, budget: true }, { status: 503 })
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
