import { useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { itemIcon, type HeroBuildEntry } from '../../lib/api'
import ItemHover from '../../shared/ItemHover'
import { useBuild, useHeroes, useItems, useSteamProfilesBatch } from '../../lib/queries'
import { usePageMeta } from '../../lib/usePageMeta'
import '../players/players.css'
import '../heroes/heroes.css'
import './builds.css'

const dateFmt = new Intl.DateTimeFormat(undefined, {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})

export default function BuildPage() {
  const params = useParams()
  const [searchParams] = useSearchParams()
  const buildId = Number(params.buildId)
  const heroHint = Number(searchParams.get('h')) || undefined
  if (!Number.isInteger(buildId) || buildId <= 0) {
    return <div className="page-note error">Invalid build id</div>
  }
  return <Build buildId={buildId} heroHint={heroHint} />
}

function Build({ buildId, heroHint }: { buildId: number; heroHint?: number }) {
  const build = useBuild(buildId, heroHint)

  if (build.isPending) return <div className="page-note">Loading build</div>
  if (build.isError) return <div className="page-note error">Could not load this build</div>
  if (!build.data) return <div className="page-note error">Unknown build</div>
  return <BuildDetail entry={build.data} />
}

function BuildDetail({ entry }: { entry: HeroBuildEntry }) {
  const b = entry.hero_build
  const heroes = useHeroes()
  const items = useItems()
  const hero = heroes.data?.get(b.hero_id)

  usePageMeta(
    `${b.name} — ${hero?.name ?? 'Deadlock'} Build — The Cursed Apple`,
    `"${b.name}", an in-game Deadlock build for ${hero?.name ?? 'a hero'}: full item order with the author's notes.`,
  )

  const authorIds = useMemo(
    () => (b.author_account_id ? [b.author_account_id] : []),
    [b.author_account_id],
  )
  const authors = useSteamProfilesBatch(authorIds)
  const author = b.author_account_id ? authors.data?.get(b.author_account_id) : undefined

  const categories = useMemo(
    () =>
      (b.details?.mod_categories ?? [])
        .map((cat) => ({
          name: cat.name ?? '',
          description: cat.description ?? '',
          mods: cat.mods.flatMap((mod) => {
            const item = items.data?.get(mod.ability_id)
            if (!item || !itemIcon(item)) return []
            return [{ item, annotation: mod.annotation ?? '', sell: (mod.sell_priority ?? 0) > 0 }]
          }),
        }))
        .filter((cat) => cat.mods.length > 0),
    [b.details, items.data],
  )

  const totalCost = categories
    .flatMap((c) => c.mods)
    .reduce((sum, m) => sum + (m.item.cost ?? 0), 0)

  return (
    <>
      <div className="build-head">
        {hero && <img className="build-hero-art" src={hero.images.icon_hero_card_webp} alt="" />}
        <div>
          <h2>{b.name}</h2>
          <div className="build-meta">
            <Link to={`/heroes/${b.hero_id}`}>{hero?.name ?? `Hero ${b.hero_id}`}</Link>
            {b.author_account_id && (
              <>
                {' · by '}
                <Link to={`/players/${b.author_account_id}`}>
                  {author?.personaname ?? `#${b.author_account_id}`}
                </Link>
              </>
            )}
            {b.last_updated_timestamp && (
              <> · updated {dateFmt.format(b.last_updated_timestamp * 1000)}</>
            )}
            {(entry.num_weekly_favorites ?? entry.num_favorites) != null && (
              <>
                {' · '}
                {(entry.num_weekly_favorites ?? entry.num_favorites)!.toLocaleString()} favorites
              </>
            )}
          </div>
          {b.description && <p className="build-desc">{b.description}</p>}
        </div>
      </div>

      {!items.data ? (
        <div className="page-note">Loading items</div>
      ) : categories.length === 0 ? (
        <div className="page-note">This build has no items</div>
      ) : (
        <>
          {categories.map((cat, i) => (
            <section key={i} className="data-section build-cat">
              <h3>{cat.name || `Group ${i + 1}`}</h3>
              {cat.description && <p className="build-cat-desc">{cat.description}</p>}
              <div className="build-cat-items">
                {cat.mods.map((mod, j) => (
                  <span key={`${mod.item.id}-${j}`} className="build-cat-item">
                    <ItemHover
                      item={mod.item}
                      size={46}
                      dimmed={mod.sell}
                      extraLine={
                        [mod.annotation, mod.sell ? 'sell later' : '']
                          .filter(Boolean)
                          .join(' · ') || undefined
                      }
                    />
                    <span className="bci-name">{mod.item.name}</span>
                    {mod.annotation && <span className="bci-note">{mod.annotation}</span>}
                  </span>
                ))}
              </div>
            </section>
          ))}
          <p className="grid-note">
            {categories.reduce((n, c) => n + c.mods.length, 0)} items ·{' '}
            {totalCost.toLocaleString()} souls if you buy everything · find this build in the
            in-game shop by searching “{b.name}”.
          </p>
        </>
      )}
    </>
  )
}
