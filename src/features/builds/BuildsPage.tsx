import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { type BuildSort } from '../../lib/api'
import { useBuilds, useHeroes } from '../../lib/queries'
import { usePageMeta } from '../../lib/usePageMeta'
import '../players/players.css'
import '../heroes/heroes.css'
import './builds.css'

const dateFmt = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: '2-digit',
})

const SORTS: { value: BuildSort; label: string }[] = [
  { value: 'weekly_favorites', label: 'Weekly favorites' },
  { value: 'favorites', label: 'All-time favorites' },
  { value: 'updated_at', label: 'Recently updated' },
]

const PAGE_SIZE = 30

export default function BuildsPage() {
  usePageMeta(
    'Deadlock Build Library — The Cursed Apple',
    'The most popular in-game Deadlock builds for every hero — browse by weekly favorites, all-time favorites, or latest updates.',
  )
  const heroes = useHeroes()
  const [searchParams, setSearchParams] = useSearchParams()
  const heroId = Number(searchParams.get('hero')) || 0

  const [sortBy, setSortBy] = useState<BuildSort>('weekly_favorites')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [allLanguages, setAllLanguages] = useState(false)
  const [limit, setLimit] = useState(PAGE_SIZE)

  // debounce the server-side name search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350)
    return () => clearTimeout(t)
  }, [searchInput])

  // filters changed: reset paging
  useEffect(() => {
    setLimit(PAGE_SIZE)
  }, [heroId, sortBy, search, allLanguages])

  const builds = useBuilds({
    heroId: heroId || undefined,
    sortBy,
    search: search || undefined,
    language: allLanguages ? undefined : 0,
    limit,
  })

  const strip = useMemo(
    () =>
      heroes.data
        ? [...heroes.data.values()].sort((a, b) => a.name.localeCompare(b.name))
        : null,
    [heroes.data],
  )

  const favLabel = sortBy === 'favorites' ? 'Favorites' : 'Weekly favorites'

  return (
    <>
      {strip && (
        <div className="hero-strip">
          <Link
            to="/builds"
            className={heroId === 0 ? 'selected build-strip-all' : 'build-strip-all'}
          >
            <span>All</span>
          </Link>
          {strip.map((h) => (
            <Link
              key={h.id}
              to={`/builds?hero=${h.id}`}
              className={h.id === heroId ? 'selected' : ''}
              title={h.name}
            >
              <img src={h.images.icon_image_small_webp} alt={h.name} loading="lazy" />
              <span>{h.name}</span>
            </Link>
          ))}
        </div>
      )}

      <div className="control-bar">
        <span className="cb-group cb-search">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search build names"
            aria-label="Search build names"
          />
        </span>
        <span className="cb-group">
          <span className="cb-label">Sort</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as BuildSort)}
            aria-label="Sort builds"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </span>
        <label className="cb-group cb-check">
          <input
            type="checkbox"
            checked={allLanguages}
            onChange={(e) => setAllLanguages(e.target.checked)}
          />
          <span className="cb-label">All languages</span>
        </label>
        {heroId > 0 && heroes.data?.get(heroId) && (
          <span className="cb-group cb-count">
            {heroes.data.get(heroId)!.name} builds ·{' '}
            <button className="cb-dir" onClick={() => setSearchParams({})}>
              clear
            </button>
          </span>
        )}
      </div>

      <p className="grid-note">
        In-game published builds, straight from the community — favorite one in the shop to use it.
      </p>

      {builds.isError ? (
        <div className="page-note error">Could not load builds</div>
      ) : !builds.data ? (
        <div className="page-note">Loading builds</div>
      ) : builds.data.length === 0 ? (
        <div className="page-note">No builds found</div>
      ) : (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Hero</th>
                  <th>Build</th>
                  <th>{favLabel}</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {builds.data.map((entry) => {
                  const b = entry.hero_build
                  const hero = heroes.data?.get(b.hero_id)
                  const favs = entry.num_weekly_favorites ?? entry.num_favorites
                  return (
                    <tr key={`${b.hero_build_id}-${b.hero_id}-${b.language ?? 0}`}>
                      <td>
                        <Link className="hero-cell" to={`/heroes/${b.hero_id}`}>
                          {hero && <img src={hero.images.icon_image_small_webp} alt="" loading="lazy" />}
                          {hero?.name ?? `Hero ${b.hero_id}`}
                        </Link>
                      </td>
                      <td>
                        <Link
                          className="build-name"
                          to={`/builds/${b.hero_build_id}?h=${b.hero_id}`}
                        >
                          {b.name}
                        </Link>
                      </td>
                      <td className="mono">{favs != null ? favs.toLocaleString() : '—'}</td>
                      <td className="dim">
                        {b.last_updated_timestamp
                          ? dateFmt.format(b.last_updated_timestamp * 1000)
                          : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {builds.data.length >= limit && (
            <button className="btn show-more" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
              Show more
            </button>
          )}
        </>
      )}
    </>
  )
}
