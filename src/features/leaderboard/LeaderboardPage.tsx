import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { LEADERBOARD_REGIONS, rankName, type LeaderboardRegion } from '../../lib/api'
import {
  useHeroes,
  useLeaderboard,
  useRank,
  useRankAssets,
  useRankDistribution,
} from '../../lib/queries'
import { useSession } from '../../lib/session'
import '../players/players.css'
import '../heroes/heroes.css'
import '../live/live.css'
import '../matches/match.css'
import './leaderboard.css'

const PAGE_SIZE = 100

export default function LeaderboardPage() {
  const [params] = useSearchParams()
  const [region, setRegion] = useState<LeaderboardRegion>('NAmerica')
  const [search, setSearch] = useState(params.get('q') ?? '')
  const [view, setView] = useState<'board' | 'distribution'>('board')
  const [visible, setVisible] = useState(PAGE_SIZE)
  const session = useSession()
  const board = useLeaderboard(region)
  const heroes = useHeroes()

  const myEntry = useMemo(() => {
    if (!session.data || !board.data) return null
    return board.data.find((e) => e.possible_account_ids.includes(session.data!)) ?? null
  }, [session.data, board.data])

  const rows = useMemo(() => {
    if (!board.data) return null
    const needle = search.trim().toLowerCase()
    return needle
      ? board.data.filter((e) => e.account_name.toLowerCase().includes(needle))
      : board.data
  }, [board.data, search])

  return (
    <>
      <div className="control-bar">
        <span className="cb-group cb-search">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leaderboard names"
            aria-label="Search leaderboard"
          />
        </span>
        <span className="cb-group">
          <span className="cb-label">Region</span>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value as LeaderboardRegion)}
            aria-label="Region"
          >
            {LEADERBOARD_REGIONS.map((r) => (
              <option key={r} value={r}>
                {r === 'NAmerica' ? 'N. America' : r === 'SAmerica' ? 'S. America' : r}
              </option>
            ))}
          </select>
        </span>
        <span className="cb-group">
          <span className="cb-label">View</span>
          <span className="lane-seg" role="group" aria-label="View">
            <button
              className={`seg${view === 'board' ? ' on' : ''}`}
              onClick={() => setView('board')}
            >
              Top 1000
            </button>
            <button
              className={`seg${view === 'distribution' ? ' on' : ''}`}
              onClick={() => setView('distribution')}
            >
              Distribution
            </button>
          </span>
        </span>
        {session.data && view === 'board' && (
          <span className="cb-group">
            <button
              className="cb-dir"
              onClick={() => {
                if (myEntry) setSearch(myEntry.account_name)
              }}
              title={myEntry ? 'Filter to your entry' : 'You are not on this leaderboard'}
            >
              {myEntry ? `Find me (#${myEntry.rank})` : 'Not on this board'}
            </button>
          </span>
        )}
      </div>

      {view === 'board' ? (
        <>
          <p className="grid-note">
            The top ~1000 ranked players per region, as reported by the game. Names come from
            the in-game leaderboard; profile links appear when the account match is unambiguous.
          </p>
          {board.isError ? (
            <div className="page-note error">Could not load the leaderboard</div>
          ) : !rows ? (
            <div className="page-note">Loading leaderboard</div>
          ) : rows.length === 0 ? (
            <div className="page-note">No players match</div>
          ) : (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Player</th>
                      <th>Top heroes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, visible).map((entry) => {
                      const isMe = myEntry?.rank === entry.rank
                      const accountId =
                        entry.possible_account_ids.length === 1
                          ? entry.possible_account_ids[0]
                          : null
                      return (
                        <tr key={`${entry.rank}-${entry.account_name}`} className={isMe ? 'me-row' : ''}>
                          <td className="mono rank-col">{entry.rank}</td>
                          <td>
                            {accountId ? (
                              <Link className="player-link" to={`/players/${accountId}`}>
                                {entry.account_name}
                              </Link>
                            ) : (
                              entry.account_name
                            )}
                            {isMe && <span className="me-tag">you</span>}
                          </td>
                          <td>
                            <span className="hero-cluster">
                              {entry.top_hero_ids.slice(0, 3).map((heroId) => {
                                const hero = heroes.data?.get(heroId)
                                return hero ? (
                                  <Link key={heroId} to={`/heroes/${heroId}`}>
                                    <img
                                      src={hero.images.icon_image_small_webp}
                                      alt={hero.name}
                                      title={hero.name}
                                      loading="lazy"
                                    />
                                  </Link>
                                ) : null
                              })}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {visible < rows.length && (
                <button className="btn show-more" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                  Show more ({rows.length - visible} remaining)
                </button>
              )}
            </>
          )}
        </>
      ) : (
        <DistributionView />
      )}
    </>
  )
}

/* ---- rank distribution chart ---- */

const W = 800
const H = 300
const PAD = { l: 52, r: 16, t: 18, b: 40 }

