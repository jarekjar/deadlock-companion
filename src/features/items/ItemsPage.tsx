import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { itemIcon, type ItemAsset, type ItemStat } from '../../lib/api'
import { useAllItemStats, useHeroAnalytics, useItems } from '../../lib/queries'
import { winRateClass } from '../../lib/winrate'
import ItemHover from '../../shared/ItemHover'
import '../players/players.css'
import '../heroes/heroes.css'
import './items.css'

type SortKey = 'usage' | 'win' | 'cost' | 'name'
const TIER_ROMAN = ['I', 'II', 'III', 'IV']

export default function ItemsPage() {
  const navigate = useNavigate()
  const items = useItems()
  const stats = useAllItemStats()
  const analytics = useHeroAnalytics()
  const [search, setSearch] = useState('')
  const [slot, setSlot] = useState('all')
  const [tier, setTier] = useState(0)
  const [sortKey, setSortKey] = useState<SortKey>('usage')
  const [descending, setDescending] = useState(true)

  const rows = useMemo(() => {
    if (!items.data || !stats.data || !analytics.data) return null
    // item stats count player-slots (12 per match), so the denominator does too
    const totalPlayerSlots = analytics.data.reduce((s, h) => s + h.matches, 0)
    const statById = new Map<number, ItemStat>(stats.data.map((s) => [s.item_id, s]))
    const needle = search.trim().toLowerCase()

    const filtered: { item: ItemAsset; usage: number; winRate: number | null }[] = []
    for (const item of items.data.values()) {
      if (item.type !== 'upgrade' || item.shopable === false || !itemIcon(item)) continue
      if (needle && !item.name.toLowerCase().includes(needle)) continue
      if (slot !== 'all' && item.item_slot_type !== slot) continue
      if (tier !== 0 && item.item_tier !== tier) continue
      const stat = statById.get(item.id)
      filtered.push({
        item,
        usage: stat ? (stat.matches / totalPlayerSlots) * 100 : 0,
        winRate: stat && stat.matches > 0 ? (stat.wins / stat.matches) * 100 : null,
      })
    }

    const dir = descending ? -1 : 1
    return filtered.sort((a, b) => {
      switch (sortKey) {
        case 'usage':
          return dir * (a.usage - b.usage)
        case 'win':
          return dir * ((a.winRate ?? -1) - (b.winRate ?? -1))
        case 'cost':
          return dir * ((a.item.cost ?? 0) - (b.item.cost ?? 0))
        case 'name':
          return dir * b.item.name.localeCompare(a.item.name)
      }
    })
  }, [items.data, stats.data, analytics.data, search, slot, tier, sortKey, descending])

  if (items.isError || stats.isError) {
    return <div className="page-note error">Could not load items</div>
  }

  return (
    <>
      <div className="control-bar">
        <span className="cb-group cb-search">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items"
            aria-label="Search items"
          />
        </span>
        <span className="cb-group">
          <span className="cb-label">Slot</span>
          <select value={slot} onChange={(e) => setSlot(e.target.value)} aria-label="Filter by slot">
            <option value="all">All</option>
            <option value="weapon">Weapon</option>
            <option value="vitality">Vitality</option>
            <option value="spirit">Spirit</option>
          </select>
        </span>
        <span className="cb-group">
          <span className="cb-label">Tier</span>
          <select
            value={tier}
            onChange={(e) => setTier(Number(e.target.value))}
            aria-label="Filter by tier"
          >
            <option value={0}>All</option>
            <option value={1}>I</option>
            <option value={2}>II</option>
            <option value={3}>III</option>
            <option value={4}>IV</option>
          </select>
        </span>
        <span className="cb-group">
          <span className="cb-label">Sort</span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            aria-label="Sort items"
          >
            <option value="usage">Usage</option>
            <option value="win">Win rate</option>
            <option value="cost">Cost</option>
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
      <p className="grid-note">Usage and win rates from all matches in the last 30 days.</p>
      {!rows ? (
        <div className="page-note">Loading items</div>
      ) : rows.length === 0 ? (
        <div className="page-note">No items match</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Tier</th>
                <th>Slot</th>
                <th>Cost</th>
                <th>Usage</th>
                <th>Win rate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ item, usage, winRate }) => (
                <tr
                  key={item.id}
                  className="row-link"
                  onClick={() => navigate(`/items/${item.id}`)}
                >
                  <td>
                    <span className="item-cell">
                      <ItemHover item={item} size={26} />
                      {item.name}
                    </span>
                  </td>
                  <td className="mono">{TIER_ROMAN[(item.item_tier ?? 1) - 1]}</td>
                  <td className="dim capitalize">{item.item_slot_type}</td>
                  <td className="mono">{item.cost?.toLocaleString() ?? '—'}</td>
                  <td className="mono">{usage > 0 ? `${usage.toFixed(1)}%` : '—'}</td>
                  <td className={`mono ${winRate !== null ? winRateClass(winRate) : ''}`}>
                    {winRate !== null ? `${winRate.toFixed(1)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
