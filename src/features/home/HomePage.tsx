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
import { usePageMeta } from '../../lib/usePageMeta'
import '../players/players.css'
import '../live/live.css'
import './home.css'

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })

const FEATURES = [
  {
    to: '/timers',
    title: 'Spawn Timers',
    text: 'A synced match clock with live countdowns, spawn alerts, and an objective map — camps, Sinner’s Sacrifice, bridge buffs, the Mid-Boss ladder, and the Soul Urn.',
  },
  {
    to: '/my-match',
    title: 'My Match',
    text: 'A prep board for every game: pick your hero and the enemy team for matchup win rates, counter items, and lane tracking — or fill it from your live match.',
  },
  {
    to: '/players',
    title: 'Player Profiles',
    text: 'Look up anyone by Steam link, ID, or name: win rate, KDA, favorite and best heroes, favorite items, rank badges, and a filterable match history.',
  },
  {
    to: '/players',
    title: 'Match Breakdowns',
    text: 'Full scoreboards for both teams, the souls race over time, every player’s item build with buy times, and the Mid-Boss log.',
  },
  {
    to: '/heroes',
    title: 'Heroes',
    text: 'Every hero’s lore, abilities with rank buffs, base stats and weapon, plus 30-day win rates and the most popular items per tier.',
  },
  {
    to: '/items',
    title: 'Items',
    text: 'Every shop item with what it does, usage and win rates, and its pick rate per hero — hover any item anywhere for the details.',
  },
  {
    to: '/matchups',
    title: 'Matchups & Counters',
    text: 'See who your hero struggles against — and the items that actually win those specific games, from millions of real matches.',
  },
  {
    to: '/live',
    title: 'Live Matches',
    text: 'Browse ongoing games with live soul counts and average ranks, watch in Deadlock, and sync the spawn timers to any match in one click.',
  },
]

export default function HomePage() {
  usePageMeta(
    'The Cursed Apple — Deadlock Companion',
    'Spawn timers that sync to your live game, a match prep board with counter items, player and match stats, hero and item meta, leaderboards, and live matches for Valve’s Deadlock.',
  )
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
          Spawn timers that sync to your live game, a prep board for every match, deep player
          and match stats, the full hero and item meta, and live games to watch — all free, no
          account needed.
        </p>
      </div>

      {artHeroes && (
        <div className="home-art">
          <div className="home-art-track">
            {[...artHeroes, ...artHeroes].map((hero, index) => {
              const isClone = index >= artHeroes.length
              return (
                <Link
                  key={`${hero.id}-${index}`}
                  to={`/heroes/${hero.id}`}
                  tabIndex={isClone ? -1 : 0}
                  aria-hidden={isClone || undefined}
                >
                  <img
                    src={hero.images.icon_hero_card_webp}
                    alt={isClone ? '' : hero.name}
                    loading="lazy"
                  />
                  <span>{hero.name}</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      <div className="home-promo">
        <div className="promo-text">
          <h3>Prep your next match</h3>
          <p>
            Pick your hero and the enemy team on the My Match board and get matchup win rates,
            counter items, spawn timers, and lane tracking — ready before the horn. Sign in
            through Steam and it can even fill itself from your live game.
          </p>
        </div>
        <Link className="btn btn-solid" to="/my-match">
          Try My Match
        </Link>
      </div>

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
        Open My Match before your next game, or paste your Steam profile link under Players.
        Sign in through Steam to pin your profile and auto-fill your live match.
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

  // reserve the section's height while loading so the grid below doesn't shift
  if (!top) return <section className="home-live home-live-pending" aria-hidden />
  if (top.length === 0) return null

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
