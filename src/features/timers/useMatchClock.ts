import { useEffect, useState } from 'react'
import { gameTime, pause, resume, resync, start, type ClockState } from './clock'
import { type ObjectiveState } from './timerEngine'

const CLOCK_KEY = 'dc.matchClock.v1'
const EVENTS_KEY = 'dc.objectiveEvents.v1'

function load<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function persist(key: string, value: unknown): void {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage unavailable (private mode); the clock still works for the session
  }
}

export function useMatchClock() {
  const [clock, setClock] = useState<ClockState | null>(() => load<ClockState>(CLOCK_KEY))
  const [states, setStates] = useState<Record<string, ObjectiveState>>(
    () => load<Record<string, ObjectiveState>>(EVENTS_KEY) ?? {},
  )
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    if (!clock?.running) return
    const id = window.setInterval(() => setNowMs(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [clock?.running])

  useEffect(() => persist(CLOCK_KEY, clock), [clock])
  useEffect(() => persist(EVENTS_KEY, states), [states])

  const t = clock ? gameTime(clock, nowMs) : 0

  return {
    clock,
    t,
    states,
    startMatch() {
      setStates({})
      setClock(start(Date.now()))
      setNowMs(Date.now())
    },
    pauseMatch() {
      setClock((c) => (c ? pause(c, Date.now()) : c))
    },
    resumeMatch() {
      setNowMs(Date.now())
      setClock((c) => (c ? resume(c, Date.now()) : c))
    },
    resyncMatch(seconds: number) {
      setNowMs(Date.now())
      setClock((c) => (c ? resync(c, Date.now(), seconds) : c))
    },
    resetMatch() {
      setClock(null)
      setStates({})
    },
    recordEvent(objectiveId: string) {
      setStates((prev) => ({
        ...prev,
        [objectiveId]: { events: [...(prev[objectiveId]?.events ?? []), t] },
      }))
    },
    undoEvent(objectiveId: string) {
      setStates((prev) => ({
        ...prev,
        [objectiveId]: { events: (prev[objectiveId]?.events ?? []).slice(0, -1) },
      }))
    },
  }
}