function DistributionView() {
  const distribution = useRankDistribution()
  const rankAssets = useRankAssets()
  const session = useSession()
  const myRank = useRank(session.data ?? 0)
  const [hover, setHover] = useState<number | null>(null)

  const buckets = useMemo(
    () =>
      distribution.data
        ? [...distribution.data].filter((b) => b.rank >= 11).sort((a, b) => a.rank - b.rank)
        : null,
    [distribution.data],
  )

  if (distribution.isError) {
    return <div className="page-note error">Could not load the rank distribution</div>
  }
  if (!buckets) return <div className="page-note">Loading rank distribution</div>

  const total = buckets.reduce((s, b) => s + b.players, 0)
  const maxPlayers = Math.max(...buckets.map((b) => b.players))
  const myBadge = myRank.data?.badge ?? 0
  const myIndex = myBadge > 0 ? buckets.findIndex((b) => b.rank === myBadge) : -1
  const percentile =
    myIndex >= 0
      ? (buckets.filter((b) => b.rank > myBadge).reduce((s, b) => s + b.players, 0) / total) * 100
      : null

  const barWidth = (W - PAD.l - PAD.r) / buckets.length
  const x = (i: number) => PAD.l + i * barWidth
  const y = (v: number) => PAD.t + (1 - v / maxPlayers) * (H - PAD.t - PAD.b)

  const tierLabel = (tier: number) =>
    rankAssets.data?.find((r) => r.tier === tier)?.name ?? `Tier ${tier}`

  const hovered = hover !== null ? buckets[hover] : null

  return (
    <>
      <p className="grid-note">
        Ranked players per badge, across all regions.
        {percentile !== null &&
          ` You are ${rankName(myBadge, rankAssets.data)} — top ${percentile.toFixed(1)}% of ranked players.`}
        {session.data && myBadge === 0 && ' Play ranked matches to appear on this chart.'}
        {!session.data && ' Sign in through Steam to see where you land.'}
      </p>
      <div className="chart-panel">
        <div className="chart-wrap">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label="Players per rank"
            onMouseLeave={() => setHover(null)}
          >
            {[0.25, 0.5, 0.75, 1].map((f) => (
              <g key={f}>
                <line
                  x1={PAD.l}
                  x2={W - PAD.r}
                  y1={y(f * maxPlayers)}
                  y2={y(f * maxPlayers)}
                  stroke="#2a2114"
                />
                <text
                  x={PAD.l - 8}
                  y={y(f * maxPlayers) + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="#7c6f58"
                  fontFamily="IBM Plex Mono, monospace"
                >
                  {Intl.NumberFormat('en', { notation: 'compact' }).format(f * maxPlayers)}
                </text>
              </g>
            ))}
            {buckets.map((bucket, i) => {
              const tier = Math.floor(bucket.rank / 10)
              const isTierStart = bucket.rank % 10 === 1
              return (
                <g key={bucket.rank}>
                  {isTierStart && i > 0 && (
                    <line
                      x1={x(i)}
                      x2={x(i)}
                      y1={PAD.t}
                      y2={H - PAD.b}
                      stroke="#29200f"
                    />
                  )}
                  <rect
                    x={x(i) + 1}
                    y={y(bucket.players)}
                    width={Math.max(1, barWidth - 2)}
                    height={H - PAD.b - y(bucket.players)}
                    fill={hover === i ? '#ddb85f' : bucket.rank === myBadge ? '#c9822f' : '#8f7434'}
                    onMouseEnter={() => setHover(i)}
                  />
                  {bucket.rank % 10 === 3 && (
                    <text
                      x={x(i) + barWidth}
                      y={H - 10}
                      textAnchor="middle"
                      fontSize="9"
                      fill="#7c6f58"
                      fontFamily="Josefin Sans, sans-serif"
                      letterSpacing="1"
                    >
                      {tierLabel(tier).toUpperCase()}
                    </text>
                  )}
                  {bucket.rank === myBadge && (
                    <text
                      x={x(i) + barWidth / 2}
                      y={y(bucket.players) - 8}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#ddb85f"
                      fontFamily="Josefin Sans, sans-serif"
                      letterSpacing="2"
                    >
                      YOU
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
          {hovered && hover !== null && (
            <div
              className="chart-tooltip"
              style={{
                left: `${Math.min(92, Math.max(8, ((x(hover) + barWidth / 2) / W) * 100))}%`,
                top: '8%',
              }}
            >
              <div className="tip-time">{rankName(hovered.rank, rankAssets.data)}</div>
              <div className="tip-row">
                <span>{hovered.players.toLocaleString()} players</span>
              </div>
              <div className="tip-row">
                <span>{((hovered.players / total) * 100).toFixed(2)}% of ranked</span>
              </div>
            </div>
          )}
        </div>
        <details className="chart-table">
          <summary>Data table</summary>
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Players</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((b) => (
                <tr key={b.rank}>
                  <td style={{ textAlign: 'left', fontFamily: 'inherit' }}>
                    {rankName(b.rank, rankAssets.data)}
                  </td>
                  <td>{b.players.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </div>
    </>
  )
}
