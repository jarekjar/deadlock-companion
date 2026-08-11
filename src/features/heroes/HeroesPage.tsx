import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useHeroAnalytics, useHeroes } from '../../lib/queries'
import { winRateClass } from '../../lib/winrate'
import '../players/players.css'
import './heroes.css'

export default function HeroesPage() {
  const heroes = useHeroes()
  const analytics = useHeroAnalytics()

  const rows = useMemo(() => {
    if (!heroes.data || !analytics.data) return null
    const totalMatches = analytics.data.reduce((s, h) => s + h.matches, 0) / 12
    return analytics.data
      .flatMap((stat) => {
        const hero = heroes.data.get(stat.hero_id)
        if (!hero || stat.matches === 0) return []
        return [
          {
            hero,
            winRate: (stat.wins / stat.matches) * 100,
            pickRate: (stat.matches / totalMatches) * 100,
          },
        ]
      })
      .sort((a, b) => b.pickRate - a.pickRate)
  }, [heroes.data, analytics.data])

  if (analytics.isError || heroes.isError) {
    return <div className="page-note error">Could not load hero stats</div>
  }
  if (!rows) return <div className="page-note">Loading hero stats</div>

  return (
    <>
      <p className="grid-note">Win and pick rates from all matches in the last 30 days.</p>
      <div className="hero-grid">
        {rows.map(({ hero, winRate, pickRate }) => (
          <Link key={hero.id} className="hero-tile" to={`/heroes/${hero.id}`}>
            <img src={hero.images.icon_image_small_webp} alt="" />
            <span className="ht-name">{hero.name}</span>
            <span className="ht-stats">
              <span className={winRateClass(winRate)}>{winRate.toFixed(1)}%</span>
              <span className="pick">{pickRate.toFixed(1)}% pick</span>
            </span>
          </Link>
        ))}
      </div>
    </>
  )
}
