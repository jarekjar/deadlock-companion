import { rankName } from '../lib/api'
import { useRankAssets } from '../lib/queries'

/**
 * Small inline rank emblem shown next to player names. Renders nothing when
 * the player has no visible rank (unranked, or rank hidden) — most rows.
 */
export default function RankBadge({
  badge,
  showName = false,
}: {
  badge: number | undefined
  showName?: boolean
}) {
  const ranks = useRankAssets()
  if (!badge || !ranks.data) return null
  const tier = Math.floor(badge / 10)
  const subrank = badge % 10
  const rank = ranks.data.find((r) => r.tier === tier)
  if (!rank) return null
  const image =
    rank.images[`small_subrank${subrank}_webp`] ??
    rank.images[`subrank${subrank}_webp`] ??
    rank.images.large_webp
  const name = rankName(badge, ranks.data)
  return (
    <span className="rank-badge" title={name}>
      {image && <img src={image} alt={name} loading="lazy" />}
      {showName && <span>{name}</span>}
    </span>
  )
}
