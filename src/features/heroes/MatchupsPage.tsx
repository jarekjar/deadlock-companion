import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { itemIcon, type HeroAsset } from '../../lib/api'
import { useCounterItems, useHeroCounters, useHeroes, useItems } from '../../lib/queries'
import { winRateClass } from '../../lib/winrate'
import HeroBrowser from './HeroBrowser'
import '../players/players.css'
import './heroes.css'

const MIN_COUNTER_ITEM_MATCHES = 150

export default function MatchupsPage() {
  const params = useParams()
  const heroId = params.heroId ? Number(params.heroId) : null
  const heroes = useHeroes()

  if (heroId === null) {
    return (
      <>
        <p className="grid-note">Pick a hero to see their matchups.</p>
        <HeroBrowser linkTo={(id) => `/matchups/${id}`} />
      </>
    )
  }

  const strip = heroes.data
    ? [...heroes.data.values()].sort((a, b) => a.name.localeCompare(b.name))
    : null

  return (
    <>
      {strip && (
        <div className="hero-strip">
          {strip.map((h) => (
            <Link
              key={h.id}
              to={`/matchups/${h.id}`}
              className={h.id === heroId ? 'selected' : ''}
              title={h.name}
            >
              <img src={h.images.icon_image_small_webp} alt={h.name} loading="lazy" />
              <span>{h.name}</span>
            </Link>
          ))}
        </div>
      )}
      {heroes.data && <MatchupTable heroId={heroId} heroes={heroes.data} />}
    </>
  )
}

type MatchupSortKey = 'win' | 'matches' | 'name'

function MatchupTable({ heroId, heroes }: { heroId: number; heroes: Map<number, HeroAsset> }) {
  const counters = useHeroCounters()
  const [openEnemy, setOpenEnemy] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<MatchupSortKey>('win')
  const [descending, setDescending] = useState(false)

  const rows = useMemo(() => {
    if (!counters.data) return null
    const needle = search.trim().toLowerCase()
    const dir = descending ? -1 : 1
    return counters.data
      .filter((c) => c.hero_id === heroId && c.matches_played > 0)
      .flatMap((c) => {
        const enemy = heroes.get(c.enemy_hero_id)
        if (!enemy) return []
        if (needle && !enemy.name.toLowerCase().includes(needle)) return []
        return [
          {
            enemy,
            matches: c.matches_played,
            winRate: (c.wins / c.matches_played) * 100,
          },
        ]
      })
      .sort((a, b) => {
        switch (sortKey) {
          case 'win':
            return dir * (a.winRate - b.winRate)
          case 'matches':
            return dir * (a.matches - b.matches)
          case 'name':
            return dir * a.enemy.name.localeCompare(b.enemy.name)
        }
      })
  }, [counters.data, heroId, heroes, search, sortKey, descending])

  const hero = heroes.get(heroId)

  if (counters.isError) return <div className="page-note error">Could not load matchups</div>
  if (!rows || !hero) return <div className="page-note">Loading matchups</div>

  return (
    <section className="data-section">
      <h3>{hero.name} — matchups, last 30 days</h3>
      <div className="control-bar">
        <span className="cb-group cb-search">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search opponents"
            aria-label="Search opponents"
          />
        </span>
        <span className="cb-group">
          <span className="cb-label">Sort</span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as MatchupSortKey)}
            aria-label="Sort matchups"
          >
            <option value="win">Win rate</option>
            <option value="matches">Matches</option>
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
      </div>
      <span className="dim-note">win rate ascending = toughest opponents first</span>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Against</th>
              <th>Matches</th>
              <th>Win rate</th>
              <th>Counter items</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ enemy, matches, winRate }) => {
              const isOpen = openEnemy === enemy.id
              const row = (
                <tr key={enemy.id}>
                  <td>
                    <span className="hero-cell">
                      <img src={enemy.images.icon_image_small_webp} alt="" loading="lazy" />
                      {enemy.name}
                    </span>
                  </td>
                  <td className="mono">{matches.toLocaleString()}</td>
                  <td className={`mono ${winRateClass(winRate)}`}>{winRate.toFixed(1)}%</td>
                  <td>
                    <button
                      className="btn-quiet"
                      onClick={() => setOpenEnemy(isOpen ? null : enemy.id)}
                    >
                      {isOpen ? 'hide' : 'show'}
                    </button>
                  </td>
                </tr>
              )
              if (!isOpen) return row
              return [
                row,
                <tr key={`${enemy.id}-counters`} className="counter-tr">
                  <td colSpan={4}>
                    <CounterItems heroId={heroId} enemy={enemy} heroName={hero.name} />
                  </td>
                </tr>,
              ]
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function CounterItems({
  heroId,
  enemy,
  heroName,
}: {
  heroId: number
  enemy: HeroAsset
  heroName: string
}) {
  const stats = useCounterItems(heroId, enemy.id)
  const items = useItems()

  const rows = useMemo(() => {
    if (!stats.data || !items.data) return null
    return stats.data
      .flatMap((row) => {
        const item = items.data.get(row.item_id)
        if (!item || item.type !== 'upgrade' || item.shopable === false) return []
        if (row.matches < MIN_COUNTER_ITEM_MATCHES) return []
        return [{ item, matches: row.matches, winRate: (row.wins / row.matches) * 100 }]
      })
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 9)
  }, [stats.data, items.data])

  if (stats.isError) return <span className="counter-note">Could not load counter items</span>
  if (!rows) return <span className="counter-note">Loading counter items</span>
  if (rows.length === 0) {
    return <span className="counter-note">Not enough data for this matchup yet</span>
  }

  return (
    <>
      <div className="counter-note">
        Best win rates for {heroName} when these items are bought in matches against {enemy.name}.
      </div>
      <div className="counter-list">
        {rows.map(({ item, matches, winRate }) => (
          <span key={item.id} className="counter-item">
            {itemIcon(item) && <img src={itemIcon(item)} alt="" loading="lazy" />}
            <span>{item.name}</span>
            <span className={`ci-wr ${winRateClass(winRate)}`}>{winRate.toFixed(1)}%</span>
            <span className="ci-n">({matches.toLocaleString()})</span>
          </span>
        ))}
      </div>
    </>
  )
}
