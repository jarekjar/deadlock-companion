import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { averageBadge, objectivesStanding, rankName, type ActiveMatch } from '../../lib/api'
import { TEAMS } from '../../lib/teams'
import {
  useActiveMatches,
  useHeroAnalytics,
  useHeroes,
  useRankAssets,
  useRanks,
  useSteamProfilesBatch,
} from '../../lib/queries'
import { winRateClass } from '../../lib/winrate'
import RankBadge from '../../shared/RankBadge'
import { formatClock } from '../timers/timerEngine'
import { syncClockFromLive } from '../timers/useMatchClock'
import '../players/players.css'
import './live.css'
import { isNative } from '../../lib/native'

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })

export default function LiveMatchPage() {
  const params = useParams()
  const matchId = Number(params.matchId)
  const active = useActiveMatches()

  if (!Number.isInteger(matchId) || matchId <= 0) {
    return <div className="page-note error">Invalid match id</div>
  }
  if (active.isPending) return <div className="page-note">Loading live match</div>
  if (active.isError) return <div className="page-note error">Could not load live matches</div>

  const match = active.data.find((m) => m.match_id === matchId)
  if (!match) {
    return (
      <div className="page-note">
        This match is not in the live watch list — it may have ended.{' '}
        <Link to={`/matches/${matchId}`}>View the match breakdown</Link>
      </div>
    )
  }
  return <LiveDetail match={match} />
}

function LiveDetail({ match }: { match: ActiveMatch }) {
  const navigate = useNavigate()
  const heroes = useHeroes()
  const analytics = useHeroAnalytics()
  const accountIds = useMemo(() => match.players.map((p) => p.account_id), [match])
  const profiles = useSteamProfilesBatch(accountIds)
  const badges = useRanks(accountIds)
  const rankAssets = useRankAssets()
  const avgBadge = averageBadge(accountIds.map((id) => badges.get(id) ?? 0))
  const [nowSec, setNowSec] = useState(() => Date.now() / 1000)

  useEffect(() => {
    const id = window.setInterval(() => setNowSec(Date.now() / 1000), 1000)
    return () => window.clearInterval(id)
  }, [])

  const gameTime = Math.max(0, nowSec - match.start_time)
  const lead = match.net_worth_team_0 - match.net_worth_team_1
  const leader = lead === 0 ? null : TEAMS[lead > 0 ? 0 : 1]

  return (
    <>
      <div className="live-head">
        <div className="live-row">
          <span className="live-chip">Live</span>
          <span className="match-id">Match #{match.match_id}</span>
        </div>
        <div className="clock">{formatClock(gameTime)}</div>
        <div className="meta">
          {match.match_mode_parsed ?? 'Unknown mode'}
          {match.region_mode_parsed ? ` · ${match.region_mode_parsed}` : ''} · {match.spectators}{' '}
          watching
          {avgBadge !== null && ` · avg rank ${rankName(avgBadge, rankAssets.data)}`}
        </div>
        <div className="actions">
          <button
            className="btn btn-solid"
            onClick={() => {
              syncClockFromLive(Math.max(0, Date.now() / 1000 - match.start_time))
              navigate('/timers')
            }}
          >
            Sync spawn timers to this match
          </button>{' '}
          {!isNative && (
            <>
              <a className="btn" href="steam://rungameid/1422450">
                Watch in Deadlock
              </a>
              <div className="watch-hint">
                The watch button opens Deadlock — find match #{match.match_id} in the Watch tab.
              </div>
            </>
          )}
        </div>
      </div>

      <div className="live-souls">
        {([0, 1] as const).map((team) => (
          <div
            key={team}
            className="souls-panel"
            style={{ borderTopColor: TEAMS[team].color }}
          >
            <div className="team">{TEAMS[team].name}</div>
            <div className="souls">
              {compact.format(team === 0 ? match.net_worth_team_0 : match.net_worth_team_1)}
            </div>
            <div className="objectives">
              {objectivesStanding(
                team === 0 ? match.objectives_mask_team0 : match.objectives_mask_team1,
              )}
              /16 objectives standing
            </div>
          </div>
        ))}
      </div>
      <div className="souls-lead">
        {leader
          ? `${leader.name} leads by ${compact.format(Math.abs(lead))} souls`
          : 'Souls are even'}
      </div>

      <div className="team-grid">
        {([0, 1] as const).map((team) => (
          <section key={team} className="team-section">
            <div className="team-title" style={{ borderLeftColor: TEAMS[team].color }}>
              <h3>{TEAMS[team].name}</h3>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Hero</th>
                    <th>WR 30d</th>
                    <th>Player</th>
                  </tr>
                </thead>
                <tbody>
                  {match.players
                    .filter((p) => p.team === team)
                    .map((p) => {
                      const hero = heroes.data?.get(p.hero_id)
                      const stat = analytics.data?.find((s) => s.hero_id === p.hero_id)
                      const wr = stat && stat.matches > 0 ? (stat.wins / stat.matches) * 100 : null
                      const persona = profiles.data?.get(p.account_id)?.personaname
                      return (
                        <tr key={p.account_id}>
                          <td>
                            <Link className="hero-cell" to={`/heroes/${p.hero_id}`}>
                              {hero && (
                                <img src={hero.images.icon_image_small_webp} alt="" />
                              )}
                              {hero?.name ?? `Hero ${p.hero_id}`}
                            </Link>
                          </td>
                          <td className={`mono ${wr !== null ? winRateClass(wr) : ''}`}>
                            {wr !== null ? `${wr.toFixed(1)}%` : '—'}
                          </td>
                          <td>
                            <span className="persona-cell">
                              <Link className="player-link" to={`/players/${p.account_id}`}>
                                {persona ?? `#${p.account_id}`}
                              </Link>
                              <RankBadge badge={badges.get(p.account_id)} />
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>

      <p className="live-note">
        Live data comes from the spectator system: it refreshes every 30 seconds and can lag a
        couple of minutes behind the true game state. The clock is based on the match start time
        and is not affected by that delay (pauses excepted).
      </p>
    </>
  )
}
