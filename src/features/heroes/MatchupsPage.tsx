import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { type HeroAsset } from '../../lib/api'
import ItemHover from '../../shared/ItemHover'
import {
  useCounterItems,
  useHeroCounters,
  useHeroes,
  useHeroSynergies,
  useItems,
} from '../../lib/queries'
import { winRateClass } from '../../lib/winrate'
import HeroBrowser from './HeroBrowser'
import { usePageMeta } from '../../lib/usePageMeta'
import { bracketLabel, useRankFilter } from '../../lib/rankFilter'
import RankFilterControl from '../../shared/RankFilterControl'
import { modeLabel, useModeFilter } from '../../lib/modeFilter'
import ModeFilterControl from '../../shared/ModeFilterControl'
import '../players/players.css'
import './heroes.css'

const MIN_COUNTER_ITEM_MATCHES = 150

export default function MatchupsPage() {
  const params = useParams()
  const heroId = params.heroId ? Number(params.heroId) : null
  const heroes = useHeroes()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') === 'with' ? 'with' : 'against'
  const heroName = heroId !== null ? heroes.data?.get(heroId)?.name : undefined
  usePageMeta(
    heroName
      ? `${heroName} Matchups & Counters — The Cursed Apple`
      : 'Deadlock Matchups & Counter Items — The Cursed Apple',
    heroName
      ? `${heroName} matchups in Deadlock: win rates into every opponent, why each matchup leans the way it does, and the counter items that win those games.`
      : 'Win rates for every Deadlock hero matchup, and the counter items that actually win those games.',
  )

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
      <div className="tab-row" role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'against'}
          className={`tab${tab === 'against' ? ' selected' : ''}`}
          onClick={() => setSearchParams({}, { replace: true })}
        >
          Versus opponents
        </button>
        <button
          role="tab"
          aria-selected={tab === 'with'}
          className={`tab${tab === 'with' ? ' selected' : ''}`}
          onClick={() => setSearchParams({ tab: 'with' }, { replace: true })}
        >
          With allies
        </button>
      </div>
      {heroes.data &&
        (tab === 'against' ? (
          <MatchupTable heroId={heroId} heroes={heroes.data} />
        ) : (
          <SynergyTable heroId={heroId} heroes={heroes.data} />
        ))}
    </>
  )
}

type MatchupSortKey = 'win' | 'matches' | 'name'

