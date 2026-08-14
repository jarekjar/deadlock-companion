import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  SINCE_30D,
  useHeroes,
  useHeroScoreboard,
  usePlayerScoreboard,
  useSteamProfilesBatch,
} from '../../lib/queries'
import { bracketLabel, useRankFilter } from '../../lib/rankFilter'
import RankFilterControl from '../../shared/RankFilterControl'
import { usePageMeta } from '../../lib/usePageMeta'
import '../players/players.css'
import '../heroes/heroes.css'

type Fmt = 'int' | 'dec' | 'compact' | 'pct'

const STATS: { value: string; label: string; fmt: Fmt; minMatches?: number }[] = [
  { value: 'max_kills_per_match', label: 'Most kills in a match', fmt: 'int' },
  { value: 'avg_kills_per_match', label: 'Highest average kills', fmt: 'dec', minMatches: 20 },
  { value: 'max_assists_per_match', label: 'Most assists in a match', fmt: 'int' },
  { value: 'max_net_worth_per_match', label: 'Richest single match', fmt: 'compact' },
  {
    value: 'avg_net_worth_per_match',
    label: 'Highest average souls',
    fmt: 'compact',
    minMatches: 20,
  },
  { value: 'max_denies_per_match', label: 'Most denies in a match', fmt: 'int' },
  { value: 'max_last_hits_per_match', label: 'Most last hits in a match', fmt: 'int' },
  { value: 'winrate', label: 'Best win rate', fmt: 'pct', minMatches: 50 },
  { value: 'matches', label: 'Most matches played', fmt: 'int' },
  { value: 'kills', label: 'Most total kills', fmt: 'compact' },
]

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })

function formatValue(value: number, fmt: Fmt): string {
  switch (fmt) {
    case 'int':
      return Math.round(value).toLocaleString()
    case 'dec':
      return value.toFixed(1)
    case 'compact':
      return compact.format(value)
    case 'pct':
      return `${(value * 100).toFixed(1)}%`
  }
}

export default function RecordsPage() {
  usePageMeta(
    'Deadlock Records — The Cursed Apple',
    'Deadlock record boards: the most kills in one match, richest games, best win rates, and more — for players and heroes.',
  )
  const [board, setBoard] = useState<'players' | 'heroes'>('players')
  const [stat, setStat] = useState(STATS[0])
  const [heroId, setHeroId] = useState(0)
  const [timeWindow, setTimeWindow] = useState<'30d' | 'all'>('30d')
  const { minBadge } = useRankFilter()
  const heroes = useHeroes()

  const query = {
    sortBy: stat.value,
    heroId: board === 'players' && heroId > 0 ? heroId : undefined,
    minBadge,
    sinceUnix: timeWindow === '30d' ? SINCE_30D : undefined,
    minMatches: stat.minMatches,
    limit: 50,
  }
  const players = usePlayerScoreboard(query, board === 'players')
  const heroBoard = useHeroScoreboard(query, board === 'heroes')
  const active = board === 'players' ? players : heroBoard

  const playerIds = useMemo(
    () => (board === 'players' ? (players.data ?? []).map((r) => r.account_id) : []),
    [board, players.data],
  )
  const profiles = useSteamProfilesBatch(playerIds)

  const heroOptions = useMemo(
    () =>
      heroes.data
        ? [...heroes.data.values()].sort((a, b) => a.name.localeCompare(b.name))
        : [],
    [heroes.data],
  )

  return (
    <>
      <div className="tab-row" role="tablist">
        <button
          role="tab"
          aria-selected={board === 'players'}
          className={`tab${board === 'players' ? ' selected' : ''}`}
          onClick={() => setBoard('players')}
        >
          Players
        </button>
        <button
          role="tab"
          aria-selected={board === 'heroes'}
          className={`tab${board === 'heroes' ? ' selected' : ''}`}
          onClick={() => setBoard('heroes')}
        >
          Heroes
        </button>
      </div>

      <div className="control-bar">
        <span className="cb-group">
          <span className="cb-label">Record</span>
          <select
            value={stat.value}
            onChange={(e) => setStat(STATS.find((s) => s.value === e.target.value) ?? STATS[0])}
            aria-label="Pick a record"
          >
            {STATS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </span>
        {board === 'players' && (
          <span className="cb-group">
            <span className="cb-label">Hero</span>
            <select
              value={heroId}
              onChange={(e) => setHeroId(Number(e.target.value))}
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
        )}
        <span className="cb-group">
          <span className="cb-label">Window</span>
          <select
            value={timeWindow}
            onChange={(e) => setTimeWindow(e.target.value as '30d' | 'all')}
            aria-label="Time window"
          >
            <option value="30d">Last 30 days</option>
            <option value="all">All time</option>
          </select>
        </span>
        <RankFilterControl />
      </div>
      <p className="grid-note">
        {stat.label} · {timeWindow === '30d' ? 'last 30 days' : 'all time'} ·{' '}
        {bracketLabel(minBadge)}
        {stat.minMatches ? ` · ${stat.minMatches}+ matches` : ''}
      </p>

      {active.isError ? (
        <div className="page-note error">Could not load this record board</div>
      ) : !active.data ? (
        <div className="page-note">Loading records</div>
      ) : active.data.length === 0 ? (
        <div className="page-note">No data for this record yet</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{board === 'players' ? 'Player' : 'Hero'}</th>
                <th>{stat.label}</th>
                <th>Matches</th>
              </tr>
            </thead>
            <tbody>
              {board === 'players'
                ? (players.data ?? []).map((row, i) => {
                    const p = profiles.data?.get(row.account_id)
                    return (
                      <tr key={`${row.account_id}-${i}`}>
                        <td className="mono">{i + 1}</td>
                        <td>
                          <span className="hero-cell avatar-cell">
                            {p && <img src={p.avatarmedium} alt="" loading="lazy" />}
                            <Link className="player-link" to={`/players/${row.account_id}`}>
                              {p?.personaname ?? `#${row.account_id}`}
                            </Link>
                          </span>
                        </td>
                        <td className="mono">{formatValue(row.value, stat.fmt)}</td>
                        <td className="mono">{row.matches.toLocaleString()}</td>
                      </tr>
                    )
                  })
                : (heroBoard.data ?? []).map((row, i) => {
                    const hero = heroes.data?.get(row.hero_id)
                    return (
                      <tr key={`${row.hero_id}-${i}`}>
                        <td className="mono">{i + 1}</td>
                        <td>
                          <Link className="hero-cell" to={`/heroes/${row.hero_id}`}>
                            {hero && (
                              <img src={hero.images.icon_image_small_webp} alt="" loading="lazy" />
                            )}
                            {hero?.name ?? `Hero ${row.hero_id}`}
                          </Link>
                        </td>
                        <td className="mono">{formatValue(row.value, stat.fmt)}</td>
                        <td className="mono">{row.matches.toLocaleString()}</td>
                      </tr>
                    )
                  })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
