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
  /** Valve-reported rank badge after this match; ranked matches only. */
  ranked_display_badge?: number | null
  /** Signed rating change from this match; ranked matches only. */
  ranked_delta?: number | null
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

/**
 * Meta mode bracket, shared with the website. The API's default is
 * ranked+standard matches in the normal game mode; 'ranked' narrows to the
 * ranked queue, 'brawl' switches to the Street Brawl game mode instead.
 */
export type ModeFilterValue = 'all' | 'ranked' | 'brawl'

const modeParam = (mode: ModeFilterValue) =>
  mode === 'ranked' ? '&match_mode=ranked' : mode === 'brawl' ? '&game_mode=street_brawl' : ''

export const fetchHeroCounterStats = (sinceUnix: number, mode: ModeFilterValue = 'all') =>
  get<HeroCounterStat[]>(
    `/v1/analytics/hero-counter-stats?min_unix_timestamp=${sinceUnix}${modeParam(mode)}`,
  )

export const fetchAnalyticsHeroStats = (sinceUnix: number, mode: ModeFilterValue = 'all') =>
  get<AnalyticsHeroStat[]>(
    `/v1/analytics/hero-stats?min_unix_timestamp=${sinceUnix}${modeParam(mode)}`,
  )

export const fetchHeroItemStats = (
  heroId: number,
  sinceUnix: number,
  mode: ModeFilterValue = 'all',
) =>
  get<ItemStat[]>(
    `/v1/analytics/item-stats?hero_id=${heroId}&min_unix_timestamp=${sinceUnix}${modeParam(mode)}`,
  )

/** Global per-item stats over a window: usage and win rate for every item. */
export const fetchAllItemStats = (sinceUnix: number, mode: ModeFilterValue = 'all') =>
  get<ItemStat[]>(`/v1/analytics/item-stats?min_unix_timestamp=${sinceUnix}${modeParam(mode)}`)

/** Per-hero stats restricted to matches where the given item was bought. */
export const fetchHeroStatsWithItem = (
  itemId: number,
  sinceUnix: number,
  mode: ModeFilterValue = 'all',
) =>
  get<AnalyticsHeroStat[]>(
    `/v1/analytics/hero-stats?include_item_ids=${itemId}&min_unix_timestamp=${sinceUnix}${modeParam(mode)}`,
  )

export const fetchCounterItemStats = (
  heroId: number,
  enemyHeroId: number,
  sinceUnix: number,
  mode: ModeFilterValue = 'all',
) =>
  get<ItemStat[]>(
    `/v1/analytics/item-stats?hero_id=${heroId}&enemy_hero_ids=${enemyHeroId}&enemy_hero_ids_all_match=true&min_unix_timestamp=${sinceUnix}${modeParam(mode)}`,
  )

export interface HeroSynergyStat {
  hero_id1: number
  hero_id2: number
  wins: number
  matches_played: number
}

/**
 * Same-team duo win rates. Always called with min_matches and a time filter —
 * the unfiltered query is too heavy and the API answers it with a 500.
 */
export const fetchHeroSynergyStats = (sinceUnix: number, mode: ModeFilterValue = 'all') =>
  get<HeroSynergyStat[]>(
    `/v1/analytics/hero-synergy-stats?min_unix_timestamp=${sinceUnix}&min_matches=50${modeParam(mode)}`,
  )

export interface MateStat {
  mate_id: number
  /** Wins together; win rate = wins / matches_played. */
  wins: number
  matches_played: number
}

export interface EnemyStat {
  enemy_id: number
  /** The player's wins against this opponent. */
  wins: number
  matches_played: number
}

export const fetchMateStats = (accountId: number) =>
  get<MateStat[]>(`/v1/players/${accountId}/mate-stats?min_matches_played=5`)

export const fetchEnemyStats = (accountId: number) =>
  get<EnemyStat[]>(`/v1/players/${accountId}/enemy-stats?min_matches_played=5`)

/* ---- in-game published hero builds ---- */

export interface BuildMod {
  /** Item asset id (same id space as ItemAsset.id). */
  ability_id: number
  annotation?: string | null
  /** > 0 means the author marks this item to sell later. */
  sell_priority?: number | null
}

export interface BuildCategory {
  name?: string | null
  description?: string | null
  mods: BuildMod[]
}

export interface HeroBuildEntry {
  hero_build: {
    hero_id: number
    hero_build_id: number
    author_account_id?: number | null
    last_updated_timestamp?: number | null
    name: string
    description?: string | null
    language?: number | null
    version?: number | null
    details?: { mod_categories?: BuildCategory[] | null } | null
  }
  /** Populated when sorting by the matching favorites flavor, null otherwise. */
  num_favorites?: number | null
  num_weekly_favorites?: number | null
}

export type BuildSort = 'weekly_favorites' | 'favorites' | 'updated_at'

export interface BuildSearch {
  heroId?: number
  sortBy?: BuildSort
  search?: string
  /** Steam language code; 0 = English. Omit for all languages. */
  language?: number
  limit?: number
}

export const fetchBuilds = ({ heroId, sortBy, search, language, limit }: BuildSearch) => {
  const params = new URLSearchParams({
    only_latest: 'true',
    sort_by: sortBy ?? 'weekly_favorites',
    sort_direction: 'desc',
    limit: String(limit ?? 30),
  })
  if (heroId) params.set('hero_id', String(heroId))
  if (search) params.set('search_name', search)
  if (language !== undefined) params.set('language', String(language))
  return get<HeroBuildEntry[]>(`/v1/builds?${params}`)
}

/**
 * Build ids are not unique across languages, so the detail view takes the
 * most-iterated entry (highest version), preferring the given hero when the
 * link carried one.
 */
export const fetchBuild = (buildId: number, heroId?: number) =>
  get<HeroBuildEntry[]>(`/v1/builds?build_id=${buildId}&only_latest=true`).then((rows) => {
    const pool = heroId ? rows.filter((r) => r.hero_build.hero_id === heroId) : rows
    return (
      [...(pool.length > 0 ? pool : rows)].sort(
        (a, b) => (b.hero_build.version ?? 0) - (a.hero_build.version ?? 0),
      )[0] ?? null
    )
  })

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

/**
 * Badges are tier*10+subrank with six subranks per tier; comparisons and
 * charting happen on this linearized index.
 */
export const badgeToIndex = (badge: number) => Math.floor(badge / 10) * 6 + ((badge % 10) - 1)

export const indexToBadge = (index: number) => Math.floor(index / 6) * 10 + (index % 6) + 1
