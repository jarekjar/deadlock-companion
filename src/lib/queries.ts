import { useQueries, useQuery } from '@tanstack/react-query'
import {
  fetchActiveMatches,
  fetchActiveMatchForPlayer,
  fetchAnalyticsHeroStats,
  fetchCounterItemStats,
  fetchHeroCounterStats,
  fetchHeroes,
  fetchHeroItemStats,
  fetchItems,
  fetchMatchHistory,
  fetchMatchMetadata,
  fetchPlayerHeroStats,
  fetchRank,
  fetchRankAssets,
  fetchSteamProfiles,
  searchPlayers,
  type HeroAsset,
  type ItemAsset,
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
