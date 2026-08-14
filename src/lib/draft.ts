import { type HeroCounterStat, type HeroSynergyStat } from './api'

/**
 * Pure scoring for the draft simulator, built on the same counter and synergy
 * aggregates the matchup pages use. All "edges" are percentage points of win
 * rate relative to an even 50%.
 */

export interface PairRate {
  winRate: number
  matches: number
}

/** counter.get(heroId)?.get(enemyId) -> hero's win rate into that enemy. */
export function buildCounterMap(stats: HeroCounterStat[]): Map<number, Map<number, PairRate>> {
  const map = new Map<number, Map<number, PairRate>>()
  for (const s of stats) {
    if (s.matches_played === 0) continue
    let inner = map.get(s.hero_id)
    if (!inner) {
      inner = new Map()
      map.set(s.hero_id, inner)
    }
    inner.set(s.enemy_hero_id, {
      winRate: (s.wins / s.matches_played) * 100,
      matches: s.matches_played,
    })
  }
  return map
}

/** Symmetric same-team rates: synergy.get(a)?.get(b) === synergy.get(b)?.get(a). */
export function buildSynergyMap(stats: HeroSynergyStat[]): Map<number, Map<number, PairRate>> {
  const map = new Map<number, Map<number, PairRate>>()
  const set = (a: number, b: number, rate: PairRate) => {
    let inner = map.get(a)
    if (!inner) {
      inner = new Map()
      map.set(a, inner)
    }
    inner.set(b, rate)
  }
  for (const s of stats) {
    if (s.matches_played === 0) continue
    const rate = { winRate: (s.wins / s.matches_played) * 100, matches: s.matches_played }
    set(s.hero_id1, s.hero_id2, rate)
    set(s.hero_id2, s.hero_id1, rate)
  }
  return map
}

export interface DraftSuggestion {
  heroId: number
  /** counterEdge + synergyEdge, percentage points vs an even matchup. */
  score: number
  counterEdge: number
  synergyEdge: number
  /** The enemy this pick punishes hardest / the ally it pairs best with. */
  bestAgainst: { heroId: number; winRate: number } | null
  bestWith: { heroId: number; winRate: number } | null
}

/** Mean win-rate edge of one hero against/alongside a set of heroes. */
function meanEdge(
  rates: Map<number, PairRate> | undefined,
  others: number[],
): { edge: number; best: { heroId: number; winRate: number } | null } {
  if (!rates || others.length === 0) return { edge: 0, best: null }
  let sum = 0
  let count = 0
  let best: { heroId: number; winRate: number } | null = null
  for (const other of others) {
    const rate = rates.get(other)
    if (!rate) continue
    sum += rate.winRate - 50
    count++
    if (!best || rate.winRate > best.winRate) best = { heroId: other, winRate: rate.winRate }
  }
  return { edge: count > 0 ? sum / count : 0, best }
}

export function scorePick(
  heroId: number,
  allies: number[],
  enemies: number[],
  counters: Map<number, Map<number, PairRate>>,
  synergies: Map<number, Map<number, PairRate>>,
): DraftSuggestion {
  const vs = meanEdge(counters.get(heroId), enemies)
  const withAllies = meanEdge(synergies.get(heroId), allies)
  return {
    heroId,
    score: vs.edge + withAllies.edge,
    counterEdge: vs.edge,
    synergyEdge: withAllies.edge,
    bestAgainst: vs.best,
    bestWith: withAllies.best,
  }
}

/**
 * Projected edge for team A over team B, in percentage points vs an even 50%:
 * the average lane-agnostic counter edge across all cross-team pairs, plus the
 * difference in average internal synergy.
 */
export function teamEdge(
  teamA: number[],
  teamB: number[],
  counters: Map<number, Map<number, PairRate>>,
  synergies: Map<number, Map<number, PairRate>>,
): number {
  let counterSum = 0
  let counterCount = 0
  for (const a of teamA) {
    const rates = counters.get(a)
    for (const b of teamB) {
      const rate = rates?.get(b)
      if (!rate) continue
      counterSum += rate.winRate - 50
      counterCount++
    }
  }
  const internal = (team: number[]) => {
    let sum = 0
    let count = 0
    for (let i = 0; i < team.length; i++) {
      for (let j = i + 1; j < team.length; j++) {
        const rate = synergies.get(team[i])?.get(team[j])
        if (!rate) continue
        sum += rate.winRate - 50
        count++
      }
    }
    return count > 0 ? sum / count : 0
  }
  const counterEdge = counterCount > 0 ? counterSum / counterCount : 0
  return counterEdge + (internal(teamA) - internal(teamB)) / 2
}
