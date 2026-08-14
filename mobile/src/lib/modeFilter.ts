import { useCallback, useSyncExternalStore } from 'react'
import { type ModeFilterValue } from './api'
import { loadJson, saveJson } from './storage'

/**
 * Global mode bracket for the meta screens (heroes, items, match prep),
 * persisted so the choice survives restarts. Same semantics as the website.
 * Uses useSyncExternalStore — with React Compiler enabled, reading a mutable
 * module variable during render can get memoized into a frozen value.
 */
const KEY = 'dc.modeFilter.v1'

export const MODE_OPTIONS: { label: string; value: ModeFilterValue }[] = [
  { label: 'All', value: 'all' },
  { label: 'Ranked', value: 'ranked' },
  { label: 'Brawl', value: 'brawl' },
]

const isMode = (v: unknown): v is ModeFilterValue =>
  v === 'all' || v === 'ranked' || v === 'brawl'

let cache: ModeFilterValue = 'all'
const listeners = new Set<() => void>()
let loaded = false

async function hydrate() {
  if (loaded) return
  loaded = true
  const saved = await loadJson<string>(KEY)
  if (isMode(saved) && saved !== cache) {
    cache = saved
    listeners.forEach((l) => l())
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  void hydrate()
  return () => {
    listeners.delete(listener)
  }
}

const getSnapshot = () => cache

export function useModeFilter() {
  const mode = useSyncExternalStore(subscribe, getSnapshot)
  const setMode = useCallback((value: ModeFilterValue) => {
    cache = value
    void saveJson(KEY, value)
    listeners.forEach((l) => l())
  }, [])
  return { mode, setMode }
}

export function modeLabel(mode: ModeFilterValue): string {
  return mode === 'ranked' ? 'ranked only' : mode === 'brawl' ? 'Street Brawl' : 'ranked + standard'
}
