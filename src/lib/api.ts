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
  /** 1 = normal, 4 = Street Brawl. (match_mode: 1 = standard, 4 = ranked.) */
  game_mode: number
  /** The winning team; the player won when this equals player_team. */
  match_result: number
  /** Valve-reported rank badge after this match; ranked matches only. */
  ranked_display_badge?: number | null
  /** Signed rating change from this match; ranked matches only. */
  ranked_delta?: number | null
}

/**
 * Which queue a history entry came from, derived from the numeric enums
 * (game_mode 4 = Street Brawl, match_mode 4 = ranked, 1 = standard).
 */
export function matchModeOf(m: MatchHistoryEntry): 'ranked' | 'standard' | 'brawl' | 'other' {
  if (m.game_mode === 4) return 'brawl'
  if (m.match_mode === 4) return 'ranked'
  if (m.match_mode === 1) return 'standard'
  return 'other'
}

export const MATCH_MODE_LABELS: Record<string, string> = {
  ranked: 'Ranked',
  standard: 'Standard',
  brawl: 'Brawl',
  other: 'Other',
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
  /** Totals across all matches of the pair — divide by matches_played. */
  kills: number
  deaths: number
  assists: number
  denies: number
  networth: number
  obj_damage: number
  enemy_kills: number
  enemy_deaths: number
  enemy_assists: number
  enemy_denies: number
  enemy_networth: number
  enemy_obj_damage: number
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

/** `&min_average_badge=71` etc.; empty for all ranks. */
const badgeParam = (minBadge: number) => (minBadge > 0 ? `&min_average_badge=${minBadge}` : '')

/**
 * Meta-page mode bracket. The API's default is ranked+standard matches in the
 * normal game mode; 'ranked' narrows to the ranked queue, 'brawl' switches to
 * the Street Brawl game mode instead.
 */
export type ModeFilterValue = 'all' | 'ranked' | 'standard' | 'brawl'

const modeParam = (mode: ModeFilterValue) =>
  mode === 'ranked'
    ? '&match_mode=ranked'
    : mode === 'standard'
      ? '&match_mode=unranked'
      : mode === 'brawl'
        ? '&game_mode=street_brawl'
        : ''

export const fetchHeroCounterStats = (
  sinceUnix: number,
  minBadge = 0,
  mode: ModeFilterValue = 'all',
) =>
  get<HeroCounterStat[]>(
    `/v1/analytics/hero-counter-stats?min_unix_timestamp=${sinceUnix}${badgeParam(minBadge)}${modeParam(mode)}`,
  )

export const fetchAnalyticsHeroStats = (
  sinceUnix: number,
  minBadge = 0,
  mode: ModeFilterValue = 'all',
) =>
  get<AnalyticsHeroStat[]>(
    `/v1/analytics/hero-stats?min_unix_timestamp=${sinceUnix}${badgeParam(minBadge)}${modeParam(mode)}`,
  )

export const fetchHeroItemStats = (
  heroId: number,
  sinceUnix: number,
  minBadge = 0,
  mode: ModeFilterValue = 'all',
) =>
  get<ItemStat[]>(
    `/v1/analytics/item-stats?hero_id=${heroId}&min_unix_timestamp=${sinceUnix}${badgeParam(minBadge)}${modeParam(mode)}`,
  )

export interface AbilityOrderStat {
  abilities: number[]
  matches: number
  wins: number
}

export const fetchAbilityOrderStats = (
  heroId: number,
  sinceUnix: number,
  minBadge = 0,
  mode: ModeFilterValue = 'all',
) =>
  get<AbilityOrderStat[]>(
    `/v1/analytics/ability-order-stats?hero_id=${heroId}&min_unix_timestamp=${sinceUnix}&min_matches=100${badgeParam(minBadge)}${modeParam(mode)}`,
  )

/** Global per-item stats over a window: usage and win rate for every item. */
export const fetchAllItemStats = (sinceUnix: number, minBadge = 0, mode: ModeFilterValue = 'all') =>
  get<ItemStat[]>(
    `/v1/analytics/item-stats?min_unix_timestamp=${sinceUnix}${badgeParam(minBadge)}${modeParam(mode)}`,
  )

/** Per-hero stats restricted to matches where the given item was bought. */
export const fetchHeroStatsWithItem = (
  itemId: number,
  sinceUnix: number,
  minBadge = 0,
  mode: ModeFilterValue = 'all',
) =>
  get<AnalyticsHeroStat[]>(
    `/v1/analytics/hero-stats?include_item_ids=${itemId}&min_unix_timestamp=${sinceUnix}${badgeParam(minBadge)}${modeParam(mode)}`,
  )

/** Lifetime item usage for one player — the basis for "favorite items". */
export const fetchPlayerItemStats = (accountId: number) =>
  get<ItemStat[]>(`/v1/analytics/item-stats?account_ids=${accountId}&min_matches=1`)

export const fetchCounterItemStats = (
  heroId: number,
  enemyHeroId: number,
  sinceUnix: number,
  minBadge = 0,
  mode: ModeFilterValue = 'all',
) =>
  get<ItemStat[]>(
    `/v1/analytics/item-stats?hero_id=${heroId}&enemy_hero_ids=${enemyHeroId}&enemy_hero_ids_all_match=true&min_unix_timestamp=${sinceUnix}${badgeParam(minBadge)}${modeParam(mode)}`,
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
export const fetchHeroSynergyStats = (
  sinceUnix: number,
  minBadge = 0,
  mode: ModeFilterValue = 'all',
) =>
  get<HeroSynergyStat[]>(
    `/v1/analytics/hero-synergy-stats?min_unix_timestamp=${sinceUnix}&min_matches=50${badgeParam(minBadge)}${modeParam(mode)}`,
  )

export const fetchMatchMetadata = (matchId: number) =>
  get<{ match_info: MatchInfo }>(`/v1/matches/${matchId}/metadata`).then((r) => r.match_info)

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

/* ---- patches ---- */

export interface PatchNote {
  title: string
  /** RFC 2822 date string from the forum RSS feed. */
  pub_date: string
  link: string
}

export const fetchPatches = () => get<PatchNote[]>(`/v1/patches`)

/** Hero stats within an explicit window — the patch report's before/after. */
export const fetchHeroStatsBetween = (fromUnix: number, toUnix: number, minBadge = 0) =>
  get<AnalyticsHeroStat[]>(
    `/v1/analytics/hero-stats?min_unix_timestamp=${fromUnix}&max_unix_timestamp=${toUnix}${badgeParam(minBadge)}`,
  )

/** Item stats within an explicit window — the patch report's before/after. */
export const fetchItemStatsBetween = (fromUnix: number, toUnix: number, minBadge = 0) =>
  get<ItemStat[]>(
    `/v1/analytics/item-stats?min_unix_timestamp=${fromUnix}&max_unix_timestamp=${toUnix}${badgeParam(minBadge)}`,
  )

/* ---- records scoreboards ---- */

export interface ScoreboardPlayerRow {
  rank: number
  account_id: number
  value: number
  matches: number
}

export interface ScoreboardHeroRow {
  rank: number
  hero_id: number
  value: number
  matches: number
}

export interface ScoreboardQuery {
  sortBy: string
  heroId?: number
  minBadge?: number
  sinceUnix?: number
  minMatches?: number
  limit?: number
}

const scoreboardParams = ({ sortBy, heroId, minBadge, sinceUnix, minMatches, limit }: ScoreboardQuery) => {
  const params = new URLSearchParams({
    sort_by: sortBy,
    sort_direction: 'desc',
    limit: String(limit ?? 50),
  })
  if (heroId) params.set('hero_id', String(heroId))
  if (minBadge) params.set('min_average_badge', String(minBadge))
  if (sinceUnix) params.set('min_unix_timestamp', String(sinceUnix))
  if (minMatches) params.set('min_matches', String(minMatches))
  return params
}

export interface ItemTimingBucket {
  item_id: number
  /** Minute of the match in which the item was bought. */
  bucket: number
  wins: number
  matches: number
}

/**
 * Win rate by purchase minute for one item. The endpoint can only filter
 * matches (not output rows), so the response covers every item in matches
 * containing this one — trimmed back down to the item client-side.
 */
export const fetchItemTimingStats = (
  itemId: number,
  sinceUnix: number,
  minBadge = 0,
  mode: ModeFilterValue = 'all',
) =>
  get<ItemTimingBucket[]>(
    `/v1/analytics/item-stats?bucket=game_time_min&include_item_ids=${itemId}&min_unix_timestamp=${sinceUnix}&min_matches=200${badgeParam(minBadge)}${modeParam(mode)}`,
  ).then((rows) => rows.filter((r) => r.item_id === itemId))

/* ---- player performance analytics ---- */

/**
 * Distribution stats for one metric (kda, accuracy, net_worth_per_min, ...).
 * Every field is null when the queried slice contains no matches.
 */
export interface MetricStats {
  avg: number | null
  std: number | null
  percentile1: number | null
  percentile5: number | null
  percentile10: number | null
  percentile25: number | null
  percentile50: number | null
  percentile75: number | null
  percentile90: number | null
  percentile95: number | null
  percentile99: number | null
}

/** Narrow a metric to one that actually has data behind it. */
export function metricHasData(
  stats: MetricStats | undefined,
): stats is MetricStats & { avg: number; percentile50: number } {
  return stats != null && stats.avg != null && stats.percentile50 != null
}

export type PlayerMetrics = Record<string, MetricStats>

/**
 * Per-metric averages and percentiles. With an accountId the stats cover only
 * that player's matches; without one they describe the whole population —
 * comparing the two is what places a player on the global curve.
 */
const modeSearchParams = (params: URLSearchParams, mode: ModeFilterValue) => {
  if (mode === 'ranked') params.set('match_mode', 'ranked')
  if (mode === 'standard') params.set('match_mode', 'unranked')
  if (mode === 'brawl') params.set('game_mode', 'street_brawl')
}

export const fetchPlayerMetrics = (
  sinceUnix: number,
  accountId?: number,
  mode: ModeFilterValue = 'all',
) => {
  const params = new URLSearchParams()
  // always sent explicitly: an omitted timestamp silently defaults to 30 days
  params.set('min_unix_timestamp', String(Math.max(0, sinceUnix)))
  if (accountId) params.set('account_ids', String(accountId))
  modeSearchParams(params, mode)
  return get<PlayerMetrics>(`/v1/analytics/player-stats/metrics?${params}`)
}

/** One time-bucket of the souls/KDA curve; gold_* fields are souls by source. */
export interface PerformanceCurvePoint {
  /** Game time in minutes (bucketed). */
  game_time: number
  net_worth_avg: number
  kills_avg: number
  deaths_avg: number
  assists_avg: number
  gold_player_avg: number
  gold_player_orbs_avg: number
  gold_lane_creep_avg: number
  gold_lane_creep_orbs_avg: number
  gold_neutral_creep_avg: number
  gold_neutral_creep_orbs_avg: number
  gold_boss_avg: number
  gold_boss_orb_avg: number
  gold_treasure_avg: number
  gold_denied_avg: number
  gold_death_loss_avg: number
}

export const fetchPerformanceCurve = (
  sinceUnix: number,
  accountId?: number,
  mode: ModeFilterValue = 'all',
) => {
  const params = new URLSearchParams({ resolution: '2' })
  // always sent explicitly: an omitted timestamp silently defaults to 30 days
  params.set('min_unix_timestamp', String(Math.max(0, sinceUnix)))
  if (accountId) params.set('account_ids', String(accountId))
  modeSearchParams(params, mode)
  return get<PerformanceCurvePoint[]>(`/v1/analytics/player-performance-curve?${params}`)
}

/* ---- match salts ingest (the "sync from Steam cache" flow) ---- */

export interface MatchSalt {
  match_id: number
  cluster_id?: number | null
  metadata_salt?: number | null
  replay_salt?: number | null
  username?: string | null
}

/**
 * Submits match salts so the API can fetch those matches' metadata — this is
 * how matches that were never spectated become tracked.
 */
export async function postMatchSalts(salts: MatchSalt[]): Promise<void> {
  const res = await fetch(`${API_BASE}/v1/matches/salts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(salts),
  })
  if (!res.ok) throw new Error(`Salts ingest failed with ${res.status}`)
}

export const fetchPlayerScoreboard = (query: ScoreboardQuery) =>
  get<ScoreboardPlayerRow[]>(`/v1/analytics/scoreboards/players?${scoreboardParams(query)}`)

export const fetchHeroScoreboard = (query: ScoreboardQuery) =>
  get<ScoreboardHeroRow[]>(`/v1/analytics/scoreboards/heroes?${scoreboardParams(query)}`)

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

export const LEADERBOARD_REGIONS = ['NAmerica', 'Europe', 'Asia', 'SAmerica', 'Oceania'] as const
export type LeaderboardRegion = (typeof LEADERBOARD_REGIONS)[number]

export interface LeaderboardEntry {
  account_name: string
  /** The leaderboard is name-based; the ids are best-effort matches. */
  possible_account_ids: number[]
  rank: number
  top_hero_ids: number[]
}

export const fetchLeaderboard = (region: LeaderboardRegion) =>
  get<{ entries: LeaderboardEntry[] }>(`/v1/leaderboard/${region}`).then((r) => r.entries)

export interface RankDistributionBucket {
  /** Badge number: tier * 10 + subrank. */
  rank: number
  players: number
}

export const fetchRankDistribution = () =>
  get<RankDistributionBucket[]>(`/v1/players/mmr/distribution`)

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
 * Badges are tier*10+subrank with six subranks per tier; comparisons and
 * averaging happen on this linearized index.
 */
export const badgeToIndex = (badge: number) => Math.floor(badge / 10) * 6 + ((badge % 10) - 1)

export const indexToBadge = (index: number) => Math.floor(index / 6) * 10 + (index % 6) + 1

/** Average of visible rank badges, computed on the linearized index. */
export function averageBadge(badges: number[]): number | null {
  const valid = badges.filter((b) => b > 0)
  if (valid.length === 0) return null
  const mean = valid.reduce((s, b) => s + badgeToIndex(b), 0) / valid.length
  return indexToBadge(Math.round(mean))
}

export function rankName(badge: number, ranks: RankAsset[] | undefined): string {
  if (!badge || !ranks) return 'Unranked'
  const tier = Math.floor(badge / 10)
  const subrank = badge % 10
  const rank = ranks.find((r) => r.tier === tier)
  if (!rank) return 'Unranked'
  return subrank > 0 ? `${rank.name} ${subrank}` : rank.name
}
