import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { averageBadge, rankName } from '../../lib/api'
import { TEAMS } from '../../lib/teams'
import {
  useActiveMatches,
  useHeroAnalytics,
  useHeroes,
  useRankAssets,
  useRanks,
} from '../../lib/queries'
import { formatClock } from '../timers/timerEngine'
import '../players/players.css'
import '../live/live.css'
import './home.css'

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })

const FEATURES = [
  {
    to: '/timers',
    title: 'Spawn Timers',
    text: 'A match clock you sync once, then live countdowns for camps, Sinner’s Sacrifice, bridge buffs, the Mid-Boss ladder, and the Soul Urn — with optional alerts.',
  },
  {
    to: '/players',
    title: 'Player Profiles',
    text: 'Look up any player by Steam link, ID, or name: win rate, KDA, souls per minute, hero breakdowns, and a filterable match history.',
  },
  {
    to: '/players',
    title: 'Match Breakdowns',
    text: 'Full scoreboards for both teams, the souls race over time, every player’s item build with timings, and the Mid-Boss log.',
  },
  {
    to: '/heroes',
    title: 'Hero Meta',
    text: 'Win and pick rates for every hero over the last 30 days, and the most popular items per tier with their win rates.',
  },
  {
    to: '/matchups',
    title: 'Matchups & Counters',
    text: 'See who your hero struggles against — and the items that actually win those games, from millions of real matches.',
  },
  {
    to: '/live',
    title: 'Live Matches',
    text: 'Browse ongoing games with live soul counts, follow a friend’s match, and sync the spawn timers to it in one click.',
  },
]

export default function HomePage() {
  const heroes = useHeroes()
  const analytics = useHeroAnalytics()

  const artHeroes = useMemo(() => {
    if (!heroes.data || !analytics.data) return null
    return [...analytics.data]
      .sort((a, b) => b.matches - a.matches)
      .flatMap((s) => {
        const hero = heroes.data.get(s.hero_id)
        return hero ? [hero] : []
      })
  }, [heroes.data, analytics.data])

  return (
    <>
      <div className="home-intro">
        <h2>Your one-stop shop for Deadlock</h2>
        <p>
          A companion for Valve's Deadlock: spawn timers you can trust mid-match, deep stats for
          you and your friends, the current hero meta, and live games — all free, no account
          needed.
        </p>
      </div>

      {artHeroes && (
        <div className="home-art">
          {artHeroes.map((hero) => (
            <Link key={hero.id} to={`/heroes/${hero.id}`} title={hero.name}>
              <img src={hero.images.icon_hero_card_webp} alt={hero.name} loading="lazy" />
            </Link>
          ))}
        </div>
      )}

      <LiveNow />

      <div className="home-features">
        {FEATURES.map((f) => (
          <Link key={f.title} className="feature-tile" to={f.to}>
            <h3>{f.title}</h3>
            <p>{f.text}</p>
          </Link>
        ))}
      </div>

      <p className="home-cta">
        Start with the timers before your next match, or paste your Steam profile link under
        Players. Sign in through Steam to pin your own profile.
      </p>
    </>
  )
}

function LiveNow() {
  const active = useActiveMatches()
  const heroes = useHeroes()
  const [nowSec, setNowSec] = useState(() => Date.now() / 1000)

  useEffect(() => {
    const id = window.setInterval(() => setNowSec(Date.now() / 1000), 1000)
    return () => window.clearInterval(id)
  }, [])

  const top = useMemo(
    () =>
      active.data ? [...active.data].sort((a, b) => b.spectators - a.spectators).slice(0, 3) : null,
    [active.data],
  )
  const allIds = useMemo(
    () => top?.flatMap((m) => m.players.map((p) => p.account_id)) ?? [],
    [top],
  )
  const badges = useRanks(allIds)
  const rankAssets = useRankAssets()

  if (!top || top.length === 0) return null

  return (
    <section className="home-live">
      <div className="home-live-head">
        <span className="live-chip">Live now</span>
        <Link to="/live" className="btn-quiet">
          all live matches
        </Link>
      </div>
      <div className="home-live-rows">
        {top.map((m) => (
          <Link key={m.match_id} className="home-live-row" to={`/live/${m.match_id}`}>
            <span className="mono clock">{formatClock(Math.max(0, nowSec - m.start_time))}</span>
            <span className="hero-cluster">
              {m.players
                .filter((p) => p.team === 0)
                .map((p, i) => {
                  const hero = heroes.data?.get(p.hero_id)
                  return hero ? (
                    <img key={i} src={hero.images.icon_image_small_webp} alt="" title={hero.name} />
                  ) : null
                })}
            </span>
            <span className="souls">
              <span style={{ color: TEAMS[0].color }}>{compact.format(m.net_worth_team_0)}</span>
              {' — '}
              <span style={{ color: TEAMS[1].color }}>{compact.format(m.net_worth_team_1)}</span>
            </span>
            <span className="hero-cluster">
              {m.players
                .filter((p) => p.team === 1)
                .map((p, i) => {
                  const hero = heroes.data?.get(p.hero_id)
                  return hero ? (
                    <img key={i} src={hero.images.icon_image_small_webp} alt="" title={hero.name} />
                  ) : null
                })}
            </span>
            <span className="watching">
              {(() => {
                const avg = averageBadge(m.players.map((p) => badges.get(p.account_id) ?? 0))
                return avg !== null ? `avg ${rankName(avg, rankAssets.data)} · ` : ''
              })()}
              {m.spectators} watching
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
