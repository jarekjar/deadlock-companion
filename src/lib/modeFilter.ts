import { useCallback, useSyncExternalStore } from 'react'
import { type ModeFilterValue } from './api'

/**
 * Global mode bracket for the meta pages (heroes, items, matchups), alongside
 * the rank bracket. Persisted so the choice follows the user across pages.
 */
export const MODE_OPTIONS: { label: string; value: ModeFilterValue }[] = [
  { label: 'Ranked + Standard', value: 'all' },
  { label: 'Ranked only', value: 'ranked' },
  { label: 'Street Brawl', value: 'brawl' },
]

const KEY = 'dc.modeFilter.v1'
const listeners = new Set<() => void>()
let cached: ModeFilterValue | null = null

const isMode = (v: string | null): v is ModeFilterValue =>
  v === 'all' || v === 'ranked' || v === 'brawl'

function read(): ModeFilterValue {
  if (cached !== null) return cached
  try {
    const stored = localStorage.getItem(KEY)
    cached = isMode(stored) ? stored : 'all'
  } catch {
    cached = 'all'
  }
  return cached
}

export function useModeFilter() {
  const mode = useSyncExternalStore((listener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }, read)

  const setMode = useCallback((value: ModeFilterValue) => {
    cached = value
    try {
      localStorage.setItem(KEY, value)
    } catch {
      // private mode: filter lives for the session only
    }
    listeners.forEach((l) => l())
  }, [])

  return { mode, setMode }
}

export function modeLabel(mode: ModeFilterValue): string {
  return MODE_OPTIONS.find((o) => o.value === mode)?.label ?? 'Ranked + Standard'
}
