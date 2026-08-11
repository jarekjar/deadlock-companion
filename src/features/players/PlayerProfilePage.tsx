import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import RankBadge from '../../components/RankBadge'
import {
  isWin,
  itemIcon,
  rankName,
  type HeroAsset,
  type MatchHistoryEntry,
  type PlayerHeroStats,
} from '../../lib/api'
import {
  useHeroes,
  useItems,
  useLiveMatchForPlayer,
  useMatchHistory,
  usePlayerHeroStats,
  usePlayerItemStats,
  useRank,
  useRankAssets,
  useSteamProfile,
} from '../../lib/queries'
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

  const persona = profile.data?.personaname ?? `Player #${accountId}`
  const isFavorite = favorites.some((f) => f.accountId === accountId)

  const summary = useMemo(() => {
    const matches = history.data ?? []
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
  }, [history.data])

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
        <div className="page-note">No Deadlock matches on record for this account</div>
      ) : (
        <>
          {summary && (
            <div className="stat-row">
              <StatTile label="Matches" value={String(summary.matches)} />
              <StatTile label="Win rate" value={`${summary.winRate.toFixed(1)}%`} />
              <StatTile label="KDA" value={summary.kda.toFixed(2)} />
              <StatTile label="Souls per min" value={compact.format(summary.soulsPerMin)} />
            </div>
          )}

          {heroStats.data && heroStats.data.length > 0 && (
            <Highlights
              accountId={accountId}
              heroStats={heroStats.data}
              heroes={heroes.data}
            />
          )}

          <MatchTable matches={history.data} heroes={heroes.data} />

          {heroStats.data && heroStats.data.length > 0 && (
            <HeroTable stats={heroStats.data} heroes={heroes.data} />
          )}
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
      <span className="hl-hero">
        {hero && <img src={hero.images.icon_hero_card_webp} alt="" loading="lazy" />}
        <span>
          <span className="hl-name">{hero?.name ?? `Hero ${stat.hero_id}`}</span>
          <span className="hl-sub">{sub}</span>
        </span>
      </span>
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
              <img
                key={item.id}
                src={itemIcon(item)}
                alt={item.name}
                title={`${item.name} · bought in ${matches.toLocaleString()} matches`}
                loading="lazy"
              />
            ))}
          </span>
        )}
      </div>
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
  const [visible, setVisible] = useState(25)
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
                    <span className="hero-cell">
                      {hero && <img src={hero.images.icon_image_small_webp} alt="" />}
                      {hero?.name ?? `Hero ${m.hero_id}`}
                    </span>
                  </td>
                  <td className={isWin(m) ? 'result-w' : 'result-l'}>{isWin(m) ? 'W' : 'L'}</td>
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
                    <span className="hero-cell">
                      {hero && <img src={hero.images.icon_image_small_webp} alt="" />}
                      {hero?.name ?? `Hero ${s.hero_id}`}
                    </span>
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
