import { decompress } from 'fzstd'

const API_BASE = 'https://api.deadlock-api.com'
const POLL_MS = 5000
const MAX_POLLS = 60

/**
 * One canonical query, byte-stable forever. The demo API deduplicates
 * identical (match_id, query, format) submissions and reuses the cached
 * artifact, so keeping this string unchanged means only the first visitor to a
 * match pays the ~55s parse — everyone after that gets the answer instantly.
 *
 * `m_flCreateTime` is round time, not match clock: the round starts during
 * hero select, so every value is offset by the pre-game period. The Mid-Boss
 * now spawns exactly at 0:00 (05-22-2026 patch), which makes its first
 * creation the anchor that converts everything else to match clock.
 *
 * Column names are quoted because DataFusion lowercases bare identifiers.
 */
export const DEMO_QUERY = [
  `SELECT 'midboss' AS kind, CAST(t AS DOUBLE) AS t FROM (SELECT DISTINCT "m_flCreateTime" AS t FROM CNPC_MidBoss)`,
  `SELECT 'rift', CAST(t AS DOUBLE) FROM (SELECT DISTINCT "m_flCreateTime" AS t FROM CCitadelItemKothSpawner)`,
  `SELECT 'urn', CAST(t AS DOUBLE) FROM (SELECT DISTINCT "m_flCreateTime" AS t FROM CCitadelItemPickupIdol)`,
  `SELECT 'sinners', CAST(MIN("m_flCreateTime") AS DOUBLE) FROM CNPC_Neutral_SinnersSacrifice`,
].join('\nUNION ALL\n')

export interface DemoObjectiveEvent {
  /** Match clock, seconds. */
  at: number
  label: string
  kind: 'rift' | 'urn' | 'midboss' | 'sinners'
}

export type DemoObjectiveResult =
  | { available: true; events: DemoObjectiveEvent[] }
  | { available: false; reason: string }

interface DemoRow {
  kind: string
  t: number | null
}

const LABELS: Record<string, string> = {
  midboss: 'Mid-Boss spawned',
  rift: 'Unstable Rift called',
  urn: 'Soul Urn spawned',
  sinners: "Sinner's Sacrifice spawned",
}

/**
 * Neutral-objective timings for one match, read out of its demo file.
 *
 * Only matches whose replay salt reached the community API have a demo, which
 * is a small minority — an unavailable result is the normal case, not an error.
 */
export async function fetchDemoObjectives(matchId: number): Promise<DemoObjectiveResult> {
  const submitted = await submit(matchId)
  if ('reason' in submitted) return { available: false, reason: submitted.reason }

  const url = await pollForResult(submitted.jobId)
  if ('reason' in url) return { available: false, reason: url.reason }

  const rows = await fetchRows(url.resultUrl)
  const events = toEvents(rows)
  return events.length === 0
    ? { available: false, reason: 'The demo parsed but held no neutral objective events.' }
    : { available: true, events }
}

async function submit(matchId: number): Promise<{ jobId: string } | { reason: string }> {
  const res = await fetch(`${API_BASE}/v1/matches/demo/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ match_id: matchId, query: DEMO_QUERY, format: 'ndjson' }),
  })
  if (res.status === 404) return { reason: 'No demo has been recorded for this match.' }
  if (res.status === 429) {
    return { reason: 'The demo API is rate limited right now — try again in a few minutes.' }
  }
  if (!res.ok) return { reason: `The demo API returned ${res.status}.` }
  const body = (await res.json()) as { job_id?: string }
  return body.job_id ? { jobId: body.job_id } : { reason: 'The demo API did not start a job.' }
}

async function pollForResult(jobId: string): Promise<{ resultUrl: string } | { reason: string }> {
  for (let i = 0; i < MAX_POLLS; i++) {
    const res = await fetch(`${API_BASE}/v1/matches/demo/query/${jobId}`)
    if (!res.ok) return { reason: `The demo API returned ${res.status} while parsing.` }
    const body = (await res.json()) as {
      status: string
      result_url?: string | null
      error?: string | null
    }
    if (body.status === 'done' && body.result_url) return { resultUrl: body.result_url }
    if (body.status === 'failed') {
      return { reason: body.error ? `The demo could not be parsed: ${body.error}` : 'The demo could not be parsed.' }
    }
    await new Promise((r) => setTimeout(r, POLL_MS))
  }
  return { reason: 'The demo is taking longer than expected — try again shortly.' }
}

/** Results are zstd-compressed NDJSON; browsers cannot decode zstd natively. */
async function fetchRows(resultUrl: string): Promise<DemoRow[]> {
  const res = await fetch(resultUrl)
  if (!res.ok) throw new Error(`demo result ${res.status}`)
  const raw = new Uint8Array(await res.arrayBuffer())
  const text = new TextDecoder().decode(decompress(raw))
  return text
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line) as DemoRow)
}

/**
 * Rebases round time onto the match clock using the first Mid-Boss spawn as
 * 0:00, then drops anything that lands before the match started (pre-game
 * entities) as well as the anchor's own zero row.
 */
export function toEvents(rows: DemoRow[]): DemoObjectiveEvent[] {
  const times = (kind: string) =>
    rows.filter((r) => r.kind === kind && typeof r.t === 'number').map((r) => r.t as number)

  const midboss = times('midboss')
  if (midboss.length === 0) return []
  const offset = Math.min(...midboss)

  const events: DemoObjectiveEvent[] = []
  for (const kind of ['midboss', 'rift', 'urn', 'sinners'] as const) {
    for (const t of times(kind)) {
      const at = Math.round(t - offset)
      if (at < 0) continue
      events.push({ at, label: LABELS[kind], kind })
    }
  }
  return events.sort((a, b) => a.at - b.at)
}
