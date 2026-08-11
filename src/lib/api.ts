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
  /** 1 = simple, 3 = most complex (the in-game picker's difficulty dots). */
  complexity: number
  player_selectable: boolean
  disabled: boolean
  in_development: boolean
  description?: { lore?: string; role?: string; playstyle?: string }
  /** "marksman" | "mystic" | "brawler" | "assassin" — missing for a few heroes. */
  hero_type?: string
  tags?: string[]
  /** Slot -> ability class_name; signatures are "signature1".."signature4". */
  items?: Record<string, string>
  scaling_stats?: Record<string, { scaling_stat?: string; scale?: number }>
  standard_level_up_upgrades?: Record<string, number>
  starting_stats?: Record<string, { value?: number } | undefined>
  images: {
    icon_image_small_webp: string
    icon_hero_card_webp: string
    minimap_image_webp: string
    /** Large poster art used by the in-game hero background. */
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
  properties?: Record<string, { value?: unknown } | undefined>
  /** Ability rank-ups (3 tiers, costing 1/2/5 ability points). */
  upgrades?: { property_upgrades?: { name: string; bonus?: string }[] }[]
  /** Present on hero primary weapons: bullet damage, clip, fire rate, ... */
  weapon_info?: Record<string, unknown>
  item_tier?: number
  item_slot_type?: string
  cost?: number
  activation?: string
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
    item.cost != null && `${item.cost.toLocaleString()} souls`,
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

/** Global per-item stats over a window: usage and win rate for every item. */
export const fetchAllItemStats = (sinceUnix: number) =>
  get<ItemStat[]>(`/v1/analytics/item-stats?min_unix_timestamp=${sinceUnix}`)

/** Per-hero stats restricted to matches where the given item was bought. */
export const fetchHeroStatsWithItem = (itemId: number, sinceUnix: number) =>
  get<AnalyticsHeroStat[]>(
    `/v1/analytics/hero-stats?include_item_ids=${itemId}&min_unix_timestamp=${sinceUnix}`,
  )

/** Lifetime item usage for one player — the basis for "favorite items". */
export const fetchPlayerItemStats = (accountId: number) =>
  get<ItemStat[]>(`/v1/analytics/item-stats?account_ids=${accountId}&min_matches=1`)

export const fetchCounterItemStats = (heroId: number, enemyHeroId: number, sinceUnix: number) =>
  get<ItemStat[]>(
    `/v1/analytics/item-stats?hero_id=${heroId}&enemy_hero_ids=${enemyHeroId}&enemy_hero_ids_all_match=true&min_unix_timestamp=${sinceUnix}`,
  )

export const fetchMatchMetadata = (matchId: number) =>
  get<{ match_info: MatchInfo }>(`/v1/matches/${matchId}/metadata`).then((r) => r.match_info)

export interface ActiveMatch {
  match_id: number
  /** Unix seconds; live game time is roughly now - start_time. */
  start_time: number
  net_worth_team_0: number
  net_worth_team_1: number
  spectators: number
  match_mode_parsed: string | null
  region_mode_parsed: string | null
  /** Bitmask of objectives still standing (16 bits, all set at match start). */
  objectives_mask_team0: number
  objectives_mask_team1: number
  players: { account_id: number; team: number; hero_id: number }[]
}

/** Count of objectives still standing in an objectives mask. */
export function objectivesStanding(mask: number): number {
  let count = 0
  for (let m = mask >>> 0; m; m >>>= 1) count += m & 1
  return count
}

export interface MapAsset {
  images: {
    minimap: string
    plain: string
    mid: string
  }
}

export const fetchMapAsset = () => get<MapAsset>(`/v1/assets/map`)

/**
 * Live matches, sourced from the in-game Watch tab — only the top ~200
 * spectate-able matches are visible, so low-profile games may be absent.
 */
export const fetchActiveMatches = () => get<ActiveMatch[]>(`/v1/matches/active`)

export const fetchActiveMatchForPlayer = (accountId: number) =>
  get<ActiveMatch[]>(`/v1/matches/active?account_id=${accountId}`).then((r) => r[0] ?? null)

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

/**
 * Average of visible rank badges. Badges are tier*10+subrank with six subranks
 * per tier, so averaging happens on a linearized index.
 */
export function averageBadge(badges: number[]): number | null {
  const valid = badges.filter((b) => b > 0)
  if (valid.length === 0) return null
  const mean =
    valid.reduce((s, b) => s + Math.floor(b / 10) * 6 + ((b % 10) - 1), 0) / valid.length
  const index = Math.round(mean)
  return Math.floor(index / 6) * 10 + (index % 6) + 1
}

export function rankName(badge: number, ranks: RankAsset[] | undefined): string {
  if (!badge || !ranks) return 'Unranked'
  const tier = Math.floor(badge / 10)
  const subrank = badge % 10
  const rank = ranks.find((r) => r.tier === tier)
  if (!rank) return 'Unranked'
  return subrank > 0 ? `${rank.name} ${subrank}` : rank.name
}
