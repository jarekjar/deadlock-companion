import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { itemIcon } from '../../lib/api'
import ItemHover from '../../shared/ItemHover'
import {
  useHeroes,
  useHeroStatsBetween,
  useItems,
  useItemStatsBetween,
  usePatches,
} from '../../lib/queries'
import { bracketLabel, useRankFilter } from '../../lib/rankFilter'
import RankFilterControl from '../../shared/RankFilterControl'
import { winRateClass } from '../../lib/winrate'
import { usePageMeta } from '../../lib/usePageMeta'
import '../players/players.css'
import '../heroes/heroes.css'

const HOUR = 3600
const DAY = 24 * HOUR
const MIN_HERO_MATCHES = 200
const MIN_ITEM_MATCHES = 1000
const TOP_N = 8

const dateFmt = new Intl.DateTimeFormat(undefined, {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})

/** "06-30-2026 Update" -> unix seconds at UTC midnight of the patch day. */
function patchDayFromTitle(title: string): number | null {
  const m = /^(\d{2})-(\d{2})-(\d{4})/.exec(title)
  if (!m) return null
  const t = Date.UTC(Number(m[3]), Number(m[1]) - 1, Number(m[2])) / 1000
  return Number.isFinite(t) ? t : null
}

export default function PatchReportPage() {
  usePageMeta(
    'Deadlock Patch Winners & Losers — The Cursed Apple',
    'Which Deadlock heroes and items gained or lost win rate after each balance patch, from live match data.',
  )
  const patches = usePatches()

  const balancePatches = useMemo(
    () =>
      (patches.data ?? [])
        .flatMap((p) => {
          const day = patchDayFromTitle(p.title)
          return day ? [{ title: p.title, link: p.link, day }] : []
        })
        .sort((a, b) => b.day - a.day),
    [patches.data],
  )

  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  if (patches.isError) return <div className="page-note error">Could not load the patch list</div>
  if (balancePatches.length === 0) return <div className="page-note">Loading patches</div>

  const index = Math.max(
    0,
    balancePatches.findIndex((p) => p.day === (selectedDay ?? balancePatches[0].day)),
  )
  const patch = balancePatches[index]
  const nextPatch = index > 0 ? balancePatches[index - 1] : null

  return (
    <>
      <div className="control-bar">
        <span className="cb-group">
          <span className="cb-label">Patch</span>
          <select
            value={patch.day}
            onChange={(e) => setSelectedDay(Number(e.target.value))}
            aria-label="Pick a patch"
          >
            {balancePatches.map((p) => (
              <option key={p.day} value={p.day}>
                {p.title}
              </option>
            ))}
          </select>
        </span>
        <RankFilterControl />
        <span className="cb-group cb-count">
          <a href={patch.link} target="_blank" rel="noreferrer">
            official notes
          </a>
        </span>
      </div>
      <PatchReport
        key={patch.day}
        patchDay={patch.day}
        patchTitle={patch.title}
        nextPatchDay={nextPatch?.day ?? null}
      />
    </>
  )
}

