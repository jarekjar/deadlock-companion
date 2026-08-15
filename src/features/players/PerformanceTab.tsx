import { useMemo, useState } from 'react'
import LineChart from '../../shared/LineChart'
import {
  isWin,
  type HeroAsset,
  type MatchHistoryEntry,
  type MetricStats,
  type ModeFilterValue,
} from '../../lib/api'
import { METRIC_ADVICE, percentileOf, performanceScore, scoreGrade } from '../../lib/metrics'
import { usePlayerMetrics } from '../../lib/queries'

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })
const dateFmt = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: '2-digit',
})

const dec1 = (v: number) => v.toFixed(1)
const dec2 = (v: number) => v.toFixed(2)
const pct = (v: number) => `${(v * 100).toFixed(1)}%`
const big = (v: number) => compact.format(v)

interface MetricDef {
  key: string
  label: string
  fmt: (v: number) => string
  /** Deaths, damage taken: a low value is the good end of the curve. */
  lowerIsBetter?: boolean
}

const METRICS: MetricDef[] = [
  { key: 'kda', label: 'KDA', fmt: dec2 },
  { key: 'kills', label: 'Kills per match', fmt: dec1 },
  { key: 'assists', label: 'Assists per match', fmt: dec1 },
  { key: 'deaths', label: 'Deaths per match', fmt: dec1, lowerIsBetter: true },
  { key: 'net_worth_per_min', label: 'Souls per min', fmt: big },
  { key: 'last_hits', label: 'Last hits per match', fmt: dec1 },
  { key: 'denies', label: 'Denies per match', fmt: dec1 },
  { key: 'accuracy', label: 'Accuracy', fmt: pct },
  { key: 'crit_shot_rate', label: 'Crit shot rate', fmt: pct },
  { key: 'player_damage_per_min', label: 'Damage per min', fmt: big },
  { key: 'player_damage_taken_per_min', label: 'Damage taken per min', fmt: big, lowerIsBetter: true },
  { key: 'healing_per_min', label: 'Healing per min', fmt: big },
  { key: 'boss_damage_per_min', label: 'Boss damage per min', fmt: big },
]

/** Percentile → styling bucket shared with win-rate coloring. */
function rankClass(topShare: number): string {
  if (topShare <= 25) return 'wr-good'
  if (topShare >= 75) return 'wr-bad'
  return ''
}

