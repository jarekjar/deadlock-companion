import { useEffect, useRef, useState } from 'react'
import { gameTime, pause, resume, resync, start, type ClockState } from './clock'
import { type ObjectiveState } from './timerEngine'
import { loadJson, saveJson } from './storage'

const CLOCK_KEY = 'dc.matchClock.v1'
const EVENTS_KEY = 'dc.objectiveEvents.v1'

/**
 * Persisted match clock. AsyncStorage loads are async, so the hook hydrates
 * on mount and only starts persisting after hydration (otherwise the initial
 * nulls would clobber a saved clock).
 */
export function useMatchClock() {
  const [clock, setClock] = useState<ClockState | null>(null)
  const [states, setStates] = useState<Record<string, ObjectiveState>>({})
  const [nowMs, setNowMs] = useState(() => Date.now())
  const hydrated = useRef(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [savedClock, savedStates] = await Promise.all([
        loadJson<ClockState>(CLOCK_KEY),
        loadJson<Record<string, ObjectiveState>>(EVENTS_KEY),
      ])
      if (cancelled) return
      if (savedClock) setClock(savedClock)
      if (savedStates) setStates(savedStates)
      hydrated.current = true
      setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!clock?.running) return
    const id = setInterval(() => setNowMs(Date.now()), 250)
    return () => clearInterval(id)
  }, [clock?.running])

  useEffect(() => {
    if (hydrated.current) void saveJson(CLOCK_KEY, clock)
  }, [clock])
  useEffect(() => {
    if (hydrated.current) void saveJson(EVENTS_KEY, states)
  }, [states])

  const t = clock ? gameTime(clock, nowMs) : 0

  return {
    ready,
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
      setClock((c) => (c ? resync(c, Date.now(), seconds) : start(Date.now())))
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
