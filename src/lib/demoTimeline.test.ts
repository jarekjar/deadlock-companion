import { describe, expect, it } from 'vitest'
import { DEMO_QUERY, toEvents } from './demoTimeline'

/**
 * Round times straight out of match 101556979's demo. The Mid-Boss anchor sits
 * at 46.0, and rebasing on it has to land the known-good match clock: Sinner's
 * Sacrifice at 8:00, the Urn on its 5-minute lattice from 10:00.
 */
const REAL_ROWS = [
  { kind: 'midboss', t: 46.0 },
  { kind: 'midboss', t: 2769.3 },
  { kind: 'sinners', t: 526.0 },
  { kind: 'urn', t: 646.0 },
  { kind: 'urn', t: 1546.0 },
  { kind: 'rift', t: 723.1 },
  { kind: 'rift', t: 1205.0 },
]

describe('toEvents', () => {
  it('rebases round time onto the match clock via the Mid-Boss anchor', () => {
    const events = toEvents(REAL_ROWS)
    expect(events.map((e) => [e.at, e.kind])).toEqual([
      [0, 'midboss'],
      [480, 'sinners'],
      [600, 'urn'],
      [677, 'rift'],
      [1159, 'rift'],
      [1500, 'urn'],
      [2723, 'midboss'],
    ])
  })

  it('gives up without a Mid-Boss row, since there is nothing to anchor to', () => {
    expect(toEvents([{ kind: 'urn', t: 646 }])).toEqual([])
  })

  it('drops pre-game entities that predate the anchor', () => {
    const events = toEvents([
      { kind: 'midboss', t: 46 },
      { kind: 'urn', t: 12 },
    ])
    expect(events).toEqual([{ at: 0, label: 'Mid-Boss spawned', kind: 'midboss' }])
  })

  it('ignores rows the query returned as null', () => {
    const events = toEvents([
      { kind: 'midboss', t: 46 },
      { kind: 'sinners', t: null },
    ])
    expect(events.map((e) => e.kind)).toEqual(['midboss'])
  })
})

describe('DEMO_QUERY', () => {
  it('quotes mixed-case columns, which DataFusion would otherwise lowercase', () => {
    expect(DEMO_QUERY).toContain('"m_flCreateTime"')
    expect(DEMO_QUERY).not.toMatch(/[^"]m_flCreateTime/)
  })

  it('stays a single stable string so the API can dedupe and cache it', () => {
    expect(DEMO_QUERY).toBe(
      [
        `SELECT 'midboss' AS kind, CAST(t AS DOUBLE) AS t FROM (SELECT DISTINCT "m_flCreateTime" AS t FROM CNPC_MidBoss)`,
        `SELECT 'rift', CAST(t AS DOUBLE) FROM (SELECT DISTINCT "m_flCreateTime" AS t FROM CCitadelItemKothSpawner)`,
        `SELECT 'urn', CAST(t AS DOUBLE) FROM (SELECT DISTINCT "m_flCreateTime" AS t FROM CCitadelItemPickupIdol)`,
        `SELECT 'sinners', CAST(MIN("m_flCreateTime") AS DOUBLE) FROM CNPC_Neutral_SinnersSacrifice`,
      ].join('\nUNION ALL\n'),
    )
  })
})
