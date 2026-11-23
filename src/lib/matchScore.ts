/**
 * The per-match score: how a player stacked up against the other eleven in
 * the same lobby. Each stat ranks the lobby (best = 12 points, worst = 1,
 * ties share the average), and the score is the weighted mean of those
 * placements — so 12.0 means topping every stat and 6.5 is dead average.
 */

export interface LobbyPlayerLine {
  account_id: number
  kills: number
  deaths: number
  assists: number
  net_worth: number
  last_hits: number
  denies: number
  player_damage: number
  player_healing: number
  boss_damage: number
}

interface ScoreStat {
  weight: number
  value: (p: LobbyPlayerLine) => number
  lowerIsBetter?: boolean
}

/** Weights sum to 1. */
const STATS: ScoreStat[] = [
  { weight: 0.2, value: (p) => p.kills + p.assists },
  { weight: 0.2, value: (p) => p.net_worth },
  { weight: 0.2, value: (p) => p.player_damage },
  { weight: 0.1, value: (p) => (p.kills + p.assists) / Math.max(1, p.deaths) },
  { weight: 0.1, value: (p) => p.deaths, lowerIsBetter: true },
  { weight: 0.1, value: (p) => p.last_hits },
  { weight: 0.05, value: (p) => p.boss_damage },
  { weight: 0.025, value: (p) => p.player_healing },
  { weight: 0.025, value: (p) => p.denies },
]

export const MAX_MATCH_SCORE = 12

/** account_id → score on a 1–12 scale, one decimal. */
export function matchScores(lobby: LobbyPlayerLine[]): Map<number, number> {
  const out = new Map<number, number>()
  const n = lobby.length
  if (n < 2) return out
  const totals = new Array<number>(n).fill(0)
  for (const stat of STATS) {
    const values = lobby.map((p) => (stat.lowerIsBetter ? -stat.value(p) : stat.value(p)))
    values.forEach((v, i) => {
      const below = values.filter((o) => o < v).length
      const tied = values.filter((o) => o === v).length - 1
      // points 1..n among this lobby, scaled to 1..12 for lobbies short a player
      const points = 1 + below + tied / 2
      totals[i] += stat.weight * (1 + ((points - 1) * (MAX_MATCH_SCORE - 1)) / (n - 1))
    })
  }
  lobby.forEach((p, i) => out.set(p.account_id, Math.round(totals[i] * 10) / 10))
  return out
}

/** Colour band for a score: top / solid / middling / rough. */
export function scoreTier(score: number): 'top' | 'good' | 'mid' | 'low' {
  if (score >= 9.5) return 'top'
  if (score >= 7.5) return 'good'
  if (score >= 5) return 'mid'
  return 'low'
}
