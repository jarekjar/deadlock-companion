import { useEffect, useState } from 'react'
import { loadJson, saveJson } from './storage'

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
  cache = (await loadJson<Favorite[]>(KEY)) ?? []
  listeners.forEach((l) => l())
}

export function useFavorites() {
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
    favorites: cache,
    isFavorite(accountId: number) {
      return cache.some((f) => f.accountId === accountId)
    },
    toggle(fav: Favorite) {
      cache = cache.some((f) => f.accountId === fav.accountId)
        ? cache.filter((f) => f.accountId !== fav.accountId)
        : [...cache, fav]
      void saveJson(KEY, cache)
      listeners.forEach((l) => l())
    },
  }
}