function MatchupTable({ heroId, heroes }: { heroId: number; heroes: Map<number, HeroAsset> }) {
  const { minBadge } = useRankFilter()
  const { mode } = useModeFilter()
  const counters = useHeroCounters(minBadge, mode)
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
            stat: c,
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

  // the heroes map is fully loaded before this renders, so a missing id is a
  // removed hero or bad link, not data still on the way
  if (!hero) return <div className="page-note error">Unknown hero</div>
  if (counters.isError) return <div className="page-note error">Could not load matchups</div>
  if (!rows) return <div className="page-note">Loading matchups</div>

  return (
    <section className="data-section">
      <h3>
        {hero.name} — matchups, last 30 days · {bracketLabel(minBadge, mode)} · {modeLabel(mode)}
      </h3>
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
        <RankFilterControl />
        <ModeFilterControl />
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
            {rows.map(({ enemy, stat, matches, winRate }) => {
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
                    <MatchupSummary
                      stat={stat}
                      heroName={hero.name}
                      enemy={enemy}
                      winRate={winRate}
                    />
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

function SynergyTable({ heroId, heroes }: { heroId: number; heroes: Map<number, HeroAsset> }) {
  const { minBadge } = useRankFilter()
  const { mode } = useModeFilter()
  const synergies = useHeroSynergies(minBadge, mode)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<MatchupSortKey>('win')
  const [descending, setDescending] = useState(true)

  const rows = useMemo(() => {
    if (!synergies.data) return null
    const needle = search.trim().toLowerCase()
    const dir = descending ? -1 : 1
    return synergies.data
      .flatMap((s) => {
        if (s.hero_id1 !== heroId && s.hero_id2 !== heroId) return []
        const partner = heroes.get(s.hero_id1 === heroId ? s.hero_id2 : s.hero_id1)
        if (!partner || s.matches_played === 0) return []
        if (needle && !partner.name.toLowerCase().includes(needle)) return []
        return [
          {
            partner,
            matches: s.matches_played,
            winRate: (s.wins / s.matches_played) * 100,
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
            return dir * b.partner.name.localeCompare(a.partner.name)
        }
      })
  }, [synergies.data, heroId, heroes, search, sortKey, descending])

  const hero = heroes.get(heroId)

  if (!hero) return <div className="page-note error">Unknown hero</div>
  if (synergies.isError) return <div className="page-note error">Could not load duos</div>
  if (!rows) return <div className="page-note">Loading duos</div>

  return (
    <section className="data-section">
      <h3>
        {hero.name} — duos, last 30 days · {bracketLabel(minBadge, mode)} · {modeLabel(mode)}
      </h3>
      <div className="control-bar">
        <span className="cb-group cb-search">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search allies"
            aria-label="Search allies"
          />
        </span>
        <span className="cb-group">
          <span className="cb-label">Sort</span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as MatchupSortKey)}
            aria-label="Sort duos"
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
        <RankFilterControl />
        <ModeFilterControl />
      </div>
      <span className="dim-note">
        win rate when {hero.name} and the ally are on the same team
      </span>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>With</th>
              <th>Matches</th>
              <th>Win rate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ partner, matches, winRate }) => (
              <tr key={partner.id}>
                <td>
                  <span className="hero-cell">
                    <img src={partner.images.icon_image_small_webp} alt="" loading="lazy" />
                    <Link className="player-link" to={`/matchups/${partner.id}?tab=with`}>
                      {partner.name}
                    </Link>
                  </span>
                </td>
                <td className="mono">{matches.toLocaleString()}</td>
                <td className={`mono ${winRateClass(winRate)}`}>{winRate.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

const compactSouls = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

/**
 * Data-derived explanation of why a matchup leans the way it does, built from
 * the pair's aggregate stats — no hand-written matchup opinions.
 */
export function MatchupSummary({
  stat,
  heroName,
  enemy,
  winRate,
}: {
  stat: import('../../lib/api').HeroCounterStat
  heroName: string
  enemy: HeroAsset
  winRate: number
}) {
  const n = stat.matches_played
  if (n === 0) return null

  const souls = stat.networth / n
  const enemySouls = stat.enemy_networth / n
  const soulsPct = enemySouls > 0 ? ((souls - enemySouls) / enemySouls) * 100 : 0
  const kills = stat.kills / n
  const enemyKills = stat.enemy_kills / n
  const denies = stat.denies / n
  const enemyDenies = stat.enemy_denies / n
  const objDamage = stat.obj_damage / n
  const enemyObjDamage = stat.enemy_obj_damage / n

  const verdict =
    winRate >= 52
      ? `A favorable matchup — ${heroName} wins ${winRate.toFixed(1)}% of these games`
      : winRate <= 48
        ? `A tough matchup — ${heroName} wins only ${winRate.toFixed(1)}% of these games`
        : `An even matchup — ${heroName} wins ${winRate.toFixed(1)}% of these games`

  const lines: string[] = []
  if (Math.abs(soulsPct) >= 2) {
    lines.push(
      soulsPct > 0
        ? `${heroName} out-farms ${enemy.name} by ~${Math.abs(soulsPct).toFixed(0)}% souls per match (${compactSouls.format(souls)} vs ${compactSouls.format(enemySouls)})`
        : `${enemy.name} out-farms ${heroName} by ~${Math.abs(soulsPct).toFixed(0)}% souls per match (${compactSouls.format(enemySouls)} vs ${compactSouls.format(souls)})`,
    )
  } else {
    lines.push(
      `The souls race is nearly even (${compactSouls.format(souls)} vs ${compactSouls.format(enemySouls)} per match)`,
    )
  }
  if (Math.abs(kills - enemyKills) >= 0.3) {
    lines.push(
      kills > enemyKills
        ? `${heroName} wins the kill trade, averaging ${kills.toFixed(1)} kills to ${enemy.name}'s ${enemyKills.toFixed(1)}`
        : `${enemy.name} wins the kill trade, averaging ${enemyKills.toFixed(1)} kills to ${heroName}'s ${kills.toFixed(1)}`,
    )
  }
  if (denies + enemyDenies > 0 && Math.abs(denies - enemyDenies) / Math.max(denies, enemyDenies) >= 0.1) {
    lines.push(
      denies > enemyDenies
        ? `${heroName} wins the deny war in lane (${denies.toFixed(1)} vs ${enemyDenies.toFixed(1)} per match)`
        : `${enemy.name} wins the deny war in lane (${enemyDenies.toFixed(1)} vs ${denies.toFixed(1)} per match)`,
    )
  }
  if (
    objDamage + enemyObjDamage > 0 &&
    Math.abs(objDamage - enemyObjDamage) / Math.max(objDamage, enemyObjDamage) >= 0.1
  ) {
    lines.push(
      objDamage > enemyObjDamage
        ? `${heroName} pressures objectives harder (${compactSouls.format(objDamage)} vs ${compactSouls.format(enemyObjDamage)} objective damage)`
        : `${enemy.name} pressures objectives harder (${compactSouls.format(enemyObjDamage)} vs ${compactSouls.format(objDamage)} objective damage)`,
    )
  }

  const playstyle = enemy.description?.playstyle
  const playstyleExcerpt = playstyle ? `${playstyle.split('. ')[0].replace(/\.$/, '')}.` : null

  return (
    <div className="matchup-why">
      <div className={`matchup-verdict ${winRateClass(winRate)}`}>{verdict}</div>
      <ul>
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {(enemy.hero_type || playstyleExcerpt) && (
        <p className="matchup-enemy-note">
          {enemy.name}
          {enemy.hero_type ? ` is a ${enemy.hero_type}` : ''}
          {playstyleExcerpt ? ` — ${playstyleExcerpt}` : '.'}
        </p>
      )}
    </div>
  )
}

export function CounterItems({
  heroId,
  enemy,
  heroName,
}: {
  heroId: number
  enemy: HeroAsset
  heroName: string
}) {
  const { minBadge } = useRankFilter()
  const { mode } = useModeFilter()
  const stats = useCounterItems(heroId, enemy.id, minBadge, mode)
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
            <ItemHover item={item} size={38} />
            <span>{item.name}</span>
            <span className={`ci-wr ${winRateClass(winRate)}`}>{winRate.toFixed(1)}%</span>
            <span className="ci-n">({matches.toLocaleString()})</span>
          </span>
        ))}
      </div>
    </>
  )
}
