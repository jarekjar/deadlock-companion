import { type ModeFilterValue } from '../lib/api'
import { MODE_OPTIONS, useModeFilter } from '../lib/modeFilter'

/** Control-bar group for the global mode bracket (ranked / brawl). */
export default function ModeFilterControl() {
  const { mode, setMode } = useModeFilter()
  return (
    <span className="cb-group">
      <span className="cb-label">Mode</span>
      <select
        value={mode}
        onChange={(e) => setMode(e.target.value as ModeFilterValue)}
        aria-label="Filter by game mode"
      >
        {MODE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </span>
  )
}
