import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { TEAMS } from '../../lib/teams'
import { useActiveMatches, useHeroes } from '../../lib/queries'
import { formatClock } from '../timers/timerEngine'
import '../players/players.css'
import './live.css'

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })

export default function LiveMatchesPage() {
  const navigate = useNavigate()
  const active = useActiveMatches()
  const heroes = useHeroes()
  const [nowSec, setNowSec] = useState(() => Date.now() / 1000)

  useEffect(() => {
    const id = window.setInterval(() => setNowSec(Date.now() / 1000), 1000)
    return () => window.clearInterval(id)
  }, [])

  const rows = useMemo(
    () => (active.data ? [...active.data].sort((a, b) => b.spectators - a.spectators) : null),
    [active.data],
  )

  if (active.isError) return <div className="page-note error">Could not load live matches</div>
  if (!rows) return <div className="page-note">Loading live matches</div>

  return (
    <>
      <p className="grid-note">
        Live matches from the in-game Watch tab (top ~200 spectate-able games), sorted by
        spectators. Data refreshes every 30 seconds.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Clock</th>
              <th>Mode</th>
              <th>{TEAMS[0].short}</th>
              <th>Souls</th>
              <th>Souls</th>
              <th>{TEAMS[1].short}</th>
              <th>Watching</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 40).map((m) => (
              <tr
                key={m.match_id}
                className="row-link"
                onClick={() => navigate(`/live/${m.match_id}`)}
              >
                <td className="mono">{formatClock(Math.max(0, nowSec - m.start_time))}</td>
                <td className="dim">
                  {m.match_mode_parsed ?? '—'}
                  {m.region_mode_parsed ? ` · ${m.region_mode_parsed}` : ''}
                </td>
                <td>
                  <span className="hero-cluster">
                    {m.players
                      .filter((p) => p.team === 0)
                      .map((p, i) => {
                        const hero = heroes.data?.get(p.hero_id)
                        return hero ? (
                          <Link
                            key={i}
                            to={`/heroes/${p.hero_id}`}
                            onClick={(e) => e.stopPropagation()}
                          >
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
                <td className="mono" style={{ color: TEAMS[0].color }}>
                  {compact.format(m.net_worth_team_0)}
                </td>
                <td className="mono" style={{ color: TEAMS[1].color }}>
                  {compact.format(m.net_worth_team_1)}
                </td>
                <td>
                  <span className="hero-cluster">
                    {m.players
                      .filter((p) => p.team === 1)
                      .map((p, i) => {
                        const hero = heroes.data?.get(p.hero_id)
                        return hero ? (
                          <Link
                            key={i}
                            to={`/heroes/${p.hero_id}`}
                            onClick={(e) => e.stopPropagation()}
                          >
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
                <td className="mono">{m.spectators}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
