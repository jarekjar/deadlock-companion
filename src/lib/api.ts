/**
 * Client for the community Deadlock API (https://deadlock-api.com).
 * CORS is open and no key is needed at standard rate limits (100 req/s per IP).
 * Types are trimmed to the fields this app actually reads.
 */
const API_BASE = 'https://api.deadlock-api.com'

export interface MatchHistoryEntry {
  match_id: number
  hero_id: number
  hero_level: number
  start_time: number
  match_mode: number
  player_team: number
  player_kills: number
  player_deaths: number
  player_assists: number
  denies: number
  last_hits: number
  net_worth: number
  match_duration_s: number
  /** The winning team; the player won when this equals player_team. */
  match_result: number
}

export interface PlayerHeroStats {
  hero_id: number
  matches_played: number
  wins: number
  kills: number
  deaths: number
  assists: number
  networth_per_min: number
  last_played: number
  time_played: number
  accuracy: number
}

export interface RankResponse {
  /** tier * 10 + subrank; 0 while unranked. */
  badge: number
  rank: number
  subrank: number
}

export interface SteamProfile {
  account_id: number
  personaname: string
  profileurl: string
  avatar: string
  avatarmedium: string
  avatarfull: string
  matches_played_last_30d: number
}

export interface HeroAsset {
  id: number
  name: string
  player_selectable: boolean
  disabled: boolean
  in_development: boolean
  images: {
    icon_image_small_webp: string
    icon_hero_card_webp: string
    minimap_image_webp: string
  }
}

export interface RankAsset {
  tier: number
  name: string
  color: string
  images: Record<string, string>
}

export interface ItemAsset {
  id: number
  name: string
  type: string
  item_tier?: number
  item_slot_type?: string
  cost?: number
  activation?: string
  is_active_item?: boolean
  image?: string
  shopable?: boolean
  description?: { desc?: string }
}

export interface MatchPlayerStatsSample {
  time_stamp_s: number
  net_worth: number
  player_damage: number
  player_healing: number
  player_damage_taken: number
}

export interface MatchPlayer {
  account_id: number
  team: number
  hero_id: number
  kills: number
  deaths: number
  assists: number
  net_worth: number
  last_hits: number
  denies: number
  level: number
  items: { game_time_s: number; item_id: number; sold_time_s: number }[]
  stats: MatchPlayerStatsSample[]
}

export interface MatchInfo {
  match_id: number
  duration_s: number
  start_time: number
  /** 0 = Amber, 1 = Sapphire. */
  winning_team: number
  average_badge_team0: number | null
  average_badge_team1: number | null
  players: MatchPlayer[]
  mid_boss: { team_killed: number; team_claimed: number; destroyed_time_s: number }[] | null
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) throw new Error(`Deadlock API ${res.status} on ${path}`)
  return res.json() as Promise<T>
}

export const fetchMatchHistory = (accountId: number) =>
  get<MatchHistoryEntry[]>(`/v1/players/${accountId}/match-history`)

export const fetchPlayerHeroStats = (accountId: number) =>
  get<PlayerHeroStats[]>(`/v1/players/hero-stats?account_ids=${accountId}`)

export const fetchRank = (accountId: number) =>
  get<RankResponse>(`/v1/players/${accountId}/rank`)

export const fetchSteamProfiles = (accountIds: number[]) =>
  get<SteamProfile[]>(`/v1/players/steam?account_ids=${accountIds.join(',')}`)

export const searchPlayers = (query: string) =>
  get<SteamProfile[]>(`/v1/players/steam-search?search_query=${encodeURIComponent(query)}&limit=12`)

export const fetchHeroes = () => get<HeroAsset[]>(`/v1/assets/heroes?only_active=true`)

export const fetchItems = () => get<ItemAsset[]>(`/v1/assets/items`)

export interface HeroCounterStat {
  hero_id: number
  enemy_hero_id: number
  wins: number
  matches_played: number
}

export interface AnalyticsHeroStat {
  hero_id: number
  matches: number
  wins: number
}

export interface ItemStat {
  item_id: number
  wins: number
  matches: number
  players: number
  avg_buy_time_s: number
}

export const fetchHeroCounterStats = (sinceUnix: number) =>
  get<HeroCounterStat[]>(`/v1/analytics/hero-counter-stats?min_unix_timestamp=${sinceUnix}`)

export const fetchAnalyticsHeroStats = (sinceUnix: number) =>
  get<AnalyticsHeroStat[]>(`/v1/analytics/hero-stats?min_unix_timestamp=${sinceUnix}`)

export const fetchHeroItemStats = (heroId: number, sinceUnix: number) =>
  get<ItemStat[]>(`/v1/analytics/item-stats?hero_id=${heroId}&min_unix_timestamp=${sinceUnix}`)

export const fetchCounterItemStats = (heroId: number, enemyHeroId: number, sinceUnix: number) =>
  get<ItemStat[]>(
    `/v1/analytics/item-stats?hero_id=${heroId}&enemy_hero_ids=${enemyHeroId}&enemy_hero_ids_all_match=true&min_unix_timestamp=${sinceUnix}`,
  )

export const fetchMatchMetadata = (matchId: number) =>
  get<{ match_info: MatchInfo }>(`/v1/matches/${matchId}/metadata`).then((r) => r.match_info)

export const fetchRankAssets = () => get<RankAsset[]>(`/v1/assets/ranks`)

export const isWin = (m: MatchHistoryEntry) => m.match_result === m.player_team

/**
 * Resolves a Steam vanity name through our own Pages Function. Returns null
 * when the profile doesn't exist or the function isn't available (plain
 * `vite dev`), so callers can fall back to a name search.
 */
export async function resolveVanity(name: string): Promise<number | null> {
  try {
    const res = await fetch(`/api/resolve-vanity?name=${encodeURIComponent(name)}`)
    if (!res.ok) return null
    const body = (await res.json()) as { accountId: number }
    return body.accountId
  } catch {
    return null
  }
}

export function rankName(badge: number, ranks: RankAsset[] | undefined): string {
  if (!badge || !ranks) return 'Unranked'
  const tier = Math.floor(badge / 10)
  const subrank = badge % 10
  const rank = ranks.find((r) => r.tier === tier)
  if (!rank) return 'Unranked'
  return subrank > 0 ? `${rank.name} ${subrank}` : rank.name
}
