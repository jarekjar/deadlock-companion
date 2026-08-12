import { RANK_BRACKETS, useRankFilter } from '../lib/rankFilter'

/** Control-bar group for the global rank bracket. */
export default function RankFilterControl() {
  const { minBadge, setMinBadge } = useRankFilter()
  return (
    <span className="cb-group">
      <span className="cb-label">Ranks</span>
      <select
        value={minBadge}
        onChange={(e) => setMinBadge(Number(e.target.value))}
        aria-label="Filter by rank bracket"
      >
        {RANK_BRACKETS.map((b) => (
          <option key={b.minBadge} value={b.minBadge}>
            {b.label}
          </option>
        ))}
      </select>
    </span>
  )
}
