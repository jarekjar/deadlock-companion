import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { averageBadge, rankName, type ActiveMatch } from '../../lib/api'
import { TEAMS } from '../../lib/teams'
import {
  useHeroAnalytics,
  useHeroCounters,
  useHeroes,
  useLiveMatchForPlayer,
  useRankAssets,
  useRanks,
  useSteamProfilesBatch,
} from '../../lib/queries'
import { useSession } from '../../lib/session'
import { winRateClass } from '../../lib/winrate'
import RankBadge from '../../components/RankBadge'
import { CounterItems } from '../heroes/MatchupsPage'
import { formatClock } from '../timers/timerEngine'
import { syncClockFromLive } from '../timers/useMatchClock'
import '../players/players.css'
import '../heroes/heroes.css'
import './live.css'

const LANES = ['Left', 'Mid', 'Right', 'Flex'] as const

export default function MyMatchPage() {
  const session = useSession()
  if (session.isPending) return <div className="page-note">Checking sign-in</div>
  if (!session.data) {
    return (
      <div className="page-note">
        Sign in through Steam to use My Match — it finds your live game automatically.{' '}
        <a href="/api/auth/login" rel="nofollow">
          Steam Sign-In
        </a>
      </div>
    )
  }
  return <MyMatch accountId={session.data} />
}

function MyMatch({ accountId }: { accountId: number }) {
  const live = useLiveMatchForPlayer(accountId)
  if (live.isPending) return <div className="page-note">Looking for your live match</div>
  if (live.isError) return <div className="page-note error">Could not check for a live match</div>
  if (!live.data) {
    return (
      <div className="page-note">
        No live match detected for your account. This page rechecks every minute. Note: only
        the top ~200 spectate-able games are visible to the watch system.
      </div>
    )
  }
  return <MyMatchDetail match={live.data} accountId={accountId} />
}

function loadLanes(matchId: number): Record<number, string> {
  try {
    return JSON.parse(localStorage.getItem(`dc.lanes.${matchId}`) ?? '{}') as Record<
      number,
      string
    >
  } catch {
    return {}
  }
}

