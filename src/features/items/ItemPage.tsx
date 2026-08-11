import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { itemDescription, itemIcon, itemMeta } from '../../lib/api'
import {
  useAllItemStats,
  useHeroAnalytics,
  useHeroes,
  useHeroStatsWithItem,
  useItems,
} from '../../lib/queries'
import { formatClock } from '../timers/timerEngine'
import { winRateClass } from '../../lib/winrate'
import { usePageMeta } from '../../lib/usePageMeta'
import '../players/players.css'
import '../heroes/heroes.css'
import './items.css'

const MIN_HERO_ROWS_MATCHES = 50
const compactFmt = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })

type HeroSortKey = 'pick' | 'win' | 'matches' | 'name'

export default function ItemPage() {
  const params = useParams()
  const itemId = Number(params.itemId)
  if (!Number.isInteger(itemId) || itemId <= 0) {
    return <div className="page-note error">Invalid item id</div>
  }
  return <Item itemId={itemId} />
}

function Item({ itemId }: { itemId: number }) {
  const items = useItems()
  const allStats = useAllItemStats()
  const heroAnalytics = useHeroAnalytics()
  const withItem = useHeroStatsWithItem(itemId)
  const heroes = useHeroes()

  const item = items.data?.get(itemId)
  usePageMeta(
    item
      ? `${item.name} — Deadlock Item Stats — The Cursed Apple`
      : 'Deadlock Item Stats — The Cursed Apple',
    item
      ? `${item.name} in Deadlock: what it does, usage and win rate, and which heroes buy it most.`
      : undefined,
  )
  const globalStat = allStats.data?.find((s) => s.item_id === itemId)
  // item stats count player-slots (12 per match), so the denominator does too
  const totalPlayerSlots = heroAnalytics.data
    ? heroAnalytics.data.reduce((s, h) => s + h.matches, 0)
    : null

  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<HeroSortKey>('pick')
  const [descending, setDescending] = useState(true)

  const heroRows = useMemo(() => {
    if (!withItem.data || !heroAnalytics.data || !heroes.data) return null
    const totals = new Map(heroAnalytics.data.map((h) => [h.hero_id, h]))
    const needle = search.trim().toLowerCase()
    const dir = descending ? -1 : 1
    return withItem.data
      .flatMap((row) => {
        const hero = heroes.data.get(row.hero_id)
        const total = totals.get(row.hero_id)
        if (!hero || !total || row.matches < MIN_HERO_ROWS_MATCHES) return []
        if (needle && !hero.name.toLowerCase().includes(needle)) return []
        return [
          {
            hero,
            matches: row.matches,
            pickRate: (row.matches / total.matches) * 100,
            winRate: (row.wins / row.matches) * 100,
          },
        ]
      })
      .sort((a, b) => {
        switch (sortKey) {
          case 'pick':
            return dir * (a.pickRate - b.pickRate)
          case 'win':
            return dir * (a.winRate - b.winRate)
          case 'matches':
            return dir * (a.matches - b.matches)
          case 'name':
            return dir * b.hero.name.localeCompare(a.hero.name)
        }
      })
  }, [withItem.data, heroAnalytics.data, heroes.data, search, sortKey, descending])

  if (items.isError) return <div className="page-note error">Could not load items</div>
  if (!items.data) return <div className="page-note">Loading item</div>
  if (!item) return <div className="page-note error">Unknown item</div>

  const description = itemDescription(item)

  return (
    <>
      <div className="item-head">
        {itemIcon(item) && <img src={itemIcon(item)} alt="" />}
        <div>
          <h2>{item.name}</h2>
          <div className="meta">{itemMeta(item)}</div>
        </div>
      </div>

      {description && <p className="item-desc">{description}</p>}

      <div className="stat-row">
        <div className="stat-tile">
          <div className="stat-label">Usage</div>
          <div className="stat-value">
            {globalStat && totalPlayerSlots
              ? `${((globalStat.matches / totalPlayerSlots) * 100).toFixed(1)}%`
              : '—'}
          </div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Win rate</div>
          <div
            className={`stat-value ${
              globalStat ? winRateClass((globalStat.wins / globalStat.matches) * 100) : ''
            }`}
          >
            {globalStat ? `${((globalStat.wins / globalStat.matches) * 100).toFixed(1)}%` : '—'}
          </div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Avg buy time</div>
          <div className="stat-value">
            {globalStat ? formatClock(globalStat.avg_buy_time_s) : '—'}
          </div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Matches, 30d</div>
          <div className="stat-value">{globalStat ? compactFmt.format(globalStat.matches) : '—'}</div>
        </div>
      </div>

      <section className="data-section">
        <h3>Pick rate per hero</h3>
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
              onChange={(e) => setSortKey(e.target.value as HeroSortKey)}
              aria-label="Sort heroes"
            >
              <option value="pick">Pick rate</option>
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
        {!heroRows ? (
          <div className="page-note">Loading hero data</div>
        ) : heroRows.length === 0 ? (
          <div className="page-note">Not enough data</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Hero</th>
                  <th>Pick rate with item</th>
                  <th>Win rate with item</th>
                  <th>Matches</th>
                </tr>
              </thead>
              <tbody>
                {heroRows.map(({ hero, matches, pickRate, winRate }) => (
                  <tr key={hero.id}>
                    <td>
                      <span className="hero-cell">
                        <img src={hero.images.icon_image_small_webp} alt="" loading="lazy" />
                        <Link className="player-link" to={`/heroes/${hero.id}`}>
                          {hero.name}
                        </Link>
                      </span>
                    </td>
                    <td className="mono">{pickRate.toFixed(1)}%</td>
                    <td className={`mono ${winRateClass(winRate)}`}>{winRate.toFixed(1)}%</td>
                    <td className="mono">{matches.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="grid-note" style={{ marginTop: 14 }}>
          Last 30 days, all ranks. Pick rate is the share of that hero's matches where the item
          was bought.
        </p>
      </section>
    </>
  )
}
