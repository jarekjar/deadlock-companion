import { describe, expect, it } from 'vitest'
import { matchRanks, type LobbyPlayerLine } from './matchScore'

const line = (account_id: number, x: number, souls = x * 1000): LobbyPlayerLine => ({
  account_id,
  kills: x,
  deaths: 12 - x,
  assists: x,
  net_worth: souls,
  last_hits: x * 10,
  denies: x,
  player_damage: x * 1000,
  player_healing: x * 100,
  boss_damage: x * 100,
})

describe('matchRanks', () => {
  it('places a full lobby 1 to 12, best first', () => {
    const lobby = Array.from({ length: 12 }, (_, i) => line(i + 1, i + 1))
    const ranks = matchRanks(lobby)
    expect(ranks.get(12)).toEqual({ rank: 1, of: 12 })
    expect(ranks.get(1)).toEqual({ rank: 12, of: 12 })
    expect(new Set([...ranks.values()].map((r) => r.rank)).size).toBe(12)
  })

  it('breaks an exact tie on souls and sizes to the lobby', () => {
    const ranks = matchRanks([line(1, 5, 4000), line(2, 5, 4000), line(3, 1)])
    expect([ranks.get(1)?.rank, ranks.get(2)?.rank].sort()).toEqual([1, 2])
    expect(ranks.get(3)).toEqual({ rank: 3, of: 3 })
  })

  it('returns nothing for a lobby of one', () => {
    expect(matchRanks([line(1, 3)]).size).toBe(0)
  })
})
