import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { itemIcon, rankName, type ItemAsset, type MatchInfo, type MatchPlayer } from '../../lib/api'
import ItemHover from '../../components/ItemHover'
import {
  useHeroes,
  useItems,
  useMatchMetadata,
  useRankAssets,
  useRanks,
  useSteamProfilesBatch,
} from '../../lib/queries'
import RankBadge from '../../components/RankBadge'
import { formatClock } from '../timers/timerEngine'
import '../players/players.css'
import './match.css'

import { TEAMS } from '../../lib/teams'

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })
const dateFmt = new Intl.DateTimeFormat(undefined, {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})

export default function MatchPage() {
  const params = useParams()
  const matchId = Number(params.matchId)
  if (!Number.isInteger(matchId) || matchId <= 0) {
    return <div className="page-note error">Invalid match id</div>
  }
  return <Match matchId={matchId} />
}

function Match({ matchId }: { matchId: number }) {
  const meta = useMatchMetadata(matchId)

  if (meta.isPending) return <div className="page-note">Loading match</div>
  if (meta.isError) return <div className="page-note error">Could not load this match</div>
  return <MatchDetail info={meta.data} />
}

function MatchDetail({ info }: { info: MatchInfo }) {
  const heroes = useHeroes()
  const items = useItems()
  const ranks = useRankAssets()
  const accountIds = useMemo(() => info.players.map((p) => p.account_id), [info])
  const profiles = useSteamProfilesBatch(accountIds)
  const badges = useRanks(accountIds)
  const [openBuild, setOpenBuild] = useState<number | null>(null)

  const persona = (accountId: number) =>
    profiles.data?.get(accountId)?.personaname ?? `#${accountId}`
  const heroFor = (heroId: number) => heroes.data?.get(heroId)

  const winner = TEAMS[info.winning_team === 1 ? 1 : 0]
  const teamBadges = [info.average_badge_team0, info.average_badge_team1].map((b) =>
    rankName(b ?? 0, ranks.data),
  )

  const teamPlayers = (team: number) =>
    info.players.filter((p) => p.team === team).sort((a, b) => b.net_worth - a.net_worth)

  return (
    <>
      <div className="match-head">
        <div className="match-id">Match #{info.match_id}</div>
        <div className="victory" style={{ color: winner.color }}>
          {winner.name} Victory
        </div>
        <div className="meta">
          {dateFmt.format(info.start_time * 1000)} · {formatClock(info.duration_s)} · avg ranks{' '}
          {teamBadges[0]} vs {teamBadges[1]}
        </div>
      </div>

      <SoulsChart info={info} />

      {[0, 1].map((team) => (
        <section key={team} className="team-section">
          <div className="team-title" style={{ borderLeftColor: TEAMS[team].color }}>
            <h3>{TEAMS[team].name}</h3>
            <span className="team-note">
              {team === info.winning_team ? 'victory' : 'defeat'} · avg {teamBadges[team]}
            </span>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Hero</th>
                  <th>Player</th>
                  <th>K</th>
                  <th>D</th>
                  <th>A</th>
                  <th>Souls</th>
                  <th>Dmg</th>
                  <th>Healing</th>
                  <th>LH</th>
                  <th>DN</th>
                  <th>Level</th>
                  <th>Build</th>
                </tr>
              </thead>
              <tbody>
                {teamPlayers(team).flatMap((p) => {
                  const hero = heroFor(p.hero_id)
                  const finalStats = p.stats[p.stats.length - 1]
                  const isOpen = openBuild === p.account_id
                  const rows = [
                    <tr key={p.account_id}>
                      <td>
                        <Link className="hero-cell" to={`/heroes/${p.hero_id}`}>
                          {hero && <img src={hero.images.icon_image_small_webp} alt="" />}
                          {hero?.name ?? `Hero ${p.hero_id}`}
                        </Link>
                      </td>
                      <td>
                        <span className="persona-cell">
                          <Link className="player-link" to={`/players/${p.account_id}`}>
                            {persona(p.account_id)}
                          </Link>
                          <RankBadge badge={badges.get(p.account_id)} />
                        </span>
                      </td>
                      <td className="mono">{p.kills}</td>
                      <td className="mono">{p.deaths}</td>
                      <td className="mono">{p.assists}</td>
                      <td className="mono">{compact.format(p.net_worth)}</td>
                      <td className="mono">
                        {finalStats ? compact.format(finalStats.player_damage) : '—'}
                      </td>
                      <td className="mono">
                        {finalStats ? compact.format(finalStats.player_healing) : '—'}
                      </td>
                      <td className="mono">{p.last_hits}</td>
                      <td className="mono">{p.denies}</td>
                      <td className="mono">{p.level}</td>
                      <td>
                        <button
                          className="btn-quiet"
                          onClick={() => setOpenBuild(isOpen ? null : p.account_id)}
                        >
                          {isOpen ? 'hide' : 'view'}
                        </button>
                      </td>
                    </tr>,
                  ]
                  if (isOpen) {
                    rows.push(
                      <tr key={`${p.account_id}-build`} className="build-tr">
                        <td colSpan={12}>
                          <BuildStrip player={p} items={items.data} />
                        </td>
                      </tr>,
                    )
                  }
                  return rows
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {info.mid_boss && info.mid_boss.length > 0 && (
        <section className="data-section">
          <h3>Mid-Boss</h3>
          <ul className="timeline-list">
            {info.mid_boss.map((e, i) => (
              <li key={i}>
                <span className="when">{formatClock(e.destroyed_time_s)}</span>
                <span>
                  {e.team_claimed === e.team_killed
                    ? `${TEAMS[e.team_claimed]?.name ?? 'A team'} killed the Mid-Boss and claimed the Rejuvenator`
                    : `${TEAMS[e.team_killed]?.name ?? 'A team'} killed the Mid-Boss — ${TEAMS[e.team_claimed]?.name ?? 'the other team'} stole the Rejuvenator`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}

/* ---- item build strip with hover cards ---- */

function BuildStrip({
  player,
  items,
}: {
  player: MatchPlayer
  items: Map<number, ItemAsset> | undefined
}) {
  const purchases = useMemo(
    () =>
      [...player.items]
        .sort((a, b) => a.game_time_s - b.game_time_s)
        .flatMap((entry) => {
          const item = items?.get(entry.item_id)
          if (!item || item.type !== 'upgrade' || !itemIcon(item)) return []
          return [{ ...entry, item }]
        }),
    [player.items, items],
  )
  if (purchases.length === 0) return <span className="dim">No shop purchases recorded</span>
  return (
    <span className="build-items">
      {purchases.map((p, i) => (
        <ItemHover
          key={`${p.item.id}-${i}`}
          item={p.item}
          dimmed={p.sold_time_s > 0}
          extraLine={`bought ${formatClock(p.game_time_s)}${
            p.sold_time_s > 0 ? ` · sold ${formatClock(p.sold_time_s)}` : ''
          }`}
        />
      ))}
    </span>
  )
}

/* ---- souls-over-time chart ---- */

const W = 800
const H = 280
const PAD = { l: 56, r: 108, t: 14, b: 30 }

function SoulsChart({ info }: { info: MatchInfo }) {
  const [hover, setHover] = useState<{ index: number; px: number; py: number } | null>(null)

  const samples = useMemo(() => {
    const byTime = new Map<number, [number, number]>()
    for (const p of info.players) {
      for (const s of p.stats) {
        const entry = byTime.get(s.time_stamp_s) ?? [0, 0]
        entry[p.team === 1 ? 1 : 0] += s.net_worth
        byTime.set(s.time_stamp_s, entry)
      }
    }
    if (!byTime.has(0)) byTime.set(0, [0, 0])
    return [...byTime.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([t, [team0, team1]]) => ({ t, values: [team0, team1] as const }))
  }, [info])

  if (samples.length < 2) return null

  const tMax = Math.max(samples[samples.length - 1].t, info.duration_s)
  const rawMax = Math.max(...samples.map((s) => Math.max(...s.values)))
  const step = Math.pow(10, Math.floor(Math.log10(rawMax || 1)))
  const vMax = Math.ceil((rawMax * 1.05) / (step / 2)) * (step / 2)

  const x = (t: number) => PAD.l + (t / tMax) * (W - PAD.l - PAD.r)
  const y = (v: number) => PAD.t + (1 - v / vMax) * (H - PAD.t - PAD.b)

  const path = (team: 0 | 1) =>
    samples
      .map((s, i) => `${i === 0 ? 'M' : 'L'}${x(s.t).toFixed(1)},${y(s.values[team]).toFixed(1)}`)
      .join(' ')

  const xTickStep = tMax > 2700 ? 600 : 300
  const xTicks: number[] = []
  for (let t = 0; t <= tMax; t += xTickStep) xTicks.push(t)
  const yTicks = [0.25, 0.5, 0.75, 1].map((f) => f * vMax)

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const svgX = ((e.clientX - rect.left) / rect.width) * W
    const t = ((svgX - PAD.l) / (W - PAD.l - PAD.r)) * tMax
    let index = 0
    for (let i = 1; i < samples.length; i++) {
      if (Math.abs(samples[i].t - t) < Math.abs(samples[index].t - t)) index = i
    }
    setHover({
      index,
      px: ((e.clientX - rect.left) / rect.width) * 100,
      py: ((e.clientY - rect.top) / rect.height) * 100,
    })
  }

  const hoverSample = hover ? samples[hover.index] : null

  // nudge end labels apart when the lines finish close together
  const last = samples[samples.length - 1]
  const endY: [number, number] = [y(last.values[0]), y(last.values[1])]
  if (Math.abs(endY[0] - endY[1]) < 14) {
    const mid = (endY[0] + endY[1]) / 2
    endY[endY[0] < endY[1] ? 0 : 1] = mid - 7
    endY[endY[0] < endY[1] ? 1 : 0] = mid + 7
  }

  return (
    <div className="chart-panel">
      <div className="chart-legend">
        {TEAMS.map((team) => (
          <span key={team.short}>
            <span className="swatch" style={{ background: team.color }} />
            {team.name}
          </span>
        ))}
        <span>· team net worth over time</span>
      </div>
      <div className="chart-wrap">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="Team net worth over time"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        >
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="#2a2114" />
              <text
                x={PAD.l - 8}
                y={y(v) + 3}
                textAnchor="end"
                fontSize="10"
                fill="#7c6f58"
                fontFamily="IBM Plex Mono, monospace"
              >
                {compact.format(v)}
              </text>
            </g>
          ))}
          {xTicks.map((t) => (
            <text
              key={t}
              x={x(t)}
              y={H - 10}
              textAnchor="middle"
              fontSize="10"
              fill="#7c6f58"
              fontFamily="IBM Plex Mono, monospace"
            >
              {t / 60}m
            </text>
          ))}
          <line x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} stroke="#3b2f1e" />

          {info.mid_boss?.map((e, i) => (
            <path
              key={i}
              d={`M${x(e.destroyed_time_s)},${y(0) - 5} l4,5 l-4,5 l-4,-5 Z`}
              fill={TEAMS[e.team_claimed]?.color ?? '#7c6f58'}
            >
              <title>{`Mid-Boss ${formatClock(e.destroyed_time_s)}`}</title>
            </path>
          ))}

          {([0, 1] as const).map((team) => (
            <path
              key={team}
              d={path(team)}
              fill="none"
              stroke={TEAMS[team].color}
              strokeWidth="2"
            />
          ))}

          {([0, 1] as const).map((team) => (
            <g key={team}>
              <circle cx={x(last.t) + 6} cy={endY[team]} r="3" fill={TEAMS[team].color} />
              <text
                x={x(last.t) + 13}
                y={endY[team] + 3}
                fontSize="11"
                fill="#b0a186"
                fontFamily="Josefin Sans, sans-serif"
              >
                {TEAMS[team].short}
              </text>
            </g>
          ))}

          {hoverSample && (
            <g>
              <line
                x1={x(hoverSample.t)}
                x2={x(hoverSample.t)}
                y1={PAD.t}
                y2={H - PAD.b}
                stroke="#7c6f58"
                strokeDasharray="3 3"
              />
              {([0, 1] as const).map((team) => (
                <circle
                  key={team}
                  cx={x(hoverSample.t)}
                  cy={y(hoverSample.values[team])}
                  r="4"
                  fill={TEAMS[team].color}
                  stroke="#17110b"
                  strokeWidth="2"
                />
              ))}
            </g>
          )}
        </svg>
        {hoverSample && hover && (
          <div
            className="chart-tooltip"
            style={{
              left: `${Math.min(hover.px, 78)}%`,
              top: `${Math.max(hover.py - 12, 2)}%`,
            }}
          >
            <div className="tip-time">{formatClock(hoverSample.t)}</div>
            {TEAMS.map((team, i) => (
              <div key={team.short} className="tip-row">
                <span className="swatch" style={{ background: team.color }} />
                <span>{team.short}</span>
                <span>{compact.format(hoverSample.values[i])}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <details className="chart-table">
        <summary>Data table</summary>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>{TEAMS[0].short}</th>
              <th>{TEAMS[1].short}</th>
            </tr>
          </thead>
          <tbody>
            {samples.map((s) => (
              <tr key={s.t}>
                <td>{formatClock(s.t)}</td>
                <td>{s.values[0].toLocaleString()}</td>
                <td>{s.values[1].toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
