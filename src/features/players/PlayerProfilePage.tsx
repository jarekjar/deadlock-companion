import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import PerformanceTab from './PerformanceTab'
import EconomyTab from './EconomyTab'
import RankBadge from '../../shared/RankBadge'
import {
  badgeToIndex,
  indexToBadge,
  isWin,
  itemIcon,
  matchModeOf,
  MATCH_MODE_LABELS,
  rankName,
  type HeroAsset,
  type MatchHistoryEntry,
  type ModeFilterValue,
  type PlayerHeroStats,
  type RankAsset,
} from '../../lib/api'
import LineChart from '../../shared/LineChart'
import ItemHover from '../../shared/ItemHover'
import { usePageMeta } from '../../lib/usePageMeta'
import {
  ALL_TIME,
  SINCE_30D,
  SINCE_90D,
  useEnemyStats,
  useHeroes,
  useItems,
  useLiveMatchForPlayer,
  useMatchHistory,
  useMateStats,
  usePlayerHeroStats,
  usePlayerItemStats,
  useRank,
  useRankAssets,
  useSteamProfile,
  useSteamProfilesBatch,
} from '../../lib/queries'
import { winRateClass } from '../../lib/winrate'
import { useFavorites } from '../../lib/favorites'
import { formatClock } from '../timers/timerEngine'
import './players.css'
import '../heroes/heroes.css'
import '../live/live.css'

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })
const dateFmt = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: '2-digit',
})

const PROFILE_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'performance', label: 'Performance' },
  { key: 'economy', label: 'Economy' },
  { key: 'heroes', label: 'Heroes' },
] as const

const WINDOWS = [
  { key: '30d', label: '30 days', text: 'the last 30 days', since: SINCE_30D },
  { key: '90d', label: '90 days', text: 'the last 90 days', since: SINCE_90D },
  { key: 'all', label: 'All time', text: 'all recorded matches', since: ALL_TIME },
] as const

const MODES: { key: ModeFilterValue; label: string }[] = [
  { key: 'all', label: 'All modes' },
  { key: 'ranked', label: 'Ranked' },
  { key: 'standard', label: 'Standard' },
  { key: 'brawl', label: 'Brawl' },
]

export default function PlayerProfilePage() {
  const params = useParams()
  const accountId = Number(params.accountId)
  if (!Number.isInteger(accountId) || accountId <= 0) {
    return <div className="page-note error">Invalid player id</div>
  }
  return <Profile accountId={accountId} />
}

