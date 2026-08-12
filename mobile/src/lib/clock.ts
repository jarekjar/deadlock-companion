/**
 * Match clock, anchored to a real-time instant so ticking is drift-free:
 * game time = anchorGameTime + (now - anchorMs) while running.
 */
export interface ClockState {
  running: boolean
  anchorMs: number
  anchorGameTime: number
}

export function gameTime(state: ClockState, nowMs: number): number {
  if (!state.running) return state.anchorGameTime
  return state.anchorGameTime + (nowMs - state.anchorMs) / 1000
}

export function start(nowMs: number): ClockState {
  return { running: true, anchorMs: nowMs, anchorGameTime: 0 }
}

export function pause(state: ClockState, nowMs: number): ClockState {
  return { running: false, anchorMs: nowMs, anchorGameTime: gameTime(state, nowMs) }
}

export function resume(state: ClockState, nowMs: number): ClockState {
  return { ...state, running: true, anchorMs: nowMs }
}

/** Snap the clock to a known in-game time (mid-match sync). */
export function resync(state: ClockState, nowMs: number, gameTimeSec: number): ClockState {
  return { running: state.running, anchorMs: nowMs, anchorGameTime: gameTimeSec }
}
