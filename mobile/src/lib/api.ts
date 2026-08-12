/**
 * Client for the community Deadlock API (https://deadlock-api.com), shared
 * with the website. Native fetch has no CORS layer, so everything is called
 * directly; the one website function (vanity resolution) is called absolutely.
 */
const API_BASE = 'https://api.deadlock-api.com'
const SITE_BASE = 'https://thecursedapple.app'

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
  complexity: number
  player_selectable: boolean
  disabled: boolean
  in_development: boolean
  description?: { lore?: string; role?: string; playstyle?: string }
  hero_type?: string
  /** Slot -> ability class_name; signatures are "signature1".."signature4". */
  items?: Record<string, string>
  images: {
    icon_image_small_webp: string
    icon_hero_card_webp: string
    minimap_image_webp: string
    background_image_webp?: string
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
  class_name?: string
  type: string
  item_tier?: number
  item_slot_type?: string
  cost?: number
  is_active_item?: boolean
  image?: string
  image_webp?: string
  shop_image?: string
  shop_image_webp?: string
  shopable?: boolean
  description?: { desc?: string }
}

/** The in-game shop tile art; falls back to the flat white mod glyph. */
export function itemIcon(item: ItemAsset): string | undefined {
  return item.shop_image_webp ?? item.shop_image ?? item.image_webp ?? item.image
}

const TIER_ROMAN = ['I', 'II', 'III', 'IV']

/** "Tier II · vitality · 1,600 souls · passive" */
export function itemMeta(item: ItemAsset): string {
  const tier = TIER_ROMAN[(item.item_tier ?? 1) - 1] ?? ''
  return [
    tier && `Tier ${tier}`,
    item.item_slot_type,
    item.cost != null && `${item.cost} souls`,
    item.is_active_item ? 'active' : 'passive',
  ]
    .filter(Boolean)
    .join(' · ')
}

/** Plain-text item/ability description (the asset ships HTML with inline SVGs). */
export function itemDescription(item: ItemAsset): string {
  return (item.description?.desc ?? '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
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

export const fetchRankAssets = () => get<RankAsset[]>(`/v1/assets/ranks`)

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

/** Global per-item stats over a window: usage and win rate for every item. */
export const fetchAllItemStats = (sinceUnix: number) =>
  get<ItemStat[]>(`/v1/analytics/item-stats?min_unix_timestamp=${sinceUnix}`)

/** Per-hero stats restricted to matches where the given item was bought. */
export const fetchHeroStatsWithItem = (itemId: number, sinceUnix: number) =>
  get<AnalyticsHeroStat[]>(
    `/v1/analytics/hero-stats?include_item_ids=${itemId}&min_unix_timestamp=${sinceUnix}`,
  )

export const fetchCounterItemStats = (heroId: number, enemyHeroId: number, sinceUnix: number) =>
  get<ItemStat[]>(
    `/v1/analytics/item-stats?hero_id=${heroId}&enemy_hero_ids=${enemyHeroId}&enemy_hero_ids_all_match=true&min_unix_timestamp=${sinceUnix}`,
  )

export const isWin = (m: MatchHistoryEntry) => m.match_result === m.player_team

/**
 * Resolves a Steam vanity name through the website's Pages Function
 * (steamcommunity.com blocks direct reads). Null = not found / offline.
 */
export async function resolveVanity(name: string): Promise<number | null> {
  try {
    const res = await fetch(`${SITE_BASE}/api/resolve-vanity?name=${encodeURIComponent(name)}`)
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
