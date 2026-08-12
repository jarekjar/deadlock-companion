import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { itemIcon } from '../lib/api'
import { useHeroes, useItems } from '../lib/queries'
import './palette.css'

export const OPEN_PALETTE_EVENT = 'dc:open-palette'

const PAGES = [
  { label: 'Timers', to: '/timers' },
  { label: 'My Match', to: '/my-match' },
  { label: 'Players', to: '/players' },
  { label: 'Heroes', to: '/heroes' },
  { label: 'Items', to: '/items' },
  { label: 'Matchups', to: '/matchups' },
  { label: 'Ranks', to: '/leaderboard' },
  { label: 'Live Matches', to: '/live' },
]

interface Result {
  kind: 'page' | 'hero' | 'item' | 'player-search'
  label: string
  to: string
  icon?: string
}

/** Ctrl/Cmd+K quick navigation across pages, heroes, items, and player search. */
export default function CommandPalette() {
  const navigate = useNavigate()
  const heroes = useHeroes()
  const items = useItems()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
        setQuery('')
        setSelected(0)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    const onOpen = () => {
      setOpen(true)
      setQuery('')
      setSelected(0)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener(OPEN_PALETTE_EVENT, onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener(OPEN_PALETTE_EVENT, onOpen)
    }
  }, [])

  const results = useMemo((): Result[] => {
    const needle = query.trim().toLowerCase()
    const out: Result[] = []
    if (!needle) {
      return PAGES.map((p) => ({ kind: 'page', label: p.label, to: p.to }))
    }
    for (const p of PAGES) {
      if (p.label.toLowerCase().includes(needle)) {
        out.push({ kind: 'page', label: p.label, to: p.to })
      }
    }
    const rank = (name: string) => (name.toLowerCase().startsWith(needle) ? 0 : 1)
    const heroMatches = [...(heroes.data?.values() ?? [])]
      .filter((h) => h.name.toLowerCase().includes(needle))
      .sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name))
      .slice(0, 6)
    for (const h of heroMatches) {
      out.push({
        kind: 'hero',
        label: h.name,
        to: `/heroes/${h.id}`,
        icon: h.images.icon_image_small_webp,
      })
    }
    const itemMatches = [...(items.data?.values() ?? [])]
      .filter(
        (i) => i.type === 'upgrade' && i.shopable !== false && i.name.toLowerCase().includes(needle),
      )
      .sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name))
      .slice(0, 6)
    for (const i of itemMatches) {
      out.push({ kind: 'item', label: i.name, to: `/items/${i.id}`, icon: itemIcon(i) })
    }
    out.push({
      kind: 'player-search',
      label: `Search players for “${query.trim()}”`,
      to: `/players?q=${encodeURIComponent(query.trim())}`,
    })
    return out
  }, [query, heroes.data, items.data])

  useEffect(() => {
    setSelected(0)
  }, [query])

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${selected}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  if (!open) return null

  function go(result: Result) {
    setOpen(false)
    navigate(result.to)
  }

  return (
    <div className="palette-overlay" onClick={() => setOpen(false)}>
      <div
        className="palette-panel"
        role="dialog"
        aria-label="Quick search"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          className="palette-input"
          placeholder="Search heroes, items, pages, players…"
          aria-label="Quick search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setSelected((s) => Math.min(s + 1, results.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setSelected((s) => Math.max(s - 1, 0))
            } else if (e.key === 'Enter' && results[selected]) {
              go(results[selected])
            }
          }}
        />
        <div className="palette-results" ref={listRef}>
          {results.map((result, index) => (
            <button
              key={`${result.kind}-${result.to}`}
              data-index={index}
              className={`palette-row${index === selected ? ' selected' : ''}`}
              onMouseEnter={() => setSelected(index)}
              onClick={() => go(result)}
            >
              {result.icon ? (
                <img src={result.icon} alt="" loading="lazy" />
              ) : (
                <span className="palette-glyph">{result.kind === 'page' ? '◆' : '⌕'}</span>
              )}
              <span className="palette-label">{result.label}</span>
              <span className="palette-kind">
                {result.kind === 'player-search' ? 'players' : result.kind}
              </span>
            </button>
          ))}
        </div>
        <div className="palette-hint">
          <span>↑↓ navigate</span>
          <span>Enter open</span>
          <span>Esc close</span>
        </div>
      </div>
    </div>
  )
}
