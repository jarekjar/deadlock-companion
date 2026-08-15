import { useCallback, useSyncExternalStore } from 'react'
import { loadJson, saveJson } from './storage'

/**
 * Favorited players, persisted to AsyncStorage. Uses useSyncExternalStore —
 * with React Compiler enabled, reading a mutable module variable during
 * render can get memoized into a frozen value (the old force-render pattern
 * left the Favorite button visually dead).
 */
const KEY = 'dc.favorites.v1'

export interface Favorite {
  accountId: number
  personaname: string
  avatar: string
}

let cache: Favorite[] = []
const listeners = new Set<() => void>()
let loaded = false

async function hydrate() {
  if (loaded) return
  loaded = true
  const saved = await loadJson<Favorite[]>(KEY)
  if (saved && saved.length > 0) {
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

export function useFavorites() {
  const favorites = useSyncExternalStore(subscribe, getSnapshot)

  const toggle = useCallback((fav: Favorite) => {
    cache = cache.some((f) => f.accountId === fav.accountId)
      ? cache.filter((f) => f.accountId !== fav.accountId)
      : [...cache, fav]
    void saveJson(KEY, cache)
    listeners.forEach((l) => l())
  }, [])

  const isFavorite = useCallback(
    (accountId: number) => favorites.some((f) => f.accountId === accountId),
    [favorites],
  )

  return { favorites, isFavorite, toggle }
}
