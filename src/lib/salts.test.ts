import { describe, expect, it } from 'vitest'
import { extractSalts, mergeSalts } from './salts'
import { percentileOf, performanceScore, scoreGrade } from './metrics'
import { type MetricStats, type PlayerMetrics } from './api'

describe('extractSalts', () => {
  it('parses meta and dem urls out of arbitrary bytes', () => {
    const text =
      'garbage\0\0http://replay404.valve.net/1422450/37959196_937530290.meta.bz2 more junk ' +
      'http://replay183.valve.net/1422450/42476710_428480166.dem.bz2\r\n trailing'
    const salts = extractSalts(text)
    expect(salts).toHaveLength(2)
    expect(salts[0]).toMatchObject({
      match_id: 37959196,
      cluster_id: 404,
      metadata_salt: 937530290,
      replay_salt: null,
    })
    expect(salts[1]).toMatchObject({
      match_id: 42476710,
      cluster_id: 183,
      metadata_salt: null,
      replay_salt: 428480166,
    })
  })

  it('ignores urls for other apps', () => {
    expect(extractSalts('http://replay1.valve.net/570/123_456.meta.bz2')).toHaveLength(0)
  })
})

describe('mergeSalts', () => {
  it('folds meta and replay salts of the same match together', () => {
    const merged = mergeSalts([
      { match_id: 1, cluster_id: 10, metadata_salt: 111, replay_salt: null },
      { match_id: 1, cluster_id: 10, metadata_salt: null, replay_salt: 222 },
      { match_id: 2, cluster_id: 11, metadata_salt: 333, replay_salt: null },
    ])
    expect(merged).toHaveLength(2)
    expect(merged.find((s) => s.match_id === 1)).toMatchObject({
      metadata_salt: 111,
      replay_salt: 222,
    })
  })
})

describe('percentileOf', () => {
  const pop: MetricStats = {
    avg: 50,
    std: 10,
    percentile1: 10,
    percentile5: 20,
    percentile10: 25,
    percentile25: 35,
    percentile50: 50,
    percentile75: 65,
    percentile90: 80,
    percentile95: 90,
    percentile99: 100,
  }

  it('finds exact percentile points', () => {
    expect(percentileOf(50, pop)).toBe(50)
    expect(percentileOf(80, pop)).toBe(90)
  })

  it('interpolates between points', () => {
    expect(percentileOf(57.5, pop)).toBeCloseTo(62.5)
  })

  it('clamps at the tails', () => {
    expect(percentileOf(0, pop)).toBe(1)
    expect(percentileOf(500, pop)).toBe(99)
  })
})

describe('performanceScore', () => {
  const stats = (values: Partial<MetricStats>): MetricStats => ({
    avg: 0,
    std: 1,
    percentile1: 1,
    percentile5: 5,
    percentile10: 10,
    percentile25: 25,
    percentile50: 50,
    percentile75: 75,
    percentile90: 90,
    percentile95: 95,
    percentile99: 99,
    ...values,
  })

  it('scores a perfectly median player at 50', () => {
    // player avg 50 on a 1..99 linear population curve = the 50th percentile;
    // deaths lower-is-better flips around the same midpoint
    const population: PlayerMetrics = Object.fromEntries(
      ['kda', 'net_worth_per_min', 'player_damage_per_min', 'deaths', 'last_hits'].map((k) => [
        k,
        stats({}),
      ]),
    )
    const player: PlayerMetrics = Object.fromEntries(
      Object.keys(population).map((k) => [k, stats({ avg: 50 })]),
    )
    const result = performanceScore(player, population)!
    expect(result.score).toBe(50)
  })

  it('flips lower-is-better metrics', () => {
    const population: PlayerMetrics = { deaths: stats({}) }
    const player: PlayerMetrics = { deaths: stats({ avg: 10 }) } // 10th pct of deaths = few deaths
    const result = performanceScore(player, population)!
    expect(result.metrics[0].beats).toBe(90)
    expect(result.score).toBe(90)
  })

  it('returns null with no overlapping metrics', () => {
    expect(performanceScore({}, {})).toBeNull()
  })

  it('grades on the expected boundaries', () => {
    expect(scoreGrade(90)).toBe('S')
    expect(scoreGrade(70)).toBe('A')
    expect(scoreGrade(55)).toBe('B')
    expect(scoreGrade(40)).toBe('C')
    expect(scoreGrade(20)).toBe('D')
  })
})
