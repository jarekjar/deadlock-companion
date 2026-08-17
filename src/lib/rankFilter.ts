import { useCallback, useSyncExternalStore } from 'react'
import { type ModeFilterValue } from './api'

/**
 * Global rank bracket for the meta pages (heroes, items, matchups). Persisted
 * so the choice follows the user across pages and sessions.
 */
export const RANK_BRACKETS = [
  { label: 'All ranks', minBadge: 0 },
  { label: 'Emissary+', minBadge: 71 },
  { label: 'Oracle+', minBadge: 81 },
  { label: 'Phantom+', minBadge: 91 },
  { label: 'Ascendant+', minBadge: 101 },
] as const

const KEY = 'dc.rankFilter.v1'
const listeners = new Set<() => void>()
let cached: number | null = null

function read(): number {
  if (cached !== null) return cached
  try {
    cached = Number(localStorage.getItem(KEY) ?? 0) || 0
  } catch {
    cached = 0
  }
  return cached
}

export function useRankFilter() {
  const minBadge = useSyncExternalStore((listener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }, read)

  const setMinBadge = useCallback((value: number) => {
    cached = value
    try {
      localStorage.setItem(KEY, String(value))
    } catch {
      // private mode: filter lives for the session only
    }
    listeners.forEach((l) => l())
  }, [])

  return { minBadge, setMinBadge }
}

export function bracketLabel(minBadge: number, mode?: ModeFilterValue): string {
  // brawl queries can't filter by rank, so the bracket is dropped there
  // (see filterParams in api.ts) — label the data for what it actually is
  if (mode === 'brawl') return 'All ranks'
  return RANK_BRACKETS.find((b) => b.minBadge === minBadge)?.label ?? 'All ranks'
}