function Profile({ accountId }: { accountId: number }) {
  const profile = useSteamProfile(accountId)
  const rank = useRank(accountId)
  const rankAssets = useRankAssets()
  const heroes = useHeroes()
  const history = useMatchHistory(accountId)
  const heroStats = usePlayerHeroStats(accountId)
  const live = useLiveMatchForPlayer(accountId)
  const { favorites, toggle } = useFavorites()
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('tab') ?? 'overview'
  const tab = PROFILE_TABS.some((t) => t.key === requested) ? requested : 'overview'
  const statsWindow = WINDOWS.find((w) => w.key === searchParams.get('window')) ?? WINDOWS[0]
  const requestedMode = MODES.find((m) => m.key === searchParams.get('mode'))?.key ?? 'all'
  // the economy endpoints only make sense for the normal game mode
  const mode: ModeFilterValue =
    tab === 'economy' && requestedMode === 'brawl' ? 'all' : requestedMode

  const setParams = (nextTab: string, nextWindow: string, nextMode: string) => {
    const params: Record<string, string> = {}
    if (nextTab !== 'overview') params.tab = nextTab
    if (nextWindow !== '30d') params.window = nextWindow
    if (nextMode !== 'all') params.mode = nextMode
    setSearchParams(params, { replace: true })
  }

  const persona = profile.data?.personaname ?? `Player #${accountId}`
  const isFavorite = favorites.some((f) => f.accountId === accountId)
  usePageMeta(
    `${persona} — Deadlock Player Stats — The Cursed Apple`,
    `Deadlock stats for ${persona}: win rate, KDA, souls per minute, hero breakdowns, and match history.`,
  )

  const modeFiltered = useMemo(() => {
    const matches = history.data ?? []
    return mode === 'all' ? matches : matches.filter((m) => matchModeOf(m) === mode)
  }, [history.data, mode])

  const summary = useMemo(() => {
    const matches = modeFiltered
    if (matches.length === 0) return null
    const wins = matches.filter(isWin).length
    const kills = matches.reduce((s, m) => s + m.player_kills, 0)
    const deaths = matches.reduce((s, m) => s + m.player_deaths, 0)
    const assists = matches.reduce((s, m) => s + m.player_assists, 0)
    const souls = matches.reduce((s, m) => s + m.net_worth, 0)
    const minutes = matches.reduce((s, m) => s + m.match_duration_s, 0) / 60
    return {
      matches: matches.length,
      winRate: (wins / matches.length) * 100,
      kda: deaths === 0 ? kills + assists : (kills + assists) / deaths,
      soulsPerMin: souls / minutes,
    }
  }, [modeFiltered])

  if (history.isError || profile.isError) {
    return <div className="page-note error">Could not load this player</div>
  }

  return (
    <>
      <div className="profile-head">
        {profile.data && <img src={profile.data.avatarfull} alt="" />}
        <div className="who">
          <h2>{persona}</h2>
          <div className="sub">
            #{accountId}
            {profile.data && (
              <>
                {' · '}
                <a href={profile.data.profileurl} target="_blank" rel="noreferrer">
                  steam profile
                </a>
                {' · '}
                <Link to={`/leaderboard?q=${encodeURIComponent(profile.data.personaname)}`}>
                  find on leaderboard
                </Link>
              </>
            )}
          </div>
          <span className="rank">
            <RankBadge badge={rank.data?.badge} />
            {rankName(rank.data?.badge ?? 0, rankAssets.data)}
          </span>
          {live.data && (
            <Link
              className="live-chip"
              style={{ marginLeft: 10, verticalAlign: 'bottom' }}
              to={`/live/${live.data.match_id}`}
            >
              Live now
            </Link>
          )}
        </div>
        <div className="actions">
          <button
            className="btn"
            onClick={() =>
              toggle({
                accountId,
                personaname: persona,
                avatar: profile.data?.avatarmedium ?? '',
              })
            }
          >
            {isFavorite ? 'Favorited' : 'Favorite'}
          </button>
        </div>
      </div>

      {history.isPending ? (
        <div className="page-note">Loading match data</div>
      ) : history.data.length === 0 ? (
        <div className="page-note">
          No Deadlock matches on record for this account.{' '}
          <Link to="/upload">Sync them from your Steam cache.</Link>
        </div>
      ) : (
        <>
          <div className="tab-row" role="tablist">
            {PROFILE_TABS.map(({ key, label }) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                className={`tab${tab === key ? ' selected' : ''}`}
                onClick={() => setParams(key, statsWindow.key, mode)}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'overview' && heroStats.data && heroStats.data.length > 0 && (
            <Highlights accountId={accountId} heroStats={heroStats.data} heroes={heroes.data} />
          )}

          {tab !== 'heroes' && (
            <div className="control-bar window-bar">
              {(tab === 'performance' || tab === 'economy') && (
                <span className="cb-group">
                  <span className="cb-label">Window</span>
                  <select
                    value={statsWindow.key}
                    onChange={(e) => setParams(tab, e.target.value, mode)}
                    aria-label="Stats time window"
                  >
                    {WINDOWS.map((w) => (
                      <option key={w.key} value={w.key}>
                        {w.label}
                      </option>
                    ))}
                  </select>
                </span>
              )}
              <span className="cb-group">
                <span className="cb-label">Mode</span>
                <select
                  value={mode}
                  onChange={(e) => setParams(tab, statsWindow.key, e.target.value)}
                  aria-label="Match mode filter"
                >
                  {MODES.filter((m) => !(tab === 'economy' && m.key === 'brawl')).map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </span>
            </div>
          )}

          {tab === 'overview' && (
            <>
              {summary && (
                <div className="stat-row">
                  <StatTile label="Matches" value={String(summary.matches)} />
                  <StatTile label="Win rate" value={`${summary.winRate.toFixed(1)}%`} />
                  <StatTile label="KDA" value={summary.kda.toFixed(2)} />
                  <StatTile label="Souls per min" value={compact.format(summary.soulsPerMin)} />
                </div>
              )}

              <RankHistory matches={history.data} ranks={rankAssets.data} />

              <MatchTable matches={modeFiltered} heroes={heroes.data} />

              <p className="grid-note left-note">
                Matches missing? The community API only knows matches that got synced —{' '}
                <Link to="/upload">sync yours from your Steam cache</Link>.
              </p>

              <Companions accountId={accountId} />
            </>
          )}

          {tab === 'performance' && (
            <PerformanceTab
              accountId={accountId}
              matches={modeFiltered}
              heroes={heroes.data}
              sinceUnix={statsWindow.since}
              windowText={statsWindow.text}
              mode={mode}
            />
          )}

          {tab === 'economy' && (
            <EconomyTab
              accountId={accountId}
              sinceUnix={statsWindow.since}
              windowText={statsWindow.text}
              mode={mode}
            />
          )}

          {tab === 'heroes' &&
            (heroStats.data && heroStats.data.length > 0 ? (
              <HeroTable stats={heroStats.data} heroes={heroes.data} />
            ) : (
              <div className="page-note">No hero data for this account</div>
            ))}
        </>
      )}
    </>
  )
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-tile">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  )
}

/**
 * Rank over time, from the Valve-reported badge on each ranked match in the
 * history we already fetched. Non-ranked matches carry no badge and are
 * skipped.
 */
function RankHistory({
  matches,
  ranks,
}: {
  matches: MatchHistoryEntry[]
  ranks: RankAsset[] | undefined
}) {
  const points = useMemo(
    () =>
      matches
        .filter((m) => (m.ranked_display_badge ?? 0) > 0)
        .sort((a, b) => a.start_time - b.start_time)
        .map((m) => ({
          x: m.start_time,
          y: badgeToIndex(m.ranked_display_badge!),
          delta: m.ranked_delta ?? 0,
        })),
    [matches],
  )

  if (points.length < 2) return null

  const indices = points.map((p) => p.y)
  const minIdx = Math.min(...indices)
  const maxIdx = Math.max(...indices)
  const span = maxIdx - minIdx
  const yTicks: number[] = []
  let tickLabel: (index: number) => string
  if (span <= 8) {
    // a narrow climb: tick every subrank, with full names ("Oracle 5")
    for (let i = minIdx; i <= maxIdx; i++) yTicks.push(i)
    tickLabel = (index) => rankName(indexToBadge(Math.round(index)), ranks)
  } else {
    // one tick per tier boundary, thinned when the graph spans many tiers
    const tierStep = span > 30 ? 12 : 6
    for (let i = Math.ceil((minIdx - 1) / tierStep) * tierStep; i <= maxIdx + 1; i += tierStep) {
      yTicks.push(i)
    }
    tickLabel = (index) =>
      ranks?.find((r) => r.tier === Math.floor(indexToBadge(index) / 10))?.name ?? ''
  }

  return (
    <section className="data-section">
      <h3>Rank History</h3>
      <LineChart
        xs={points.map((p) => p.x)}
        series={[
          {
            label: 'Rank',
            color: '#c9a24b',
            values: points.map((p) => p.y),
          },
        ]}
        formatX={(x) => dateFmt.format(x * 1000)}
        formatY={(y) => rankName(indexToBadge(Math.round(y)), ranks)}
        yTicks={yTicks}
        formatYTick={tickLabel}
        yDomain={[minIdx - 1, maxIdx + 1]}
        tooltipExtra={(i) =>
          points[i].delta !== 0
            ? [`${points[i].delta > 0 ? '▲ +' : '▼ '}${points[i].delta}`]
            : []
        }
        ariaLabel="Rank over time"
        legendNote="rank after each ranked match"
      />
    </section>
  )
}

const MIN_BEST_HERO_MATCHES = 5

function Highlights({
  accountId,
  heroStats,
  heroes,
}: {
  accountId: number
  heroStats: PlayerHeroStats[]
  heroes: Map<number, HeroAsset> | undefined
}) {
  const itemStats = usePlayerItemStats(accountId)
  const items = useItems()

  const favorite = useMemo(
    () => [...heroStats].sort((a, b) => b.matches_played - a.matches_played)[0],
    [heroStats],
  )
  const best = useMemo(() => {
    const eligible = heroStats.filter((s) => s.matches_played >= MIN_BEST_HERO_MATCHES)
    const pool = eligible.length > 0 ? eligible : heroStats
    return [...pool].sort((a, b) => b.wins / b.matches_played - a.wins / a.matches_played)[0]
  }, [heroStats])

  const favoriteItems = useMemo(() => {
    if (!itemStats.data || !items.data) return null
    return itemStats.data
      .flatMap((row) => {
        const item = items.data.get(row.item_id)
        if (!item || item.type !== 'upgrade' || item.shopable === false) return []
        if (!itemIcon(item)) return []
        return [{ item, matches: row.matches }]
      })
      .sort((a, b) => b.matches - a.matches)
      .slice(0, 6)
  }, [itemStats.data, items.data])

  const heroPanel = (stat: PlayerHeroStats, sub: string) => {
    const hero = heroes?.get(stat.hero_id)
    return (
      <Link className="hl-hero" to={`/heroes/${stat.hero_id}`}>
        {hero && <img src={hero.images.icon_hero_card_webp} alt="" loading="lazy" />}
        <span>
          <span className="hl-name">{hero?.name ?? `Hero ${stat.hero_id}`}</span>
          <span className="hl-sub">{sub}</span>
        </span>
      </Link>
    )
  }

  return (
    <div className="highlight-row">
      <div className="highlight-panel">
        <div className="stat-label">Favorite hero</div>
        {heroPanel(favorite, `${favorite.matches_played} matches`)}
      </div>
      <div className="highlight-panel">
        <div className="stat-label">Best hero</div>
        {heroPanel(
          best,
          `${((best.wins / best.matches_played) * 100).toFixed(0)}% win rate over ${best.matches_played} matches`,
        )}
      </div>
      <div className="highlight-panel">
        <div className="stat-label">Favorite items</div>
        {favoriteItems === null ? (
          <span className="hl-sub">Loading</span>
        ) : favoriteItems.length === 0 ? (
          <span className="hl-sub">No item data</span>
        ) : (
          <span className="hl-items">
            {favoriteItems.map(({ item, matches }) => (
              <ItemHover
                key={item.id}
                item={item}
                size={46}
                extraLine={`bought in ${matches.toLocaleString()} matches`}
              />
            ))}
          </span>
        )}
      </div>
    </div>
  )
}

/* ---- mates & nemeses ---- */

const MIN_NEMESIS_MATCHES = 8

function Companions({ accountId }: { accountId: number }) {
  const mates = useMateStats(accountId)
  const enemies = useEnemyStats(accountId)

  const mateRows = useMemo(
    () =>
      (mates.data ?? [])
        .filter((m) => m.mate_id !== accountId && m.matches_played >= 5)
        .sort((a, b) => b.matches_played - a.matches_played)
        .slice(0, 12),
    [mates.data, accountId],
  )
  const enemyRows = useMemo(
    () =>
      (enemies.data ?? [])
        .filter((e) => e.enemy_id !== accountId && e.matches_played >= MIN_NEMESIS_MATCHES)
        .sort(
          (a, b) =>
            a.wins / a.matches_played - b.wins / b.matches_played ||
            b.matches_played - a.matches_played,
        )
        .slice(0, 12),
    [enemies.data, accountId],
  )

  const ids = useMemo(
    () => [...new Set([...mateRows.map((m) => m.mate_id), ...enemyRows.map((e) => e.enemy_id)])],
    [mateRows, enemyRows],
  )
  const profiles = useSteamProfilesBatch(ids)

  if (mateRows.length === 0 && enemyRows.length === 0) return null

  const who = (id: number) => {
    const p = profiles.data?.get(id)
    return (
      <span className="hero-cell avatar-cell">
        {p && <img src={p.avatarmedium} alt="" loading="lazy" />}
        <Link className="player-link" to={`/players/${id}`}>
          {p?.personaname ?? `#${id}`}
        </Link>
      </span>
    )
  }

  const table = (
    title: string,
    note: string,
    columns: [string, string],
    rows: { id: number; matches: number; winRate: number }[],
  ) =>
    rows.length === 0 ? null : (
      <section className="data-section">
        <h3>{title}</h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>{columns[0]}</th>
                <th>{columns[1]}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{who(row.id)}</td>
                  <td className="mono">{row.matches.toLocaleString()}</td>
                  <td className={`mono ${winRateClass(row.winRate)}`}>
                    {row.winRate.toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="grid-note left-note">{note}</p>
      </section>
    )

  return (
    <div className="pair-grid">
      {table(
        'Runs With',
        'Teammates who keep showing up on this player’s side, and how the duo does.',
        ['Together', 'Win rate'],
        mateRows.map((m) => ({
          id: m.mate_id,
          matches: m.matches_played,
          winRate: (m.wins / m.matches_played) * 100,
        })),
      )}
      {table(
        'Nemeses',
        'Repeat opponents this player struggles against the most.',
        ['Faced', 'Win rate vs'],
        enemyRows.map((e) => ({
          id: e.enemy_id,
          matches: e.matches_played,
          winRate: (e.wins / e.matches_played) * 100,
        })),
      )}
    </div>
  )
}

type SortKey =
  | 'start_time'
  | 'hero'
  | 'result'
  | 'player_kills'
  | 'player_deaths'
  | 'player_assists'
  | 'net_worth'
  | 'match_duration_s'

function MatchTable({
  matches,
  heroes,
}: {
  matches: MatchHistoryEntry[]
  heroes: Map<number, HeroAsset> | undefined
}) {
  const navigate = useNavigate()
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({
    key: 'start_time',
    desc: true,
  })
  // recent matches are what people came for; the rest is one click away
  const [visible, setVisible] = useState(6)
  const [heroFilter, setHeroFilter] = useState(0)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const heroOptions = useMemo(() => {
    const ids = [...new Set(matches.map((m) => m.hero_id))]
    return ids
      .map((id) => ({ id, name: heroes?.get(id)?.name ?? `Hero ${id}` }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [matches, heroes])

  const filtered = useMemo(() => {
    const from = fromDate ? Date.parse(`${fromDate}T00:00:00`) / 1000 : null
    const to = toDate ? Date.parse(`${toDate}T23:59:59`) / 1000 : null
    return matches.filter(
      (m) =>
        (heroFilter === 0 || m.hero_id === heroFilter) &&
        (from === null || m.start_time >= from) &&
        (to === null || m.start_time <= to),
    )
  }, [matches, heroFilter, fromDate, toDate])

  const sorted = useMemo(() => {
    const value = (m: MatchHistoryEntry): number | string => {
      switch (sort.key) {
        case 'hero':
          return heroes?.get(m.hero_id)?.name ?? m.hero_id
        case 'result':
          return isWin(m) ? 1 : 0
        default:
          return m[sort.key]
      }
    }
    return [...filtered].sort((a, b) => {
      const av = value(a)
      const bv = value(b)
      const cmp = typeof av === 'string' ? av.localeCompare(String(bv)) : av - Number(bv)
      return sort.desc ? -cmp : cmp
    })
  }, [filtered, sort, heroes])

  const hasFilters = heroFilter !== 0 || fromDate !== '' || toDate !== ''

  const header = (key: SortKey, label: string) => (
    <th
      className={`sortable${sort.key === key ? ' sorted' : ''}`}
      onClick={() => setSort((s) => ({ key, desc: s.key === key ? !s.desc : true }))}
    >
      {label}
    </th>
  )

  return (
    <section className="data-section">
      <h3>Match History</h3>
      <div className="control-bar">
        <span className="cb-group">
          <span className="cb-label">Hero</span>
          <select
            value={heroFilter}
            onChange={(e) => setHeroFilter(Number(e.target.value))}
            aria-label="Filter by hero"
          >
            <option value={0}>All heroes</option>
            {heroOptions.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </span>
        <span className="cb-group">
          <span className="cb-label">From</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            aria-label="From date"
          />
        </span>
        <span className="cb-group">
          <span className="cb-label">To</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            aria-label="To date"
          />
        </span>
        {hasFilters && (
          <span className="cb-group">
            <button
              className="cb-dir"
              onClick={() => {
                setHeroFilter(0)
                setFromDate('')
                setToDate('')
              }}
            >
              Clear
            </button>
          </span>
        )}
        <span className="cb-group cb-count">
          {hasFilters ? `${filtered.length} of ${matches.length}` : `${matches.length}`} matches
        </span>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {header('hero', 'Hero')}
              {header('result', 'Result')}
              <th>Mode</th>
              {header('player_kills', 'K')}
              {header('player_deaths', 'D')}
              {header('player_assists', 'A')}
              {header('net_worth', 'Souls')}
              {header('match_duration_s', 'Length')}
              {header('start_time', 'Date')}
              <th>Match</th>
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0, visible).map((m) => {
              const hero = heroes?.get(m.hero_id)
              return (
                <tr
                  key={m.match_id}
                  className="row-link"
                  onClick={() => navigate(`/matches/${m.match_id}`)}
                >
                  <td>
                    <Link
                      className="hero-cell"
                      to={`/heroes/${m.hero_id}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {hero && <img src={hero.images.icon_image_small_webp} alt="" />}
                      {hero?.name ?? `Hero ${m.hero_id}`}
                    </Link>
                  </td>
                  <td className={isWin(m) ? 'result-w' : 'result-l'}>{isWin(m) ? 'W' : 'L'}</td>
                  <td className="dim">{MATCH_MODE_LABELS[matchModeOf(m)]}</td>
                  <td className="mono">{m.player_kills}</td>
                  <td className="mono">{m.player_deaths}</td>
                  <td className="mono">{m.player_assists}</td>
                  <td className="mono">{compact.format(m.net_worth)}</td>
                  <td className="mono">{formatClock(m.match_duration_s)}</td>
                  <td className="dim">{dateFmt.format(m.start_time * 1000)}</td>
                  <td className="mono">
                    <Link to={`/matches/${m.match_id}`} onClick={(e) => e.stopPropagation()}>
                      view
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {visible < sorted.length && (
        <button className="btn show-more" onClick={() => setVisible((v) => v + 50)}>
          Show more ({sorted.length - visible} remaining)
        </button>
      )}
    </section>
  )
}

function HeroTable({
  stats,
  heroes,
}: {
  stats: import('../../lib/api').PlayerHeroStats[]
  heroes: Map<number, HeroAsset> | undefined
}) {
  const rows = useMemo(
    () => [...stats].sort((a, b) => b.matches_played - a.matches_played),
    [stats],
  )
  return (
    <section className="data-section">
      <h3>Heroes</h3>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Hero</th>
              <th>Matches</th>
              <th>Win rate</th>
              <th>K / D / A per match</th>
              <th>Souls per min</th>
              <th>Last played</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const hero = heroes?.get(s.hero_id)
              const per = (n: number) => (n / s.matches_played).toFixed(1)
              return (
                <tr key={s.hero_id}>
                  <td>
                    <Link className="hero-cell" to={`/heroes/${s.hero_id}`}>
                      {hero && <img src={hero.images.icon_image_small_webp} alt="" />}
                      {hero?.name ?? `Hero ${s.hero_id}`}
                    </Link>
                  </td>
                  <td className="mono">{s.matches_played}</td>
                  <td className="mono">{((s.wins / s.matches_played) * 100).toFixed(0)}%</td>
                  <td className="mono">
                    {per(s.kills)} / {per(s.deaths)} / {per(s.assists)}
                  </td>
                  <td className="mono">{compact.format(s.networth_per_min)}</td>
                  <td className="dim">{dateFmt.format(s.last_played * 1000)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
