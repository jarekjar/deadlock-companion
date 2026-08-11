import { useCallback, useSyncExternalStore } from 'react'

export interface Favorite {
  accountId: number
  personaname: string
  avatar: string
}

const KEY = 'dc.favorites.v1'
const listeners = new Set<() => void>()
let cache: Favorite[] | null = null

function read(): Favorite[] {
  if (cache) return cache
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? '[]') as Favorite[]
  } catch {
    cache = []
  }
  return cache
}

function write(next: Favorite[]): void {
  cache = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // private mode: favorites live for the session only
  }
  listeners.forEach((l) => l())
}

export function useFavorites() {
  const favorites = useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    read,
  )
  const toggle = useCallback((fav: Favorite) => {
    const current = read()
    write(
      current.some((f) => f.accountId === fav.accountId)
        ? current.filter((f) => f.accountId !== fav.accountId)
        : [...current, fav],
    )
  }, [])
  return { favorites, toggle }
}
