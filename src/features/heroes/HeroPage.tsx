import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { type ItemAsset, type ItemStat } from '../../lib/api'
import ItemHover from '../../components/ItemHover'
import { useHeroAnalytics, useHeroes, useHeroItemStats, useItems } from '../../lib/queries'
import { formatClock } from '../timers/timerEngine'
import { winRateClass } from '../../lib/winrate'
import '../players/players.css'
import './heroes.css'

const TIER_LABELS = ['Tier I', 'Tier II', 'Tier III', 'Tier IV']
const MIN_ITEM_MATCHES = 500

export default function HeroPage() {
  const params = useParams()
  const heroId = Number(params.heroId)
  if (!Number.isInteger(heroId) || heroId <= 0) {
    return <div className="page-note error">Invalid hero id</div>
  }
  return <Hero heroId={heroId} />
}

function Hero({ heroId }: { heroId: number }) {
  const heroes = useHeroes()
  const analytics = useHeroAnalytics()
  const itemStats = useHeroItemStats(heroId)
  const items = useItems()

  const hero = heroes.data?.get(heroId)
  const stat = analytics.data?.find((s) => s.hero_id === heroId)
  const totalMatches = analytics.data
    ? analytics.data.reduce((s, h) => s + h.matches, 0) / 12
    : null

  const byTier = useMemo(() => {
    if (!itemStats.data || !items.data || !stat) return null
    const tiers: { item: ItemAsset; stats: ItemStat; usage: number; winRate: number }[][] = [
      [],
      [],
      [],
      [],
    ]
    for (const row of itemStats.data) {
      const item = items.data.get(row.item_id)
      if (!item || item.type !== 'upgrade' || item.shopable === false) continue
      const tier = (item.item_tier ?? 1) - 1
      if (tier < 0 || tier > 3 || row.matches < MIN_ITEM_MATCHES) continue
      tiers[tier].push({
        item,
        stats: row,
        usage: (row.matches / stat.matches) * 100,
        winRate: (row.wins / row.matches) * 100,
      })
    }
    for (const tier of tiers) tier.sort((a, b) => b.stats.matches - a.stats.matches)
    return tiers.map((t) => t.slice(0, 8))
  }, [itemStats.data, items.data, stat])

  if (heroes.isError || analytics.isError) {
    return <div className="page-note error">Could not load this hero</div>
  }
  if (!hero || !stat || !totalMatches) return <div className="page-note">Loading hero</div>

  const winRate = (stat.wins / stat.matches) * 100
  const pickRate = (stat.matches / totalMatches) * 100

  return (
    <>
      <div className="hero-head">
        <img src={hero.images.icon_hero_card_webp} alt="" style={{ objectPosition: 'top' }} />
        <h2>{hero.name}</h2>
        <span className="actions">
          <Link className="btn" to={`/matchups/${hero.id}`}>
            Matchups
          </Link>
        </span>
      </div>

      <div className="stat-row">
        <div className="stat-tile">
          <div className="stat-label">Win rate</div>
          <div className={`stat-value ${winRateClass(winRate)}`}>{winRate.toFixed(1)}%</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Pick rate</div>
          <div className="stat-value">{pickRate.toFixed(1)}%</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Matches, 30d</div>
          <div className="stat-value">
            {new Intl.NumberFormat('en', { notation: 'compact' }).format(stat.matches)}
          </div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Heroes ranked</div>
          <div className="stat-value">
            {analytics.data
              ? [...analytics.data]
                  .sort((a, b) => b.wins / b.matches - a.wins / a.matches)
                  .findIndex((s) => s.hero_id === heroId) + 1
              : '—'}
            <span style={{ fontSize: 14 }}> / {analytics.data?.length}</span>
          </div>
        </div>
      </div>

      {byTier ? (
        byTier.map((rows, tier) =>
          rows.length === 0 ? null : (
            <section key={tier} className="data-section">
              <h3>{TIER_LABELS[tier]} — most popular items</h3>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Usage</th>
                      <th>Win rate</th>
                      <th>Avg buy time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ item, stats, usage, winRate: wr }) => (
                      <tr key={item.id}>
                        <td>
                          <span className="item-cell">
                            <ItemHover item={item} size={24} />
                            {item.name}
                          </span>
                        </td>
                        <td className="mono">{usage.toFixed(1)}%</td>
                        <td className={`mono ${winRateClass(wr)}`}>{wr.toFixed(1)}%</td>
                        <td className="mono">{formatClock(stats.avg_buy_time_s)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ),
        )
      ) : (
        <div className="page-note">Loading item stats</div>
      )}
      <p className="grid-note" style={{ marginTop: 18 }}>
        Last 30 days, all ranks. Win rate is for matches where the item was bought — popular
        late-game items skew high because buying them means the game already went well.
      </p>
    </>
  )
}
