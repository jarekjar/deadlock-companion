import { describe, expect, it } from 'vitest'
import { extractSalts, mergeSalts } from './salts'
import { percentileOf } from './metrics'
import { type MetricStats } from './api'

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
