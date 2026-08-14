import { useEffect, useState } from 'react'
import { type ModeFilterValue } from './api'
import { loadJson, saveJson } from './storage'

/**
 * Global mode bracket for the meta screens (heroes, items, match prep),
 * persisted so the choice survives restarts. Same semantics as the website.
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
  if (isMode(saved)) {
    cache = saved
    listeners.forEach((l) => l())
  }
}

export function useModeFilter() {
  const [, force] = useState(0)
  useEffect(() => {
    const listener = () => force((n) => n + 1)
    listeners.add(listener)
    void hydrate()
    return () => {
      listeners.delete(listener)
    }
  }, [])

  return {
    mode: cache,
    setMode(value: ModeFilterValue) {
      cache = value
      void saveJson(KEY, value)
      listeners.forEach((l) => l())
    },
  }
}

export function modeLabel(mode: ModeFilterValue): string {
  return mode === 'ranked' ? 'ranked only' : mode === 'brawl' ? 'Street Brawl' : 'ranked + standard'
}
