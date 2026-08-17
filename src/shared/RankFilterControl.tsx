import { RANK_BRACKETS, useRankFilter } from '../lib/rankFilter'
import { useModeFilter } from '../lib/modeFilter'

/** Control-bar group for the global rank bracket. */
export default function RankFilterControl() {
  const { minBadge, setMinBadge } = useRankFilter()
  const { mode } = useModeFilter()
  // the API can't combine a rank bracket with Street Brawl, so brawl queries
  // ignore the bracket (see filterParams in api.ts) — mirror that here
  const disabled = mode === 'brawl'
  return (
    <span className="cb-group">
      <span className="cb-label">Ranks</span>
      <select
        value={disabled ? 0 : minBadge}
        onChange={(e) => setMinBadge(Number(e.target.value))}
        disabled={disabled}
        title={disabled ? 'Street Brawl stats cover all ranks' : undefined}
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
