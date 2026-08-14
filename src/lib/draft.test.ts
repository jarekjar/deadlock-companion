import { describe, expect, it } from 'vitest'
import { buildCounterMap, buildSynergyMap, scorePick, teamEdge } from './draft'
import { type HeroCounterStat, type HeroSynergyStat } from './api'

const counterStat = (hero: number, enemy: number, wins: number, matches: number) =>
  ({ hero_id: hero, enemy_hero_id: enemy, wins, matches_played: matches }) as HeroCounterStat

const synergyStat = (a: number, b: number, wins: number, matches: number): HeroSynergyStat => ({
  hero_id1: a,
  hero_id2: b,
  wins,
  matches_played: matches,
})

describe('buildSynergyMap', () => {
  it('is symmetric', () => {
    const map = buildSynergyMap([synergyStat(1, 2, 60, 100)])
    expect(map.get(1)?.get(2)?.winRate).toBe(60)
    expect(map.get(2)?.get(1)?.winRate).toBe(60)
  })
})

describe('scorePick', () => {
  const counters = buildCounterMap([
    counterStat(1, 10, 60, 100), // hero 1 wins 60% into 10
    counterStat(1, 11, 45, 100), // and 45% into 11
  ])
  const synergies = buildSynergyMap([synergyStat(1, 20, 55, 100)])

  it('averages counter and synergy edges', () => {
    const s = scorePick(1, [20], [10, 11], counters, synergies)
    expect(s.counterEdge).toBeCloseTo(2.5) // (+10 - 5) / 2
    expect(s.synergyEdge).toBeCloseTo(5)
    expect(s.score).toBeCloseTo(7.5)
    expect(s.bestAgainst?.heroId).toBe(10)
    expect(s.bestAgainst?.winRate).toBeCloseTo(60)
    expect(s.bestWith?.heroId).toBe(20)
    expect(s.bestWith?.winRate).toBeCloseTo(55)
  })

  it('scores zero with no data', () => {
    const s = scorePick(99, [1], [2], counters, synergies)
    expect(s.score).toBe(0)
    expect(s.bestAgainst).toBeNull()
  })

  it('ignores unknown opponents rather than counting them as even', () => {
    const s = scorePick(1, [], [10, 99], counters, synergies)
    expect(s.counterEdge).toBeCloseTo(10) // only the known matchup counts
  })
})

describe('teamEdge', () => {
  it('is positive for the favored team and mirrors for the other side', () => {
    const counters = buildCounterMap([
      counterStat(1, 10, 58, 100),
      counterStat(10, 1, 42, 100),
    ])
    const synergies = buildSynergyMap([])
    const edge = teamEdge([1], [10], counters, synergies)
    expect(edge).toBeCloseTo(8)
    expect(teamEdge([10], [1], counters, synergies)).toBeCloseTo(-8)
  })

  it('credits internal synergy differences at half weight', () => {
    const counters = buildCounterMap([])
    const synergies = buildSynergyMap([synergyStat(1, 2, 60, 100)])
    expect(teamEdge([1, 2], [3, 4], counters, synergies)).toBeCloseTo(5)
  })
})
