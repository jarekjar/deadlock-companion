import type { MatchInfo } from './api'

/**
 * Lane objective ids as they appear in match metadata's `team_objective_id`
 * (Valve's `k_eCitadelObjective_*` enum, passed straight through by the API).
 *
 * Verified against live metadata rather than taken on faith: for any finished
 * match, the ids with a `destroyed_time_s` never overlap the bits still set in
 * that team's `objectives_mask`, and the three ids below that no current-map
 * objective uses stay set in every mask.
 */
export const OBJECTIVE_NAMES: Record<number, string> = {
  0: 'Patron',
  1: 'Guardian · Lane 1',
  2: 'Guardian · Lane 2',
  3: 'Guardian · Lane 3',
  4: 'Guardian · Lane 4',
  5: 'Walker · Lane 1',
  6: 'Walker · Lane 2',
  7: 'Walker · Lane 3',
  8: 'Walker · Lane 4',
  9: 'Titan',
  10: 'Shrine',
  11: 'Shrine',
  12: 'Base Guardian · Lane 1',
  13: 'Base Guardian · Lane 2',
  14: 'Base Guardian · Lane 3',
  15: 'Base Guardian · Lane 4',
}

/**
 * Lane 2 was removed in the map rework, but its three bits are still part of
 * the 16-bit mask and are never cleared — so counting raw set bits reports
 * three objectives that cannot be killed. Every mask in every match has these
 * set, which is what makes them identifiable.
 */
export const ABSENT_OBJECTIVE_IDS = new Set([2, 6, 13])

/** Objectives a team can actually lose on the current map. */
export const OBJECTIVES_PER_TEAM = 16 - ABSENT_OBJECTIVE_IDS.size

/** Count of objectives still standing, ignoring the removed lane's dead bits. */
export function objectivesStanding(mask: number): number {
  let count = 0
  for (let id = 0; id < 16; id++) {
    if (ABSENT_OBJECTIVE_IDS.has(id)) continue
    if ((mask >>> id) & 1) count++
  }
  return count
}

export const objectiveName = (id: number): string => OBJECTIVE_NAMES[id] ?? `Objective ${id}`

export interface ObjectiveEvent {
  /** Game time in seconds. */
  at: number
  /** The team that *lost* the objective, or claimed the Mid-Boss. */
  team: number
  label: string
  kind: 'lane' | 'midboss'
  /** Mid-Boss only: set when the Rejuvenator was stolen by the other team. */
  stolenBy?: number
}

/**
 * Merged, time-ordered log of everything that fell in a match: lane
 * objectives from `objectives` plus Mid-Boss kills from `mid_boss`.
 *
 * `destroyed_time_s` is 0 for objectives that were only damaged, so those are
 * dropped — an objective that survived has no place on a timeline.
 */
export function objectiveTimeline(info: MatchInfo): ObjectiveEvent[] {
  const events: ObjectiveEvent[] = []

  for (const o of info.objectives ?? []) {
    if (!o.destroyed_time_s) continue
    events.push({
      at: o.destroyed_time_s,
      team: o.team,
      label: objectiveName(o.team_objective_id),
      kind: 'lane',
    })
  }

  for (const e of info.mid_boss ?? []) {
    if (!e.destroyed_time_s) continue
    events.push({
      at: e.destroyed_time_s,
      team: e.team_killed,
      label: 'Mid-Boss',
      kind: 'midboss',
      stolenBy: e.team_claimed === e.team_killed ? undefined : e.team_claimed,
    })
  }

  return events.sort((a, b) => a.at - b.at)
}
