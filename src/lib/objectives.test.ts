import { describe, expect, it } from 'vitest'
import type { MatchInfo } from './api'
import {
  ABSENT_OBJECTIVE_IDS,
  OBJECTIVES_PER_TEAM,
  objectiveName,
  objectiveTimeline,
  objectivesStanding,
} from './objectives'

/**
 * Masks and objective rows lifted verbatim from match 101558432's metadata —
 * a finished game where Amber lost everything. The two have to agree: no id
 * with a destroyed time may still be standing in the mask.
 */
const REAL_MASK_TEAM0 = 8260
const REAL_MASK_TEAM1 = 65477

const info = (over: Partial<MatchInfo>): MatchInfo => ({
  match_id: 1,
  duration_s: 1800,
  start_time: 0,
  winning_team: 1,
  average_badge_team0: null,
  average_badge_team1: null,
  players: [],
  mid_boss: null,
  objectives: null,
  ...over,
})

describe('objectivesStanding', () => {
  it('ignores the removed lane, so a wiped team reads as zero', () => {
    expect(objectivesStanding(REAL_MASK_TEAM0)).toBe(0)
  })

  it('counts only objectives that can actually be killed', () => {
    // Sapphire kept everything except Guardians 1/3/4 and Walker 1.
    expect(objectivesStanding(REAL_MASK_TEAM1)).toBe(OBJECTIVES_PER_TEAM - 4)
  })

  it('a full mask is one whole side of the map', () => {
    expect(objectivesStanding(0xffff)).toBe(OBJECTIVES_PER_TEAM)
    expect(OBJECTIVES_PER_TEAM).toBe(13)
  })

  it('the removed lane bits never contribute', () => {
    let onlyAbsent = 0
    for (const id of ABSENT_OBJECTIVE_IDS) onlyAbsent |= 1 << id
    expect(objectivesStanding(onlyAbsent)).toBe(0)
  })
})

describe('objectiveName', () => {
  it('names the real objectives', () => {
    expect(objectiveName(0)).toBe('Patron')
    expect(objectiveName(5)).toBe('Walker · Lane 1')
    expect(objectiveName(9)).toBe('Titan')
    expect(objectiveName(14)).toBe('Base Guardian · Lane 3')
  })

  it('falls back rather than rendering undefined', () => {
    expect(objectiveName(99)).toBe('Objective 99')
  })
})

describe('objectiveTimeline', () => {
  it('merges lane objectives and mid-boss kills in time order', () => {
    const events = objectiveTimeline(
      info({
        objectives: [
          { team_objective_id: 5, team: 0, destroyed_time_s: 993, first_damage_time_s: 458 },
          { team_objective_id: 1, team: 0, destroyed_time_s: 381, first_damage_time_s: 86 },
        ],
        mid_boss: [{ team_killed: 1, team_claimed: 1, destroyed_time_s: 600 }],
      }),
    )
    expect(events.map((e) => [e.at, e.label])).toEqual([
      [381, 'Guardian · Lane 1'],
      [600, 'Mid-Boss'],
      [993, 'Walker · Lane 1'],
    ])
  })

  it('drops objectives that were only damaged', () => {
    const events = objectiveTimeline(
      info({
        objectives: [
          { team_objective_id: 7, team: 1, destroyed_time_s: 0, first_damage_time_s: 747 },
          { team_objective_id: 3, team: 1, destroyed_time_s: 676, first_damage_time_s: 226 },
        ],
      }),
    )
    expect(events).toHaveLength(1)
    expect(events[0].label).toBe('Guardian · Lane 3')
  })

  it('flags a stolen Rejuvenator and leaves a clean claim unflagged', () => {
    const [stolen, clean] = objectiveTimeline(
      info({
        mid_boss: [
          { team_killed: 0, team_claimed: 1, destroyed_time_s: 600 },
          { team_killed: 1, team_claimed: 1, destroyed_time_s: 1200 },
        ],
      }),
    )
    expect(stolen).toMatchObject({ team: 0, stolenBy: 1 })
    expect(clean.stolenBy).toBeUndefined()
    expect(clean.team).toBe(1)
  })

  it('handles a match with neither array populated', () => {
    expect(objectiveTimeline(info({}))).toEqual([])
  })
})
