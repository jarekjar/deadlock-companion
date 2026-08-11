export type ObjectiveMode = 'info' | 'interval' | 'event' | 'ladder'

export interface ObjectiveDef {
  id: string
  name: string
  tier?: string
  /** Game time in seconds when the objective first appears. */
  firstSpawn: number
  mode: ObjectiveMode
  /** interval mode: seconds between waves after firstSpawn. */
  interval?: number
  /** event mode: seconds after the event until respawn. */
  respawn?: number
  /** ladder mode: respawn delay per successive event; last entry repeats. */
  ladder?: number[]
  /** Label for the button that records the event ("Killed", "Broken", ...). */
  eventLabel?: string
  note?: string
  /** Approximate marker positions on the minimap, as relative coordinates. */
  mapSpots?: { left: number; top: number }[]
}

export interface ObjectiveState {
  /** Game times (seconds) at which the player recorded the event. */
  events: number[]
}

export type SpawnStatus =
  | { kind: 'waiting'; spawnsAt: number }
  | { kind: 'up' }
  /** info mode: on the map; respawn depends on when each instance is cleared. */
  | { kind: 'spawned' }

export const emptyState = (): ObjectiveState => ({ events: [] })

export function nextSpawn(def: ObjectiveDef, state: ObjectiveState, t: number): SpawnStatus {
  if (t < def.firstSpawn && state.events.length === 0) {
    return { kind: 'waiting', spawnsAt: def.firstSpawn }
  }
  switch (def.mode) {
    case 'info':
      return { kind: 'spawned' }
    case 'interval': {
      const interval = def.interval ?? 300
      const wavesElapsed = Math.floor((t - def.firstSpawn) / interval)
      return { kind: 'waiting', spawnsAt: def.firstSpawn + (wavesElapsed + 1) * interval }
    }
    case 'event': {
      const last = state.events[state.events.length - 1]
      if (last === undefined) return { kind: 'up' }
      const next = last + (def.respawn ?? 300)
      return t >= next ? { kind: 'up' } : { kind: 'waiting', spawnsAt: next }
    }
    case 'ladder': {
      const last = state.events[state.events.length - 1]
      if (last === undefined) return { kind: 'up' }
      const ladder = def.ladder ?? [300]
      const delay = ladder[Math.min(state.events.length - 1, ladder.length - 1)]
      const next = last + delay
      return t >= next ? { kind: 'up' } : { kind: 'waiting', spawnsAt: next }
    }
  }
}

/** "754" -> "12:34"; negatives clamp to 0:00; hours roll into minutes (65:00). */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(s / 60)
  const seconds = s % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/** Accepts "12:34", "2:05", ":45", "90" (plain seconds). Returns seconds or null. */
export function parseGameTime(input: string): number | null {
  const trimmed = input.trim()
  if (trimmed === '') return null
  const match = /^(\d*):([0-5]?\d)$/.exec(trimmed)
  if (match) {
    const minutes = match[1] === '' ? 0 : Number(match[1])
    return minutes * 60 + Number(match[2])
  }
  if (/^\d+$/.test(trimmed)) return Number(trimmed)
  return null
}
