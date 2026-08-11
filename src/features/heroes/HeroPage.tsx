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
    <div className="hero-page">
      <div className="hero-hero">
        <img className="hero-art" src={hero.images.icon_hero_card_webp} alt="" />
        <div className="hero-intro">
          <div className="hero-title-row">
            <h2>{hero.name}</h2>
            <Link className="btn" to={`/matchups/${hero.id}`}>
              Matchups
            </Link>
          </div>
          {hero.description?.lore && <p className="hero-lore">{hero.description.lore}</p>}
        </div>
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
      <BaseStatsSection hero={hero} />
      <AbilitiesSection hero={hero} />
      <ScalingSection hero={hero} />

      {byTier ? (
        byTier.map((rows, tier) =>
          rows.length === 0 ? null : (
            <details key={tier} className="data-section tier-details">
              <summary>{TIER_LABELS[tier]} — most popular items</summary>
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
            </details>
          ),
        )
      ) : (
        <div className="page-note">Loading item stats</div>
      )}
      <p className="grid-note" style={{ marginTop: 18 }}>
        Last 30 days, all ranks. Win rate is for matches where the item was bought — popular
        late-game items skew high because buying them means the game already went well.
      </p>
    </div>
  )
}

function statValue(
  stats: HeroAsset['starting_stats'],
  key: string,
): number | undefined {
  const v = stats?.[key]?.value
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined
}

function weaponValue(info: Record<string, unknown> | undefined, key: string): number | undefined {
  const v = info?.[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined
}

type StatLine = { label: string; value: string }

function lines(entries: (StatLine | null)[]): StatLine[] {
  return entries.filter((e): e is StatLine => e !== null)
}

function line(label: string, value: number | undefined, format: (v: number) => string): StatLine | null {
  return value === undefined ? null : { label, value: format(value) }
}

function BaseStatsSection({ hero }: { hero: HeroAsset }) {
  const byClassName = useItemsByClassName()
  const gunClass = hero.items?.weapon_primary
  const gun = gunClass ? byClassName.data?.get(gunClass) : undefined
  const info = gun?.weapon_info
  const stats = hero.starting_stats

  const weaponLines = lines([
    line('Bullet damage', weaponValue(info, 'bullet_damage'), (v) => `${v}`),
    (weaponValue(info, 'bullets') ?? 1) > 1
      ? line('Bullets per shot', weaponValue(info, 'bullets'), (v) => `${v}`)
      : null,
    line('Fire rate', weaponValue(info, 'bullets_per_second'), (v) => `${v.toFixed(1)}/s`),
    line('Clip size', weaponValue(info, 'clip_size'), (v) => `${v}`),
    line('Reload', weaponValue(info, 'reload_duration'), (v) => `${v}s`),
    line('Sustained DPS', weaponValue(info, 'damage_per_second_with_reload'), (v) =>
      `${Math.round(v)}`,
    ),
    line('Bullet velocity', weaponValue(info, 'bullet_speed'), (v) => `${Math.round(v / 100)} m/s`),
  ])

  const vitalityLines = lines([
    line('Max health', statValue(stats, 'max_health'), (v) => `${v}`),
    line('Health regen', statValue(stats, 'base_health_regen'), (v) => `${v}/s`),
    line('Move speed', statValue(stats, 'max_move_speed'), (v) => `${v} m/s`),
    line('Sprint bonus', statValue(stats, 'sprint_speed'), (v) => `+${v} m/s`),
    line('Stamina', statValue(stats, 'stamina'), (v) => `${v}`),
    line('Light melee', statValue(stats, 'light_melee_damage'), (v) => `${v}`),
    line('Heavy melee', statValue(stats, 'heavy_melee_damage'), (v) => `${v}`),
  ])

  const perLevelSpirit = hero.standard_level_up_upgrades?.MODIFIER_VALUE_TECH_POWER
  const spiritLines = lines([
    {
      label: 'Spirit power',
      value: perLevelSpirit ? `0 (+${perLevelSpirit} per level)` : '0',
    },
    line('Ability duration', statValue(stats, 'tech_duration'), (v) => `×${v}`),
    line('Ability range', statValue(stats, 'tech_range'), (v) => `×${v}`),
  ])

  if (weaponLines.length === 0 && vitalityLines.length === 0) return null

  const panel = (title: React.ReactNode, rows: StatLine[]) =>
    rows.length === 0 ? null : (
      <div className="stats-panel">
        <h4>{title}</h4>
        {rows.map((row) => (
          <div key={row.label} className="stat-line">
            <span>{row.label}</span>
            <span className="mono">{row.value}</span>
          </div>
        ))}
      </div>
    )

  return (
    <section className="data-section">
      <h3>Base Stats</h3>
      <div className="stats-grid">
        {panel(
          <>
            {gun && itemIcon(gun) && <img src={itemIcon(gun)} alt="" />}
            Weapon{gun ? ` — ${gun.name}` : ''}
          </>,
          weaponLines,
        )}
        {panel('Vitality', vitalityLines)}
        {panel('Spirit', spiritLines)}
      </div>
    </section>
  )
}

const COMPLEXITY_LABELS = ['Simple', 'Moderate', 'Complex']

function AboutSection({ hero }: { hero: HeroAsset }) {
  const d = hero.description
  return (
    <section className="data-section hero-about">
      <h3>About</h3>
      <div className="about-facts">
        {hero.hero_type && (
          <span className="fact">
            <span className="stat-label">Role type</span>
            <span className="fact-value capitalize">{hero.hero_type}</span>
          </span>
        )}
        <span className="fact">
          <span className="stat-label">Complexity</span>
          <span className="fact-value">{COMPLEXITY_LABELS[hero.complexity - 1] ?? '—'}</span>
        </span>
        {hero.tags && hero.tags.length > 0 && (
          <span className="fact">
            <span className="stat-label">Tags</span>
            <span className="fact-value fact-tags">{hero.tags.join(' · ')}</span>
          </span>
        )}
      </div>
      {d?.role && <p className="about-role">{d.role}</p>}
      {d?.playstyle && <p className="about-playstyle">{d.playstyle}</p>}
    </section>
  )
}

const SIGNATURE_SLOTS = ['signature1', 'signature2', 'signature3', 'signature4']
const AP_COSTS = [1, 2, 5]

function upgradeText(p: { name: string; bonus?: string }): string {
  const isPercent = /percent/i.test(p.name)
  let label = p.name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/ ?Percent/gi, '')
    .split(' ')
    .map((w) => (w === 'Tech' ? 'Spirit' : w))
    .join(' ')
  label = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase()
  const n = Number(p.bonus)
  const sign = Number.isFinite(n) && n > 0 ? '+' : ''
  return `${sign}${p.bonus ?? ''}${isPercent ? '%' : ''} ${label}`
}

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
              {ability.upgrades && ability.upgrades.length > 0 && (
                <ul className="ability-upgrades">
                  {ability.upgrades.map((tier, tierIndex) => {
                    const parts = (tier.property_upgrades ?? []).map(upgradeText)
                    if (parts.length === 0) return null
                    return (
                      <li key={tierIndex}>
                        <span className="ap">{AP_COSTS[tierIndex] ?? tierIndex + 1} AP</span>
                        {parts.join(' · ')}
                      </li>
                    )
                  })}
                </ul>
              )}
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
