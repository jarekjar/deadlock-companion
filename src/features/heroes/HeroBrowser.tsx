import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useHeroAnalytics, useHeroes } from '../../lib/queries'
import { winRateClass } from '../../lib/winrate'
import { bracketLabel, useRankFilter } from '../../lib/rankFilter'
import RankFilterControl from '../../shared/RankFilterControl'
import { modeLabel, useModeFilter } from '../../lib/modeFilter'
import ModeFilterControl from '../../shared/ModeFilterControl'
import '../players/players.css'
import './heroes.css'

type SortKey = 'pick' | 'win' | 'name'

/**
 * Searchable, sortable grid of big hero cards. Shared by the Heroes index and
 * the Matchups hero picker — only the link target differs.
 */
export default function HeroBrowser({ linkTo }: { linkTo: (heroId: number) => string }) {
  const heroes = useHeroes()
  const { minBadge } = useRankFilter()
  const { mode } = useModeFilter()
  const analytics = useHeroAnalytics(minBadge, mode)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('pick')
  const [descending, setDescending] = useState(true)
  const [complexity, setComplexity] = useState(0)

  const rows = useMemo(() => {
    if (!heroes.data || !analytics.data) return null
    const totalMatches = analytics.data.reduce((s, h) => s + h.matches, 0) / 12
    const needle = search.trim().toLowerCase()
    const filtered = analytics.data.flatMap((stat) => {
      const hero = heroes.data.get(stat.hero_id)
      if (!hero || stat.matches === 0) return []
      if (needle && !hero.name.toLowerCase().includes(needle)) return []
      if (complexity > 0 && hero.complexity !== complexity) return []
      return [
        {
          hero,
          winRate: (stat.wins / stat.matches) * 100,
          pickRate: (stat.matches / totalMatches) * 100,
        },
      ]
    })
    const dir = descending ? -1 : 1
    return filtered.sort((a, b) => {
      switch (sortKey) {
        case 'pick':
          return dir * (a.pickRate - b.pickRate)
        case 'win':
          return dir * (a.winRate - b.winRate)
        case 'name':
          return dir * b.hero.name.localeCompare(a.hero.name)
      }
    })
  }, [heroes.data, analytics.data, search, sortKey, descending, complexity])

  if (analytics.isError || heroes.isError) {
    return <div className="page-note error">Could not load hero stats</div>
  }

  return (
    <>
      <div className="control-bar">
        <span className="cb-group cb-search">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search heroes"
            aria-label="Search heroes"
          />
        </span>
        <span className="cb-group">
          <span className="cb-label">Sort</span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            aria-label="Sort heroes"
          >
            <option value="pick">Pick rate</option>
            <option value="win">Win rate</option>
            <option value="name">Name</option>
          </select>
          <button
            className="cb-dir"
            onClick={() => setDescending((d) => !d)}
            title="Toggle sort direction"
          >
            {descending ? 'Desc' : 'Asc'}
          </button>
        </span>
        <span className="cb-group">
          <span className="cb-label">Complexity</span>
          <select
            value={complexity}
            onChange={(e) => setComplexity(Number(e.target.value))}
            aria-label="Filter by complexity"
          >
            <option value={0}>All</option>
            <option value={1}>Simple</option>
            <option value={2}>Moderate</option>
            <option value={3}>Complex</option>
          </select>
        </span>
        <RankFilterControl />
        <ModeFilterControl />
      </div>
      <p className="grid-note">
        Win and pick rates, last 30 days · {bracketLabel(minBadge, mode)} · {modeLabel(mode)}.
      </p>
      {!rows ? (
        <div className="page-note">Loading hero stats</div>
      ) : rows.length === 0 ? (
        <div className="page-note">No heroes match</div>
      ) : (
        <div className="hero-grid">
          {rows.map(({ hero, winRate, pickRate }, index) => (
            <Link
              key={hero.id}
              className="hero-card"
              to={linkTo(hero.id)}
              style={{ '--i': index } as React.CSSProperties}
            >
              <img src={hero.images.icon_hero_card_webp} alt="" loading="lazy" />
              <span className="hc-body">
                <span className="hc-name">{hero.name}</span>
                <span className="hc-stats">
                  <span className={winRateClass(winRate)}>{winRate.toFixed(1)}%</span>
                  <span className="pick">{pickRate.toFixed(1)}% pick</span>
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
