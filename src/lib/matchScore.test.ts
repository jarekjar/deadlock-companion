import { describe, expect, it } from 'vitest'
import { matchScores, type LobbyPlayerLine } from './matchScore'

const line = (account_id: number, x: number): LobbyPlayerLine => ({
  account_id,
  kills: x,
  deaths: 12 - x,
  assists: x,
  net_worth: x * 1000,
  last_hits: x * 10,
  denies: x,
  player_damage: x * 1000,
  player_healing: x * 100,
  boss_damage: x * 100,
})

describe('matchScores', () => {
  it.each([
    ['best at everything', 12, 12],
    ['worst at everything', 1, 1],
  ])('%s scores %d', (_, account, expected) => {
    const lobby = Array.from({ length: 12 }, (_, i) => line(i + 1, i + 1))
    expect(matchScores(lobby).get(account)).toBe(expected)
  })

  it('splits ties and stretches short lobbies to the 12 scale', () => {
    const scores = matchScores([line(1, 5), line(2, 5), line(3, 1)])
    expect(scores.get(1)).toBe(scores.get(2))
    expect(scores.get(1)).toBe(9.3)
    expect(scores.get(3)).toBe(1)
  })

  it('returns nothing for a lobby of one', () => {
    expect(matchScores([line(1, 3)]).size).toBe(0)
  })
})
