import { useQueries, useQuery } from '@tanstack/react-query'
import {
  fetchAbilityOrderStats,
  fetchActiveMatches,
  fetchActiveMatchForPlayer,
  fetchAllItemStats,
  fetchAnalyticsHeroStats,
  fetchCounterItemStats,
  fetchHeroCounterStats,
  fetchHeroes,
  fetchHeroItemStats,
  fetchHeroStatsWithItem,
  fetchItems,
  fetchLeaderboard,
  fetchMapAsset,
  fetchMatchHistory,
  fetchMatchMetadata,
  fetchPlayerHeroStats,
  fetchPlayerItemStats,
  fetchRank,
  fetchRankAssets,
  fetchRankDistribution,
  fetchSteamProfiles,
  searchPlayers,
  type HeroAsset,
  type ItemAsset,
  type LeaderboardRegion,
  type SteamProfile,
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

export function useRankAssets() {
  return useQuery({
    queryKey: ['rankAssets'],
    queryFn: fetchRankAssets,
    staleTime: FOREVER,
    gcTime: FOREVER,
  })
}

export const useMatchHistory = (accountId: number) =>
  useQuery({
    queryKey: ['matchHistory', accountId],
    queryFn: () => fetchMatchHistory(accountId),
    staleTime: 60 * 1000,
  })

export const usePlayerHeroStats = (accountId: number) =>
  useQuery({
    queryKey: ['playerHeroStats', accountId],
    queryFn: () => fetchPlayerHeroStats(accountId),
    staleTime: 60 * 1000,
  })

export const useRank = (accountId: number) =>
  useQuery({
    queryKey: ['rank', accountId],
    queryFn: () => fetchRank(accountId),
    staleTime: 5 * 60 * 1000,
  })

export const useSteamProfile = (accountId: number) =>
  useQuery({
    queryKey: ['steamProfile', accountId],
    queryFn: async () => (await fetchSteamProfiles([accountId]))[0] ?? null,
    staleTime: 5 * 60 * 1000,
  })

export function useItems() {
  return useQuery({
    queryKey: ['items'],
    queryFn: fetchItems,
    staleTime: FOREVER,
    gcTime: FOREVER,
    select: (items): Map<number, ItemAsset> => new Map(items.map((i) => [i.id, i])),
  })
}

/** Same items query, keyed by class_name — abilities are referenced this way. */
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

export const useMatchMetadata = (matchId: number) =>
  useQuery({
    queryKey: ['matchMetadata', matchId],
    queryFn: () => fetchMatchMetadata(matchId),
    staleTime: FOREVER,
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

/** Per-player ranks, fanned out through the query cache (batch MMR is deprecated). */
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

export const useHeroAnalytics = (minBadge = 0) =>
  useQuery({
    queryKey: ['heroAnalytics', SINCE_30D, minBadge],
    queryFn: () => fetchAnalyticsHeroStats(SINCE_30D, minBadge),
    staleTime: 30 * 60 * 1000,
  })

export const useHeroCounters = (minBadge = 0) =>
  useQuery({
    queryKey: ['heroCounters', SINCE_30D, minBadge],
    queryFn: () => fetchHeroCounterStats(SINCE_30D, minBadge),
    staleTime: 30 * 60 * 1000,
  })

export const useHeroItemStats = (heroId: number, minBadge = 0) =>
  useQuery({
    queryKey: ['heroItemStats', heroId, SINCE_30D, minBadge],
    queryFn: () => fetchHeroItemStats(heroId, SINCE_30D, minBadge),
    enabled: heroId > 0,
    staleTime: 30 * 60 * 1000,
  })

export const useAbilityOrders = (heroId: number, minBadge = 0) =>
  useQuery({
    queryKey: ['abilityOrders', heroId, SINCE_30D, minBadge],
    queryFn: () => fetchAbilityOrderStats(heroId, SINCE_30D, minBadge),
    enabled: heroId > 0,
    staleTime: 30 * 60 * 1000,
  })

export const useCounterItems = (heroId: number, enemyHeroId: number | null, minBadge = 0) =>
  useQuery({
    queryKey: ['counterItems', heroId, enemyHeroId, SINCE_30D, minBadge],
    queryFn: () => fetchCounterItemStats(heroId, enemyHeroId!, SINCE_30D, minBadge),
    enabled: heroId > 0 && enemyHeroId !== null,
    staleTime: 30 * 60 * 1000,
  })

export const useAllItemStats = (minBadge = 0) =>
  useQuery({
    queryKey: ['allItemStats', SINCE_30D, minBadge],
    queryFn: () => fetchAllItemStats(SINCE_30D, minBadge),
    staleTime: 30 * 60 * 1000,
  })

export const useHeroStatsWithItem = (itemId: number, minBadge = 0) =>
  useQuery({
    queryKey: ['heroStatsWithItem', itemId, SINCE_30D, minBadge],
    queryFn: () => fetchHeroStatsWithItem(itemId, SINCE_30D, minBadge),
    enabled: itemId > 0,
    staleTime: 30 * 60 * 1000,
  })

export const usePlayerItemStats = (accountId: number) =>
  useQuery({
    queryKey: ['playerItemStats', accountId],
    queryFn: () => fetchPlayerItemStats(accountId),
    staleTime: 5 * 60 * 1000,
  })

export const useLeaderboard = (region: LeaderboardRegion) =>
  useQuery({
    queryKey: ['leaderboard', region],
    queryFn: () => fetchLeaderboard(region),
    staleTime: 5 * 60 * 1000,
  })

export const useRankDistribution = () =>
  useQuery({
    queryKey: ['rankDistribution'],
    queryFn: fetchRankDistribution,
    staleTime: 60 * 60 * 1000,
  })

export const useMapAsset = () =>
  useQuery({
    queryKey: ['mapAsset'],
    queryFn: fetchMapAsset,
    staleTime: FOREVER,
    gcTime: FOREVER,
  })

export const useActiveMatches = () =>
  useQuery({
    queryKey: ['activeMatches'],
    queryFn: fetchActiveMatches,
    refetchInterval: 30 * 1000,
    staleTime: 25 * 1000,
  })

export const useLiveMatchForPlayer = (accountId: number) =>
  useQuery({
    queryKey: ['liveMatch', accountId],
    queryFn: () => fetchActiveMatchForPlayer(accountId),
    enabled: accountId > 0,
    refetchInterval: 60 * 1000,
    staleTime: 50 * 1000,
    retry: false,
  })

export const usePlayerSearch = (query: string) =>
  useQuery({
    queryKey: ['playerSearch', query],
    queryFn: () => searchPlayers(query),
    enabled: query.length > 0,
    staleTime: 60 * 1000,
  })
