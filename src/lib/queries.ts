import { useQuery } from '@tanstack/react-query'
import {
  fetchHeroes,
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

export const usePlayerSearch = (query: string) =>
  useQuery({
    queryKey: ['playerSearch', query],
    queryFn: () => searchPlayers(query),
    enabled: query.length > 0,
    staleTime: 60 * 1000,
  })