function PatchReport({
  patchDay,
  patchTitle,
  nextPatchDay,
}: {
  patchDay: number
  patchTitle: string
  nextPatchDay: number | null
}) {
  const { minBadge } = useRankFilter()

  // The patch lands sometime during its title day, so that day is excluded
  // from both windows. Hour-floored "now" keeps query keys stable.
  const nowHour = Math.floor(Date.now() / 1000 / HOUR) * HOUR
  const afterFrom = patchDay + DAY
  const afterTo = Math.min(nextPatchDay ?? nowHour, nowHour)
  const length = Math.max(afterTo - afterFrom, 0)
  const beforeTo = patchDay
  const beforeFrom = beforeTo - length

  const heroesAfter = useHeroStatsBetween(afterFrom, afterTo, minBadge)
  const heroesBefore = useHeroStatsBetween(beforeFrom, beforeTo, minBadge)
  const itemsAfter = useItemStatsBetween(afterFrom, afterTo, minBadge)
  const itemsBefore = useItemStatsBetween(beforeFrom, beforeTo, minBadge)

  const heroes = useHeroes()
  const items = useItems()

  const heroRows = useMemo(() => {
    if (!heroesAfter.data || !heroesBefore.data || !heroes.data) return null
    const before = new Map(heroesBefore.data.map((h) => [h.hero_id, h]))
    const rows: {
      id: number
      name: string
      icon?: string
      winRate: number
      delta: number
      matches: number
    }[] = []
    for (const after of heroesAfter.data) {
      const b = before.get(after.hero_id)
      const hero = heroes.data.get(after.hero_id)
      if (!b || !hero) continue
      if (after.matches < MIN_HERO_MATCHES || b.matches < MIN_HERO_MATCHES) continue
      const wrAfter = (after.wins / after.matches) * 100
      const wrBefore = (b.wins / b.matches) * 100
      rows.push({
        id: after.hero_id,
        name: hero.name,
        icon: hero.images.icon_image_small_webp,
        winRate: wrAfter,
        delta: wrAfter - wrBefore,
        matches: after.matches,
      })
    }
    return rows.sort((a, b) => b.delta - a.delta)
  }, [heroesAfter.data, heroesBefore.data, heroes.data])

  const itemRows = useMemo(() => {
    if (!itemsAfter.data || !itemsBefore.data || !items.data) return null
    const before = new Map(itemsBefore.data.map((i) => [i.item_id, i]))
    const rows: { item: import('../../lib/api').ItemAsset; winRate: number; delta: number; matches: number }[] = []
    for (const after of itemsAfter.data) {
      const b = before.get(after.item_id)
      const item = items.data.get(after.item_id)
      if (!b || !item || item.type !== 'upgrade' || item.shopable === false || !itemIcon(item))
        continue
      if (after.matches < MIN_ITEM_MATCHES || b.matches < MIN_ITEM_MATCHES) continue
      const wrAfter = (after.wins / after.matches) * 100
      const wrBefore = (b.wins / b.matches) * 100
      rows.push({ item, winRate: wrAfter, delta: wrAfter - wrBefore, matches: after.matches })
    }
    return rows.sort((a, b) => b.delta - a.delta)
  }, [itemsAfter.data, itemsBefore.data, items.data])

  const anyError =
    heroesAfter.isError || heroesBefore.isError || itemsAfter.isError || itemsBefore.isError

  if (length < DAY) {
    return (
      <div className="page-note">
        The {patchTitle} is less than a day old — check back once a full day of matches is in.
      </div>
    )
  }
  if (anyError) return <div className="page-note error">Could not load patch stats</div>

  const windowDays = Math.round(length / DAY)

  return (
    <>
      <p className="grid-note">
        {dateFmt.format(patchDay * 1000)} · {windowDays} day{windowDays === 1 ? '' : 's'} after the
        patch vs the same window before · {bracketLabel(minBadge)} · patch day excluded.
        {windowDays < 3 && ' Early data — expect movement.'}
      </p>

      {!heroRows ? (
        <div className="page-note">Loading hero stats</div>
      ) : (
        <div className="pair-grid">
          <DeltaTable title="Hero Winners" rows={heroRows.slice(0, TOP_N)} kind="hero" />
          <DeltaTable
            title="Hero Losers"
            rows={[...heroRows].reverse().slice(0, TOP_N)}
            kind="hero"
          />
        </div>
      )}

      {!itemRows ? (
        <div className="page-note">Loading item stats</div>
      ) : (
        <div className="pair-grid">
          <DeltaTable
            title="Item Winners"
            rows={itemRows.slice(0, TOP_N).map(itemToRow)}
            kind="item"
            itemsById={itemRows.slice(0, TOP_N)}
          />
          <DeltaTable
            title="Item Losers"
            rows={[...itemRows].reverse().slice(0, TOP_N).map(itemToRow)}
            kind="item"
            itemsById={[...itemRows].reverse().slice(0, TOP_N)}
          />
        </div>
      )}
    </>
  )
}

interface DeltaRow {
  id: number
  name: string
  icon?: string
  winRate: number
  delta: number
  matches: number
}

const itemToRow = (r: {
  item: import('../../lib/api').ItemAsset
  winRate: number
  delta: number
  matches: number
}): DeltaRow => ({
  id: r.item.id,
  name: r.item.name,
  icon: undefined,
  winRate: r.winRate,
  delta: r.delta,
  matches: r.matches,
})

function DeltaTable({
  title,
  rows,
  kind,
  itemsById,
}: {
  title: string
  rows: DeltaRow[]
  kind: 'hero' | 'item'
  itemsById?: { item: import('../../lib/api').ItemAsset }[]
}) {
  if (rows.length === 0) return null
  return (
    <section className="data-section">
      <h3>{title}</h3>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>{kind === 'hero' ? 'Hero' : 'Item'}</th>
              <th>Win rate</th>
              <th>Change</th>
              <th>Matches</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id}>
                <td>
                  {kind === 'hero' ? (
                    <Link className="hero-cell" to={`/heroes/${row.id}`}>
                      {row.icon && <img src={row.icon} alt="" loading="lazy" />}
                      {row.name}
                    </Link>
                  ) : (
                    <span className="item-cell">
                      {itemsById?.[i] && <ItemHover item={itemsById[i].item} size={26} />}
                      <Link className="player-link" to={`/items/${row.id}`}>
                        {row.name}
                      </Link>
                    </span>
                  )}
                </td>
                <td className={`mono ${winRateClass(row.winRate)}`}>{row.winRate.toFixed(1)}%</td>
                <td className={`mono ${row.delta >= 0 ? 'delta-up' : 'delta-down'}`}>
                  {row.delta >= 0 ? '▲' : '▼'} {Math.abs(row.delta).toFixed(1)}pp
                </td>
                <td className="mono">{row.matches.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
