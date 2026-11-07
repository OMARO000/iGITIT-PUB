/**
 * iGITit's own records (schema `igitit`): readings stored by repository and commit, shared by everyone, and the
 * day's model spending. Without IGITIT_DATABASE_URL, readings aren't stored and spending is counted in memory.
 */
import postgres from "postgres"

type Sql = postgres.Sql
let sql: Sql | null | undefined
let ready: Promise<void> | null = null

export function db(): Sql | null {
  if (sql !== undefined) return sql
  const url = process.env.IGITIT_DATABASE_URL
  sql = url ? postgres(url, { prepare: false, max: 4, idle_timeout: 30, onnotice: () => {} }) : null
  return sql
}

async function migrate(s: Sql): Promise<void> {
  await s`create schema if not exists igitit`
  await s`create table if not exists igitit.readings (
    kind text not null, key text not null, repo text, commit text, model text not null,
    result jsonb not null, cost_usd numeric not null default 0, created_at timestamptz not null default now(),
    primary key (kind, key)
  )`
  await s`create index if not exists readings_repo on igitit.readings (kind, repo, created_at desc)`
  await s`create table if not exists igitit.spend (
    id bigserial primary key, day date not null default (now() at time zone 'utc')::date, kind text not null,
    reserved_usd numeric not null, actual_usd numeric, created_at timestamptz not null default now()
  )`
  await s`create index if not exists spend_day on igitit.spend (day)`
}

export async function ready_(): Promise<Sql | null> {
  const s = db()
  if (!s) return null
  ready ??= migrate(s)
  await ready
  return s
}

export interface Stored<T> { result: T; model: string; commit: string | null; readAt: string }

export async function getReading<T>(kind: string, key: string): Promise<Stored<T> | null> {
  const s = await ready_()
  if (!s) return null
  const [r] = await s<{ result: T; model: string; commit: string | null; created_at: Date }[]>`
    select result, model, commit, created_at from igitit.readings where kind = ${kind} and key = ${key}`
  return r ? { result: r.result, model: r.model, commit: r.commit, readAt: r.created_at.toISOString() } : null
}

/** The newest reading of a repository at any commit: what's shown when today's budget is used up. */
export async function latestReading<T>(kind: string, repo: string): Promise<Stored<T> | null> {
  const s = await ready_()
  if (!s) return null
  const [r] = await s<{ result: T; model: string; commit: string | null; created_at: Date }[]>`
    select result, model, commit, created_at from igitit.readings where kind = ${kind} and repo = ${repo} order by created_at desc limit 1`
  return r ? { result: r.result, model: r.model, commit: r.commit, readAt: r.created_at.toISOString() } : null
}

export async function putReading(kind: string, key: string, repo: string | null, commit: string | null, model: string, result: unknown, costUsd: number): Promise<void> {
  const s = await ready_()
  if (!s) return
  await s`insert into igitit.readings (kind, key, repo, commit, model, result, cost_usd)
    values (${kind}, ${key}, ${repo}, ${commit}, ${model}, ${s.json(result as postgres.JSONValue)}, ${costUsd})
    on conflict (kind, key) do nothing`
}

// --- Spending -----------------------------------------------------------------------------------------------

let memoryDay = ""
let memorySpent = 0
const today = () => new Date().toISOString().slice(0, 10)

/** Today's spending (UTC day): settled calls at their real cost, calls in flight at their reserved cost. */
export async function spentToday(): Promise<number> {
  const s = await ready_()
  if (!s) { if (memoryDay !== today()) { memoryDay = today(); memorySpent = 0 } return memorySpent }
  const [r] = await s<{ usd: string }[]>`
    select coalesce(sum(coalesce(actual_usd, reserved_usd)), 0)::text as usd from igitit.spend where day = (now() at time zone 'utc')::date`
  return Number(r?.usd ?? 0)
}

/**
 * Reserves an estimated cost if it fits under today's cap. Returns a reservation id, or null when it doesn't fit.
 * In the database the check and the reservation run under one lock, so two calls can't both squeeze in.
 */
export async function reserve(kind: string, estimateUsd: number, capUsd: number): Promise<number | null> {
  const s = await ready_()
  if (!s) {
    if (memoryDay !== today()) { memoryDay = today(); memorySpent = 0 }
    if (memorySpent + estimateUsd > capUsd) return null
    memorySpent += estimateUsd
    return -1
  }
  // One reservation at a time (a transaction-scoped lock), so the check and the insert can't interleave.
  return s.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(hashtext('igitit.spend'))`
    const [r] = await tx<{ id: number }[]>`
      insert into igitit.spend (kind, reserved_usd)
      select ${kind}, ${estimateUsd}
      where (select coalesce(sum(coalesce(actual_usd, reserved_usd)), 0) from igitit.spend where day = (now() at time zone 'utc')::date) + ${estimateUsd} <= ${capUsd}
      returning id`
    return r ? Number(r.id) : null
  })
}

/** Records what a call really cost (or 0 when it failed before the model answered). */
export async function settle(id: number, estimateUsd: number, actualUsd: number): Promise<void> {
  const s = await ready_()
  if (!s || id < 0) { memorySpent += actualUsd - estimateUsd; return }
  await s`update igitit.spend set actual_usd = ${actualUsd} where id = ${id}`
}
