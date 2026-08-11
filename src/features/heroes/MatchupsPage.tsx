import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { type HeroAsset } from '../../lib/api'
import { useCounterItems, useHeroCounters, useHeroes, useItems } from '../../lib/queries'
import { winRateClass } from '../../lib/winrate'
import '../players/players.css'
import './heroes.css'

const MIN_COUNTER_ITEM_MATCHES = 150

export default function MatchupsPage() {
  const params = useParams()
  const heroId = params.heroId ? Number(params.heroId) : null
  const heroes = useHeroes()

  const strip = useMemo(
    () =>
      heroes.data
        ? [...heroes.data.values()].sort((a, b) => a.name.localeCompare(b.name))
        : null,
    [heroes.data],
  )

  return (
    <>
      <p className="grid-note">
        {heroId ? 'Matchups for the selected hero, last 30 days.' : 'Pick a hero to see their matchups.'}
      </p>
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
            </Link>
          ))}
        </div>
      )}
      {heroId !== null && heroes.data && (
        <MatchupTable heroId={heroId} heroes={heroes.data} />
      )}
    </>
  )
}

function MatchupTable({ heroId, heroes }: { heroId: number; heroes: Map<number, HeroAsset> }) {
  const counters = useHeroCounters()
  const [openEnemy, setOpenEnemy] = useState<number | null>(null)

  const rows = useMemo(() => {
    if (!counters.data) return null
    return counters.data
      .filter((c) => c.hero_id === heroId && c.matches_played > 0)
      .flatMap((c) => {
        const enemy = heroes.get(c.enemy_hero_id)
        if (!enemy) return []
        return [
          {
            enemy,
            matches: c.matches_played,
            winRate: (c.wins / c.matches_played) * 100,
          },
        ]
      })
      .sort((a, b) => a.winRate - b.winRate)
  }, [counters.data, heroId, heroes])

  const hero = heroes.get(heroId)

  if (counters.isError) return <div className="page-note error">Could not load matchups</div>
  if (!rows || !hero) return <div className="page-note">Loading matchups</div>

  return (
    <section className="data-section">
      <h3>{hero.name} — toughest opponents first</h3>
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
            {item.image && <img src={item.image} alt="" loading="lazy" />}
            <span>{item.name}</span>
            <span className={`ci-wr ${winRateClass(winRate)}`}>{winRate.toFixed(1)}%</span>
            <span className="ci-n">({matches.toLocaleString()})</span>
          </span>
        ))}
      </div>
    </>
  )
}
