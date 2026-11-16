import { useState } from 'react'
import { rankName, seasonResets } from '../lib/api'
import { useRankAssets, useRankedSeasons } from '../lib/queries'

const resetFmt = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' })

/**
 * Inline rank emblem shown next to player names, framed as a chip so it reads
 * at a glance. Hover raises a card with the full-size emblem, the rank name,
 * and which season the badge is from.
 * Renders nothing when the player has no visible rank (unranked, or rank
 * hidden) — most rows.
 */
export default function RankBadge({
  badge,
  showName = false,
}: {
  badge: number | undefined
  showName?: boolean
}) {
  const ranks = useRankAssets()
  const seasons = useRankedSeasons()
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null)
  if (!badge || !ranks.data) return null
  const tier = Math.floor(badge / 10)
  const subrank = badge % 10
  const rank = ranks.data.find((r) => r.tier === tier)
  if (!rank) return null
  const image =
    rank.images[`small_subrank${subrank}_webp`] ??
    rank.images[`subrank${subrank}_webp`] ??
    rank.images.large_webp
  const largeImage =
    rank.images[`subrank${subrank}_webp`] ?? rank.images.large_webp ?? image
  const name = rankName(badge, ranks.data)

  // these are current ranks, so they're from the running season — name it in
  // the card, since each season starts with a (full or soft) reset
  const now = Date.now() / 1000
  const season = seasonResets(seasons.data)
    .filter((s) => s.startsAt <= now)
    .at(-1)

  function show(e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = Math.max(110, Math.min(window.innerWidth - 110, rect.left + rect.width / 2))
    setTip({ x, y: rect.top - 6 })
  }

  return (
    <span
      className="rank-badge"
      aria-label={name}
      onMouseEnter={show}
      onMouseLeave={() => setTip(null)}
    >
      {image && <img src={image} alt={name} loading="lazy" />}
      {showName && <span>{name}</span>}
      {tip && (
        <span className="rank-tip" style={{ left: tip.x, top: tip.y }}>
          {largeImage && <img src={largeImage} alt="" />}
          <span className="tip-name">{name}</span>
          {season && (
            <span className="tip-meta">
              {season.name} · since {resetFmt.format(season.startsAt * 1000)}
            </span>
          )}
        </span>
      )}
    </span>
  )
}
