/**
 * Nightly pre-reads (money fix 3): popular repositories read ahead of time through the half-price batch interface,
 * so most people's requests are answered from the store. Each run:
 *  1. collects finished batches and stores their readings (and settles their cost);
 *  2. for each listed repository, skips it if its current commit is stored or queued, carries the last reading
 *     forward when nothing that matters changed, and otherwise queues it;
 *  3. submits the queue as one batch, within today's budget; what doesn't fit waits for the next night.
 */
import { MODEL, batchResults, customId, parseJson, submitBatch } from "./model"
import { SYSTEM_PROMPT, carryForward, prepare } from "./analyze"
import { headCommit, parseRepo, repoKey } from "./repo"
import { finishBatch, getReading, latestReading, openBatches, pendingKeys, putReading, saveBatch, settle } from "./store"

export interface PrereadReport { collected: number; failed: number; carried: number; current: number; submitted: number; deferred: number; errors: string[] }

export const MAX_PER_NIGHT = 40

export async function runPrereads(urls: string[]): Promise<PrereadReport> {
  const report: PrereadReport = { collected: 0, failed: 0, carried: 0, current: 0, submitted: 0, deferred: 0, errors: [] }

  // 1. Collect
  for (const batch of await openBatches()) {
    const answers = await batchResults(batch.id)
    if (!answers) continue
    const byId = new Map(answers.map((a) => [a.customId, a]))
    for (const item of batch.items) {
      const a = byId.get(item.customId)
      await settle(item.reservation, item.estimate, a?.costUsd ?? 0)
      if (!a?.text) { report.failed++; continue }
      try {
        const analysis = parseJson<Record<string, unknown>>(a.text)
        await putReading("analysis", item.key, item.repo, item.commit, MODEL, { analysis, meta: item.meta }, a.costUsd)
        report.collected++
      } catch { report.failed++ }
    }
    await finishBatch(batch.id)
  }

  // 2. Plan
  const pending = await pendingKeys()
  const queue: { url: string; key: string; repo: string; commit: string }[] = []
  for (const url of urls) {
    try {
      const ref = parseRepo(url)
      if (!ref) { report.errors.push(`${url}: not a repository address`); continue }
      const repo = repoKey(ref)
      const commit = await headCommit(ref)
      const key = `${repo}@${commit}`
      if (pending.has(key) || (await getReading("analysis", key))) { report.current++; continue }
      const prev = await latestReading<{ analysis: Record<string, unknown>; meta: Record<string, unknown> }>("analysis", repo)
      if (await carryForward(ref, key, repo, commit, prev)) { report.carried++; continue }
      if (queue.length < MAX_PER_NIGHT) queue.push({ url, key, repo, commit })
      else report.deferred++
    } catch (e) {
      report.errors.push(`${url}: ${e instanceof Error ? e.message : "failed"}`)
    }
  }

  // 3. Submit
  const prepared: { key: string; repo: string; commit: string; meta: Record<string, unknown>; user: string }[] = []
  for (const q of queue) {
    try {
      const p = await prepare(parseRepo(q.url)!)
      prepared.push({ key: q.key, repo: q.repo, commit: q.commit, meta: { ...p.meta, commit: q.commit }, user: p.userMessage })
    } catch (e) {
      report.errors.push(`${q.url}: ${e instanceof Error ? e.message : "failed"}`)
    }
  }
  if (prepared.length) {
    const { batchId, submitted, deferred } = await submitBatch(prepared.map((p) => ({ key: p.key, system: SYSTEM_PROMPT, user: p.user, maxTokens: 4000 })))
    report.deferred += deferred.length
    if (batchId) {
      const byKey = new Map(prepared.map((p) => [p.key, p]))
      await saveBatch(batchId, submitted.map((s) => {
        const p = byKey.get(s.key)!
        return { key: s.key, customId: customId(s.key), repo: p.repo, commit: p.commit, reservation: s.reservation, estimate: s.estimate, meta: p.meta }
      }))
      report.submitted = submitted.length
    }
  }
  return report
}