function MyMatchDetail({ match, accountId }: { match: ActiveMatch; accountId: number }) {
  const navigate = useNavigate()
  const heroes = useHeroes()
  const analytics = useHeroAnalytics()
  const counters = useHeroCounters()
  const rankAssets = useRankAssets()
  const accountIds = useMemo(() => match.players.map((p) => p.account_id), [match])
  const profiles = useSteamProfilesBatch(accountIds)
  const badges = useRanks(accountIds)
  const [nowSec, setNowSec] = useState(() => Date.now() / 1000)
  const [lanes, setLanes] = useState<Record<number, string>>(() => loadLanes(match.match_id))
  const [openEnemy, setOpenEnemy] = useState<number | null>(null)

  useEffect(() => {
    const id = window.setInterval(() => setNowSec(Date.now() / 1000), 1000)
    return () => window.clearInterval(id)
  }, [])

  const me = match.players.find((p) => p.account_id === accountId)
  const myTeam = me?.team === 1 ? 1 : 0
  const myHero = me ? heroes.data?.get(me.hero_id) : undefined
  const allies = match.players.filter((p) => p.team === myTeam)
  const enemies = match.players.filter((p) => p.team !== myTeam)

  const heroWinRates = useMemo(() => {
    const map = new Map<number, number>()
    for (const s of analytics.data ?? []) {
      if (s.matches > 0) map.set(s.hero_id, (s.wins / s.matches) * 100)
    }
    return map
  }, [analytics.data])

  const matchupWinRates = useMemo(() => {
    const map = new Map<number, number>()
    if (!me) return map
    for (const c of counters.data ?? []) {
      if (c.hero_id === me.hero_id && c.matches_played > 0) {
        map.set(c.enemy_hero_id, (c.wins / c.matches_played) * 100)
      }
    }
    return map
  }, [counters.data, me])

  function setLane(enemyAccountId: number, lane: string) {
    setLanes((prev) => {
      const next = { ...prev, [enemyAccountId]: lane }
      if (lane === '') delete next[enemyAccountId]
      try {
        localStorage.setItem(`dc.lanes.${match.match_id}`, JSON.stringify(next))
      } catch {
        // storage unavailable; lanes just won't persist
      }
      return next
    })
  }

  const sortedEnemies = useMemo(() => {
    const order = (p: { account_id: number }) => {
      const lane = lanes[p.account_id]
      const idx = lane ? LANES.indexOf(lane as (typeof LANES)[number]) : -1
      return idx === -1 ? LANES.length : idx
    }
    return [...enemies].sort((a, b) => order(a) - order(b))
  }, [enemies, lanes])

  const persona = (id: number) => profiles.data?.get(id)?.personaname ?? `#${id}`
  const gameTime = Math.max(0, nowSec - match.start_time)
  const avgBadge = averageBadge(accountIds.map((id) => badges.get(id) ?? 0))

  return (
    <>
      <div className="live-head">
        <div className="live-row">
          <span className="live-chip">My Match</span>
          <span className="match-id">Match #{match.match_id}</span>
        </div>
        <div className="clock">{formatClock(gameTime)}</div>
        <div className="meta">
          {match.match_mode_parsed ?? 'Unknown mode'}
          {match.region_mode_parsed ? ` · ${match.region_mode_parsed}` : ''}
          {avgBadge !== null && ` · avg rank ${rankName(avgBadge, rankAssets.data)}`}
          {myHero && ` · you are playing ${myHero.name}`}
        </div>
        <div className="actions">
          <button
            className="btn btn-solid"
            onClick={() => {
              syncClockFromLive(Math.max(0, Date.now() / 1000 - match.start_time))
              navigate('/timers')
            }}
          >
            Sync spawn timers
          </button>{' '}
          <Link className="btn" to={`/live/${match.match_id}`}>
            Live view
          </Link>
        </div>
      </div>

      <section className="team-section">
        <div className="team-title" style={{ borderLeftColor: '#a33c2e' }}>
          <h3>Enemies — {TEAMS[myTeam === 0 ? 1 : 0].name}</h3>
          <span className="team-note">
            assign lanes to keep track · counter items are for {myHero?.name ?? 'your hero'}
          </span>
        </div>
        <div className="enemy-list">
          {sortedEnemies.map((p) => {
            const hero = heroes.data?.get(p.hero_id)
            const heroWr = heroWinRates.get(p.hero_id)
            const vsWr = matchupWinRates.get(p.hero_id)
            const isOpen = openEnemy === p.account_id
            return (
              <div key={p.account_id} className="enemy-block">
                <div className="enemy-row">
                  {hero && (
                    <img
                      className="enemy-hero"
                      src={hero.images.icon_hero_card_webp}
                      alt=""
                      loading="lazy"
                    />
                  )}
                  <span className="enemy-who">
                    <Link className="enemy-name" to={`/heroes/${p.hero_id}`}>
                      {hero?.name ?? `Hero ${p.hero_id}`}
                    </Link>
                    <span className="persona-cell">
                      <Link className="player-link dim-link" to={`/players/${p.account_id}`}>
                        {persona(p.account_id)}
                      </Link>
                      <RankBadge badge={badges.get(p.account_id)} />
                    </span>
                  </span>
                  <span className="enemy-stat">
                    <span className="stat-label">Hero WR</span>
                    <span className={`mono ${heroWr !== undefined ? winRateClass(heroWr) : ''}`}>
                      {heroWr !== undefined ? `${heroWr.toFixed(1)}%` : '—'}
                    </span>
                  </span>
                  <span className="enemy-stat">
                    <span className="stat-label">{myHero?.name ?? 'You'} vs</span>
                    <span className={`mono ${vsWr !== undefined ? winRateClass(vsWr) : ''}`}>
                      {vsWr !== undefined ? `${vsWr.toFixed(1)}%` : '—'}
                    </span>
                  </span>
                  <span className="enemy-stat">
                    <span className="stat-label">Lane</span>
                    <select
                      value={lanes[p.account_id] ?? ''}
                      onChange={(e) => setLane(p.account_id, e.target.value)}
                      aria-label="Assign lane"
                    >
                      <option value="">—</option>
                      {LANES.map((lane) => (
                        <option key={lane} value={lane}>
                          {lane}
                        </option>
                      ))}
                    </select>
                  </span>
                  <button
                    className="btn btn-small"
                    onClick={() => setOpenEnemy(isOpen ? null : p.account_id)}
                  >
                    {isOpen ? 'Hide counters' : 'Counters'}
                  </button>
                </div>
                {isOpen && me && hero && (
                  <div className="enemy-counters">
                    <CounterItems
                      heroId={me.hero_id}
                      enemy={hero}
                      heroName={myHero?.name ?? 'you'}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section className="team-section">
        <div className="team-title" style={{ borderLeftColor: TEAMS[myTeam].color }}>
          <h3>Your team — {TEAMS[myTeam].name}</h3>
        </div>
        <ul className="live-roster">
          {allies.map((p) => {
            const hero = heroes.data?.get(p.hero_id)
            return (
              <li key={p.account_id}>
                {hero && <img className="hero" src={hero.images.icon_image_small_webp} alt="" />}
                <span>
                  {hero?.name ?? `Hero ${p.hero_id}`}
                  {p.account_id === accountId ? ' (you)' : ''}
                </span>
                <span className="persona-cell">
                  <Link className="player-link" to={`/players/${p.account_id}`}>
                    {persona(p.account_id)}
                  </Link>
                  <RankBadge badge={badges.get(p.account_id)} />
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      <p className="live-note">
        Live data refreshes every minute and can lag a couple of minutes behind the true game
        state. Lane assignments are saved on this device for this match only.
      </p>
    </>
  )
}
