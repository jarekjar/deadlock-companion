/**
 * The per-match ranking: every player in a lobby placed 1st to 12th. Each
 * stat ranks the lobby (best = most points, ties share the average), the
 * weighted mean of those placements orders the players, and their position
 * in that order is their rank — 1 is the best performance in the match.
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

export interface MatchRank {
  /** 1 = best in the lobby. */
  rank: number
  /** Lobby size: 12 normally, 8 in Street Brawl. */
  of: number
}

/** account_id → placement in the lobby, 1 (best) to lobby size. */
export function matchRanks(lobby: LobbyPlayerLine[]): Map<number, MatchRank> {
  const out = new Map<number, MatchRank>()
  const n = lobby.length
  if (n < 2) return out
  const totals = new Array<number>(n).fill(0)
  for (const stat of STATS) {
    const values = lobby.map((p) => (stat.lowerIsBetter ? -stat.value(p) : stat.value(p)))
    values.forEach((v, i) => {
      const below = values.filter((o) => o < v).length
      const tied = values.filter((o) => o === v).length - 1
      totals[i] += stat.weight * (below + tied / 2)
    })
  }
  // souls break an exact tie on the composite
  const order = lobby
    .map((p, i) => ({ p, total: totals[i] }))
    .sort((a, b) => b.total - a.total || b.p.net_worth - a.p.net_worth)
  order.forEach(({ p }, i) => out.set(p.account_id, { rank: i + 1, of: n }))
  return out
}

/** Colour band for a placement: MVP / top three / bottom three / the rest. */
export function rankTier({ rank, of }: MatchRank): 'top' | 'good' | 'mid' | 'low' {
  if (rank === 1) return 'top'
  if (rank <= 3) return 'good'
  if (rank > of - 3) return 'low'
  return 'mid'
}
