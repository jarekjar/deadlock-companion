import { useQueries, useQuery } from '@tanstack/react-query'
import {
  fetchAbilityOrderStats,
  fetchActiveMatches,
  fetchActiveMatchForPlayer,
  fetchAllItemStats,
  fetchAnalyticsHeroStats,
  fetchBuild,
  fetchBuilds,
  fetchCounterItemStats,
  fetchEnemyStats,
  fetchHeroScoreboard,
  fetchHeroStatsBetween,
  fetchHeroCounterStats,
  fetchHeroes,
  fetchHeroItemStats,
  fetchHeroStatsWithItem,
  fetchHeroSynergyStats,
  fetchItems,
  fetchItemStatsBetween,
  fetchItemTimingStats,
  fetchLeaderboard,
  fetchMapAsset,
  fetchMatchHistory,
  fetchMatchMetadata,
  fetchMateStats,
  fetchPatches,
  fetchPerformanceCurve,
  fetchPlayerMetrics,
  fetchPlayerScoreboard,
  fetchPlayerHeroStats,
  fetchPlayerItemStats,
  fetchRank,
  fetchRankAssets,
  fetchRankDistribution,
  fetchSteamProfiles,
  searchPlayers,
  type BuildSearch,
  type HeroAsset,
  type ItemAsset,
  type LeaderboardRegion,
  type ModeFilterValue,
  type ScoreboardQuery,
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
    staleTime: 5 * 60 * 1000,
  })

export const useEnemyStats = (accountId: number) =>
  useQuery({
    queryKey: ['enemyStats', accountId],
    queryFn: () => fetchEnemyStats(accountId),
    staleTime: 5 * 60 * 1000,
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

export const useHeroAnalytics = (minBadge = 0, mode: ModeFilterValue = 'all') =>
  useQuery({
    queryKey: ['heroAnalytics', SINCE_30D, minBadge, mode],
    queryFn: () => fetchAnalyticsHeroStats(SINCE_30D, minBadge, mode),
    staleTime: 30 * 60 * 1000,
  })

export const useHeroCounters = (minBadge = 0, mode: ModeFilterValue = 'all') =>
  useQuery({
    queryKey: ['heroCounters', SINCE_30D, minBadge, mode],
    queryFn: () => fetchHeroCounterStats(SINCE_30D, minBadge, mode),
    staleTime: 30 * 60 * 1000,
  })

export const useHeroSynergies = (minBadge = 0, mode: ModeFilterValue = 'all') =>
  useQuery({
    queryKey: ['heroSynergies', SINCE_30D, minBadge, mode],
    queryFn: () => fetchHeroSynergyStats(SINCE_30D, minBadge, mode),
    staleTime: 30 * 60 * 1000,
  })

export const useHeroItemStats = (heroId: number, minBadge = 0, mode: ModeFilterValue = 'all') =>
  useQuery({
    queryKey: ['heroItemStats', heroId, SINCE_30D, minBadge, mode],
    queryFn: () => fetchHeroItemStats(heroId, SINCE_30D, minBadge, mode),
    enabled: heroId > 0,
    staleTime: 30 * 60 * 1000,
  })

export const useAbilityOrders = (heroId: number, minBadge = 0, mode: ModeFilterValue = 'all') =>
  useQuery({
    queryKey: ['abilityOrders', heroId, SINCE_30D, minBadge, mode],
    queryFn: () => fetchAbilityOrderStats(heroId, SINCE_30D, minBadge, mode),
    enabled: heroId > 0,
    staleTime: 30 * 60 * 1000,
  })

export const useCounterItems = (
  heroId: number,
  enemyHeroId: number | null,
  minBadge = 0,
  mode: ModeFilterValue = 'all',
) =>
  useQuery({
    queryKey: ['counterItems', heroId, enemyHeroId, SINCE_30D, minBadge, mode],
    queryFn: () => fetchCounterItemStats(heroId, enemyHeroId!, SINCE_30D, minBadge, mode),
    enabled: heroId > 0 && enemyHeroId !== null,
    staleTime: 30 * 60 * 1000,
  })

export const useAllItemStats = (minBadge = 0, mode: ModeFilterValue = 'all') =>
  useQuery({
    queryKey: ['allItemStats', SINCE_30D, minBadge, mode],
    queryFn: () => fetchAllItemStats(SINCE_30D, minBadge, mode),
    staleTime: 30 * 60 * 1000,
  })

export const useHeroStatsWithItem = (itemId: number, minBadge = 0, mode: ModeFilterValue = 'all') =>
  useQuery({
    queryKey: ['heroStatsWithItem', itemId, SINCE_30D, minBadge, mode],
    queryFn: () => fetchHeroStatsWithItem(itemId, SINCE_30D, minBadge, mode),
    enabled: itemId > 0,
    staleTime: 30 * 60 * 1000,
  })

export const useItemTiming = (itemId: number, minBadge = 0, mode: ModeFilterValue = 'all') =>
  useQuery({
    queryKey: ['itemTiming', itemId, SINCE_30D, minBadge, mode],
    queryFn: () => fetchItemTimingStats(itemId, SINCE_30D, minBadge, mode),
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

export const usePatches = () =>
  useQuery({
    queryKey: ['patches'],
    queryFn: fetchPatches,
    staleTime: 60 * 60 * 1000,
  })

export const useHeroStatsBetween = (fromUnix: number, toUnix: number, minBadge = 0) =>
  useQuery({
    queryKey: ['heroStatsBetween', fromUnix, toUnix, minBadge],
    queryFn: () => fetchHeroStatsBetween(fromUnix, toUnix, minBadge),
    enabled: fromUnix > 0 && toUnix > fromUnix,
    staleTime: 30 * 60 * 1000,
  })

export const useItemStatsBetween = (fromUnix: number, toUnix: number, minBadge = 0) =>
  useQuery({
    queryKey: ['itemStatsBetween', fromUnix, toUnix, minBadge],
    queryFn: () => fetchItemStatsBetween(fromUnix, toUnix, minBadge),
    enabled: fromUnix > 0 && toUnix > fromUnix,
    staleTime: 30 * 60 * 1000,
  })

export const usePlayerScoreboard = (query: ScoreboardQuery, enabled = true) =>
  useQuery({
    queryKey: ['playerScoreboard', query],
    queryFn: () => fetchPlayerScoreboard(query),
    enabled,
    staleTime: 30 * 60 * 1000,
    placeholderData: (prev) => prev,
  })

export const useHeroScoreboard = (query: ScoreboardQuery, enabled = true) =>
  useQuery({
    queryKey: ['heroScoreboard', query],
    queryFn: () => fetchHeroScoreboard(query),
    enabled,
    staleTime: 30 * 60 * 1000,
    placeholderData: (prev) => prev,
  })
