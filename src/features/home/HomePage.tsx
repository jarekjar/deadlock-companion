import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useHeroAnalytics, useHeroes } from '../../lib/queries'
import './home.css'

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
      .slice(0, 9)
  }, [heroes.data, analytics.data])

  return (
    <>
      <div className="home-intro">
        <h2>Every timer, every stat, one place</h2>
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
