import { useQueries, useQuery } from '@tanstack/react-query'
import {
  fetchAllItemStats,
  fetchAnalyticsHeroStats,
  fetchCounterItemStats,
  fetchHeroCounterStats,
  fetchHeroes,
  fetchHeroItemStats,
  fetchHeroStatsWithItem,
  fetchItems,
  fetchMatchHistory,
  fetchPlayerHeroStats,
  fetchRank,
  fetchRankAssets,
  fetchSteamProfiles,
  searchPlayers,
  type HeroAsset,
  type ItemAsset,
} from './api'

/** 30-day analytics window, midnight-aligned so query keys stay stable. */
const SINCE_30D = Math.floor(Date.now() / 1000 / 86400) * 86400 - 30 * 86400

const FOREVER = Number.POSITIVE_INFINITY

export function useHeroes() {
  return useQuery({
    queryKey: ['heroes'],
    queryFn: fetchHeroes,
    staleTime: FOREVER,
    gcTime: FOREVER,
    select: (heroes): Map<number, HeroAsset> => new Map(heroes.map((h) => [h.id, h])),
  })
}

export function useItems() {
  return useQuery({
    queryKey: ['items'],
    queryFn: fetchItems,
    staleTime: FOREVER,
    gcTime: FOREVER,
    select: (items): Map<number, ItemAsset> => new Map(items.map((i) => [i.id, i])),
  })
}

/** Same items query, keyed by class_name — hero abilities are referenced this way. */
export function useItemsByClassName() {
  return useQuery({
    queryKey: ['items'],
    queryFn: fetchItems,
    staleTime: FOREVER,
    gcTime: FOREVER,
    select: (items): Map<string, ItemAsset> =>
      new Map(items.flatMap((i) => (i.class_name ? [[i.class_name, i] as const] : []))),
  })
}

export function useRankAssets() {
  return useQuery({
    queryKey: ['rankAssets'],
    queryFn: fetchRankAssets,
    staleTime: FOREVER,
    gcTime: FOREVER,
  })
}

export const useHeroAnalytics = () =>
  useQuery({
    queryKey: ['heroAnalytics', SINCE_30D],
    queryFn: () => fetchAnalyticsHeroStats(SINCE_30D),
    staleTime: 30 * 60 * 1000,
  })

export const useHeroCounters = () =>
  useQuery({
    queryKey: ['heroCounters', SINCE_30D],
    queryFn: () => fetchHeroCounterStats(SINCE_30D),
    staleTime: 30 * 60 * 1000,
  })

export const useHeroItemStats = (heroId: number) =>
  useQuery({
    queryKey: ['heroItemStats', heroId, SINCE_30D],
    queryFn: () => fetchHeroItemStats(heroId, SINCE_30D),
    enabled: heroId > 0,
    staleTime: 30 * 60 * 1000,
  })

export const useCounterItems = (heroId: number, enemyHeroId: number | null) =>
  useQuery({
    queryKey: ['counterItems', heroId, enemyHeroId, SINCE_30D],
    queryFn: () => fetchCounterItemStats(heroId, enemyHeroId!, SINCE_30D),
    enabled: heroId > 0 && enemyHeroId !== null,
    staleTime: 30 * 60 * 1000,
  })

export const useAllItemStats = () =>
  useQuery({
    queryKey: ['allItemStats', SINCE_30D],
    queryFn: () => fetchAllItemStats(SINCE_30D),
    staleTime: 30 * 60 * 1000,
  })

export const useHeroStatsWithItem = (itemId: number) =>
  useQuery({
    queryKey: ['heroStatsWithItem', itemId, SINCE_30D],
    queryFn: () => fetchHeroStatsWithItem(itemId, SINCE_30D),
    enabled: itemId > 0,
    staleTime: 30 * 60 * 1000,
  })

export const useMatchHistory = (accountId: number) =>
  useQuery({
    queryKey: ['matchHistory', accountId],
    queryFn: () => fetchMatchHistory(accountId),
    enabled: accountId > 0,
    staleTime: 60 * 1000,
  })

export const usePlayerHeroStats = (accountId: number) =>
  useQuery({
    queryKey: ['playerHeroStats', accountId],
    queryFn: () => fetchPlayerHeroStats(accountId),
    enabled: accountId > 0,
    staleTime: 60 * 1000,
  })

export const useRank = (accountId: number) =>
  useQuery({
    queryKey: ['rank', accountId],
    queryFn: () => fetchRank(accountId),
    enabled: accountId > 0,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

export const useSteamProfile = (accountId: number) =>
  useQuery({
    queryKey: ['steamProfile', accountId],
    queryFn: async () => (await fetchSteamProfiles([accountId]))[0] ?? null,
    enabled: accountId > 0,
    staleTime: 5 * 60 * 1000,
  })

/** Per-player ranks, fanned out through the query cache. */
export function useRanks(accountIds: number[]) {
  return useQueries({
    queries: accountIds.map((id) => ({
      queryKey: ['rank', id],
      queryFn: () => fetchRank(id),
      staleTime: 5 * 60 * 1000,
      retry: false,
    })),
    combine: (results) => {
      const badges = new Map<number, number>()
      results.forEach((r, i) => {
        if (r.data?.badge) badges.set(accountIds[i], r.data.badge)
      })
      return badges
    },
  })
}

export const usePlayerSearch = (query: string) =>
  useQuery({
    queryKey: ['playerSearch', query],
    queryFn: () => searchPlayers(query),
    enabled: query.length > 0,
    staleTime: 60 * 1000,
  })