export default function PerformanceTab({
  accountId,
  matches,
  heroes,
  sinceUnix,
  windowText,
  mode,
}: {
  accountId: number
  matches: MatchHistoryEntry[]
  heroes: Map<number, HeroAsset> | undefined
  sinceUnix: number
  windowText: string
  mode: ModeFilterValue
}) {
  const player = usePlayerMetrics(accountId, sinceUnix, mode)
  const global = usePlayerMetrics(0, sinceUnix, mode)

  const score = useMemo(
    () => (player.data && global.data ? performanceScore(player.data, global.data) : null),
    [player.data, global.data],
  )

  const rows = useMemo(() => {
    if (!player.data || !global.data) return null
    return METRICS.flatMap((def) => {
      const mine: MetricStats | undefined = player.data[def.key]
      const pop: MetricStats | undefined = global.data[def.key]
      if (!mine || !pop) return []
      const percentile = percentileOf(mine.avg, pop)
      const displayed = def.lowerIsBetter ? 100 - percentile : percentile
      return [
        {
          def,
          value: mine.avg,
          median: pop.percentile50,
          percentile: displayed,
          topShare: 100 - displayed,
        },
      ]
    })
  }, [player.data, global.data])

  const strengths = useMemo(
    () => (score ? score.metrics.filter((m) => m.beats >= 55).slice(0, 3) : []),
    [score],
  )
  const focus = useMemo(
    () =>
      score
        ? [...score.metrics]
            .reverse()
            .filter((m) => m.beats <= 50)
            .slice(0, 3)
        : [],
    [score],
  )

  return (
    <>
      {score && (
        <section className="data-section">
          <div className="score-head">
            <div className="score-dial">
              <span className="score-number mono">{score.score}</span>
              <span className={`score-grade grade-${scoreGrade(score.score)}`}>
                {scoreGrade(score.score)}
              </span>
            </div>
            <div className="score-copy">
              <h3>Performance Score</h3>
              <p className="grid-note left-note">
                An impact-weighted average of where this player lands on every tracked
                player's curve over {windowText} — 50 is dead average, 99 is the very top.
              </p>
            </div>
          </div>
          {(strengths.length > 0 || focus.length > 0) && (
            <div className="coach-grid">
              {strengths.length > 0 && (
                <div className="coach-col">
                  <h4>Great at</h4>
                  <ul>
                    {strengths.map((m) => (
                      <li key={m.key}>
                        <strong>{m.label}</strong> — better than{' '}
                        <span className="mono wr-good">{Math.round(m.beats)}%</span> of players
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {focus.length > 0 && (
                <div className="coach-col">
                  <h4>Sharpen this</h4>
                  <ul>
                    {focus.map((m) => (
                      <li key={m.key}>
                        <strong>{m.label}</strong>
                        {' — '}
                        {METRIC_ADVICE[m.key] ?? 'below the field here.'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      <section className="data-section">
        <h3>Versus Everyone</h3>
        {player.isError || global.isError ? (
          <div className="page-note error">Could not load performance metrics</div>
        ) : !rows ? (
          <div className="page-note">Loading performance metrics</div>
        ) : (
          <>
            <div className="metric-list">
              {rows.map(({ def, value, median, percentile, topShare }) => (
                <div key={def.key} className="metric-row">
                  <span className="metric-label">{def.label}</span>
                  <span className="metric-value mono">{def.fmt(value)}</span>
                  <span className="metric-median">median {def.fmt(median)}</span>
                  <span className="metric-bar" aria-hidden>
                    <span className="metric-bar-fill" style={{ width: `${percentile}%` }} />
                  </span>
                  <span className={`metric-top mono ${rankClass(topShare)}`}>
                    top {Math.max(1, Math.round(topShare))}%
                  </span>
                </div>
              ))}
            </div>
            <p className="grid-note left-note">
              This player's per-match averages over {windowText}, placed on the curve of every
              tracked player. For deaths and damage taken, "top" means lower than the field.
            </p>
          </>
        )}
      </section>

      <Trends matches={matches} heroes={heroes} sinceUnix={sinceUnix} />
    </>
  )
}

/* ---- performance trends (rolling averages over the match history) ---- */

const TREND_WINDOW = 20

type TrendMetric = 'win' | 'kda' | 'souls'

const TREND_METRICS: { value: TrendMetric; label: string }[] = [
  { value: 'win', label: 'Win rate' },
  { value: 'kda', label: 'KDA' },
  { value: 'souls', label: 'Souls per min' },
]

export function Trends({
  matches,
  heroes,
  sinceUnix = 0,
}: {
  matches: MatchHistoryEntry[]
  heroes: Map<number, HeroAsset> | undefined
  sinceUnix?: number
}) {
  const [metric, setMetric] = useState<TrendMetric>('win')
  const [heroFilter, setHeroFilter] = useState(0)

  const heroOptions = useMemo(() => {
    const counts = new Map<number, number>()
    for (const m of matches) counts.set(m.hero_id, (counts.get(m.hero_id) ?? 0) + 1)
    return [...counts.entries()]
      .filter(([, count]) => count >= TREND_WINDOW)
      .map(([id]) => ({ id, name: heroes?.get(id)?.name ?? `Hero ${id}` }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [matches, heroes])

  const points = useMemo(() => {
    const ordered = matches
      .filter((m) => m.start_time >= sinceUnix && (heroFilter === 0 || m.hero_id === heroFilter))
      .sort((a, b) => a.start_time - b.start_time)
    if (ordered.length < TREND_WINDOW) return []
    const valueOf = (m: MatchHistoryEntry) => {
      switch (metric) {
        case 'win':
          return isWin(m) ? 100 : 0
        case 'kda':
          return m.player_deaths === 0
            ? m.player_kills + m.player_assists
            : (m.player_kills + m.player_assists) / m.player_deaths
        case 'souls':
          return m.match_duration_s > 0 ? m.net_worth / (m.match_duration_s / 60) : 0
      }
    }
    const values = ordered.map(valueOf)
    const out: { x: number; y: number }[] = []
    let sum = 0
    for (let i = 0; i < values.length; i++) {
      sum += values[i]
      if (i >= TREND_WINDOW) sum -= values[i - TREND_WINDOW]
      if (i >= TREND_WINDOW - 1) {
        out.push({ x: ordered[i].start_time, y: sum / TREND_WINDOW })
      }
    }
    return out
  }, [matches, metric, heroFilter, sinceUnix])

  if (matches.length < TREND_WINDOW) return null

  const metricLabel = TREND_METRICS.find((m) => m.value === metric)!.label
  const formatY = (y: number) =>
    metric === 'win' ? `${y.toFixed(0)}%` : metric === 'kda' ? y.toFixed(2) : compact.format(y)
  // win rate is a percentage: keep the axis inside 0-100
  const winDomain = ((): [number, number] | undefined => {
    if (metric !== 'win' || points.length === 0) return undefined
    const values = points.map((p) => p.y)
    return [Math.max(0, Math.min(...values) - 5), Math.min(100, Math.max(...values) + 5)]
  })()

  return (
    <section className="data-section">
      <h3>Performance Trends</h3>
      <div className="control-bar">
        <span className="cb-group">
          <span className="cb-label">Metric</span>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as TrendMetric)}
            aria-label="Trend metric"
          >
            {TREND_METRICS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </span>
        <span className="cb-group">
          <span className="cb-label">Hero</span>
          <select
            value={heroFilter}
            onChange={(e) => setHeroFilter(Number(e.target.value))}
            aria-label="Filter trend by hero"
          >
            <option value={0}>All heroes</option>
            {heroOptions.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </span>
      </div>
      {points.length < 2 ? (
        <div className="page-note">Not enough matches</div>
      ) : (
        <LineChart
          xs={points.map((p) => p.x)}
          series={[{ label: metricLabel, color: '#c9a24b', values: points.map((p) => p.y) }]}
          formatX={(x) => dateFmt.format(x * 1000)}
          formatY={formatY}
          yDomain={winDomain}
          ariaLabel={`${metricLabel} trend`}
          legendNote={`rolling ${TREND_WINDOW}-match average`}
        />
      )}
    </section>
  )
}
