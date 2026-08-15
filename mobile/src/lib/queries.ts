import { useQueries, useQuery } from '@tanstack/react-query'
import {
  fetchAllItemStats,
  fetchAnalyticsHeroStats,
  fetchBuild,
  fetchBuilds,
  fetchCounterItemStats,
  fetchEnemyStats,
  fetchHeroCounterStats,
  fetchHeroes,
  fetchHeroItemStats,
  fetchHeroStatsWithItem,
  fetchHeroSynergyStats,
  fetchItems,
  fetchMatchHistory,
  fetchMateStats,
  fetchPerformanceCurve,
  fetchPlayerHeroStats,
  fetchPlayerMetrics,
  fetchRank,
  fetchRankAssets,
  fetchSteamProfiles,
  searchPlayers,
  type BuildSearch,
  type HeroAsset,
  type ItemAsset,
  type ModeFilterValue,
  type SteamProfile,
} from './api'

/** 30-day analytics window, midnight-aligned so query keys stay stable. */
export const SINCE_30D = Math.floor(Date.now() / 1000 / 86400) * 86400 - 30 * 86400

export const SINCE_90D = Math.floor(Date.now() / 1000 / 86400) * 86400 - 90 * 86400

/** 0 disables the time filter — endpoints then cover every recorded match. */
export const ALL_TIME = 0

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

export const useHeroAnalytics = (mode: ModeFilterValue = 'all') =>
  useQuery({
    queryKey: ['heroAnalytics', SINCE_30D, mode],
    queryFn: () => fetchAnalyticsHeroStats(SINCE_30D, mode),
    staleTime: 30 * 60 * 1000,
  })

export const useHeroCounters = (mode: ModeFilterValue = 'all') =>
  useQuery({
    queryKey: ['heroCounters', SINCE_30D, mode],
    queryFn: () => fetchHeroCounterStats(SINCE_30D, mode),
    staleTime: 30 * 60 * 1000,
  })

export const useHeroSynergies = (mode: ModeFilterValue = 'all') =>
  useQuery({
    queryKey: ['heroSynergies', SINCE_30D, mode],
    queryFn: () => fetchHeroSynergyStats(SINCE_30D, mode),
    staleTime: 30 * 60 * 1000,
  })

export const useHeroItemStats = (heroId: number, mode: ModeFilterValue = 'all') =>
  useQuery({
    queryKey: ['heroItemStats', heroId, SINCE_30D, mode],
    queryFn: () => fetchHeroItemStats(heroId, SINCE_30D, mode),
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

export const useAllItemStats = (mode: ModeFilterValue = 'all') =>
  useQuery({
    queryKey: ['allItemStats', SINCE_30D, mode],
    queryFn: () => fetchAllItemStats(SINCE_30D, mode),
    staleTime: 30 * 60 * 1000,
  })

export const useHeroStatsWithItem = (itemId: number, mode: ModeFilterValue = 'all') =>
  useQuery({
    queryKey: ['heroStatsWithItem', itemId, SINCE_30D, mode],
    queryFn: () => fetchHeroStatsWithItem(itemId, SINCE_30D, mode),
    enabled: itemId > 0,
    staleTime: 30 * 60 * 1000,
  })

/** Pass accountId 0 for the population-wide distribution (cached long, shared). */
export const usePlayerMetrics = (
  accountId: number,
  sinceUnix = SINCE_30D,
  mode: ModeFilterValue = 'all',
  enabled = true,
) =>
  useQuery({
    queryKey: ['playerMetrics', accountId, sinceUnix, mode],
    queryFn: () => fetchPlayerMetrics(sinceUnix, accountId || undefined, mode),
    enabled,
    staleTime: accountId ? 5 * 60 * 1000 : 60 * 60 * 1000,
  })

/** Pass accountId 0 for the population-wide curve (cached long, shared). */
export const usePerformanceCurve = (
  accountId: number,
  sinceUnix = SINCE_30D,
  mode: ModeFilterValue = 'all',
) =>
  useQuery({
    queryKey: ['performanceCurve', accountId, sinceUnix, mode],
    queryFn: () => fetchPerformanceCurve(sinceUnix, accountId || undefined, mode),
    staleTime: accountId ? 5 * 60 * 1000 : 60 * 60 * 1000,
  })

export const useMateStats = (accountId: number) =>
  useQuery({
    queryKey: ['mateStats', accountId],
    queryFn: () => fetchMateStats(accountId),
    enabled: accountId > 0,
    staleTime: 5 * 60 * 1000,
  })

export const useEnemyStats = (accountId: number) =>
  useQuery({
    queryKey: ['enemyStats', accountId],
    queryFn: () => fetchEnemyStats(accountId),
    enabled: accountId > 0,
    staleTime: 5 * 60 * 1000,
  })

export const useBuilds = (search: BuildSearch) =>
  useQuery({
    queryKey: ['builds', search],
    queryFn: () => fetchBuilds(search),
    staleTime: 5 * 60 * 1000,
    // keep the previous page on screen while "show more" or a filter refetches
    placeholderData: (prev) => prev,
  })

export const useBuild = (buildId: number, heroId?: number) =>
  useQuery({
    queryKey: ['build', buildId, heroId ?? 0],
    queryFn: () => fetchBuild(buildId, heroId),
    enabled: buildId > 0,
    staleTime: 30 * 60 * 1000,
  })

export const useSteamProfilesBatch = (accountIds: number[]) =>
  useQuery({
    queryKey: ['steamProfiles', accountIds.join(',')],
    queryFn: () => fetchSteamProfiles(accountIds),
    enabled: accountIds.length > 0,
    staleTime: 5 * 60 * 1000,
    select: (profiles): Map<number, SteamProfile> =>
      new Map(profiles.map((p) => [p.account_id, p])),
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
