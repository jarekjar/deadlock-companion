import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  itemDescription,
  itemIcon,
  type HeroAsset,
  type ItemAsset,
  type ItemStat,
} from '../../lib/api'
import ItemHover from '../../components/ItemHover'
import {
  useHeroAnalytics,
  useHeroes,
  useHeroItemStats,
  useItems,
  useItemsByClassName,
} from '../../lib/queries'
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

      <AboutSection hero={hero} />
      <AbilitiesSection hero={hero} />
      <ScalingSection hero={hero} />

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

function AboutSection({ hero }: { hero: HeroAsset }) {
  const d = hero.description
  if (!d?.role && !d?.playstyle && !d?.lore) return null
  return (
    <section className="data-section hero-about">
      <h3>About</h3>
      {d.role && <p className="about-role">{d.role}</p>}
      {d.playstyle && <p className="about-playstyle">{d.playstyle}</p>}
      {d.lore && (
        <details className="about-lore">
          <summary>Lore</summary>
          <p>{d.lore}</p>
        </details>
      )}
    </section>
  )
}

const SIGNATURE_SLOTS = ['signature1', 'signature2', 'signature3', 'signature4']

function AbilitiesSection({ hero }: { hero: HeroAsset }) {
  const byClassName = useItemsByClassName()
  if (!byClassName.data || !hero.items) return null

  const abilities = SIGNATURE_SLOTS.flatMap((slot) => {
    const className = hero.items?.[slot]
    const ability = className ? byClassName.data.get(className) : undefined
    return ability ? [ability] : []
  })
  if (abilities.length === 0) return null

  return (
    <section className="data-section">
      <h3>Abilities</h3>
      <div className="ability-grid">
        {abilities.map((ability, index) => {
          const cooldown = Number(ability.properties?.AbilityCooldown?.value ?? 0)
          const charges = Number(ability.properties?.AbilityCharges?.value ?? 0)
          const icon = itemIcon(ability)
          const meta = [
            cooldown > 0 ? `${cooldown}s cooldown` : 'no cooldown',
            charges > 1 && `${charges} charges`,
          ]
            .filter(Boolean)
            .join(' · ')
          return (
            <div key={ability.id} className="ability-card">
              <div className="ability-head">
                {icon && <img src={icon} alt="" loading="lazy" />}
                <div>
                  <div className="ability-name">
                    {index + 1} · {ability.name}
                  </div>
                  <div className="ability-meta">{meta}</div>
                </div>
              </div>
              <p className="ability-desc">{itemDescription(ability).replace(/[ \t]+/g, ' ')}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

const LEVEL_LABELS: Record<string, string> = {
  MODIFIER_VALUE_BASE_BULLET_DAMAGE_FROM_LEVEL: 'Bullet damage',
  MODIFIER_VALUE_BASE_BULLET_DAMAGE_FROM_LEVEL_ALT_FIRE: 'Alt-fire damage',
  MODIFIER_VALUE_BASE_HEALTH_FROM_LEVEL: 'Health',
  MODIFIER_VALUE_BASE_MELEE_DAMAGE_FROM_LEVEL: 'Melee damage',
  MODIFIER_VALUE_TECH_POWER: 'Spirit power',
  MODIFIER_VALUE_TECH_DAMAGE_MULTIPLIER: 'Spirit damage',
  MODIFIER_VALUE_BULLET_ARMOR_DAMAGE_RESIST: 'Bullet resist',
  MODIFIER_VALUE_TECH_RESIST: 'Spirit resist',
  MODIFIER_VALUE_BONUS_ATTACK_RANGE: 'Attack range',
  MODIFIER_VALUE_BOON_COUNT: 'Ability points',
}

/** "EBulletDamage" / "ETechPower" -> "Bullet damage" / "Spirit power" */
function statLabel(key: string): string {
  const words = key
    .replace(/^E/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/Tech/g, 'Spirit')
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase()
}

function ScalingSection({ hero }: { hero: HeroAsset }) {
  const scaling = Object.entries(hero.scaling_stats ?? {}).filter(
    ([, v]) => v?.scaling_stat && v?.scale,
  )
  const perLevel = Object.entries(hero.standard_level_up_upgrades ?? {}).filter(
    ([, value]) => value !== 0,
  )
  if (scaling.length === 0 && perLevel.length === 0) return null

  return (
    <section className="data-section">
      <h3>Scaling</h3>
      <ul className="scaling-list">
        {scaling.map(([stat, v]) => (
          <li key={stat}>
            <span className="scaling-unique">Unique</span> {statLabel(stat)} gains{' '}
            <span className="mono">+{v.scale}</span> per point of {statLabel(v.scaling_stat!)}
          </li>
        ))}
        {perLevel.length > 0 && (
          <li>
            Per level:{' '}
            {perLevel
              .map(
                ([key, value]) =>
                  `${LEVEL_LABELS[key] ?? statLabel(key.replace(/^MODIFIER_VALUE_/, '').toLowerCase())} +${value}`,
              )
              .join(' · ')}
          </li>
        )}
      </ul>
    </section>
  )
}
