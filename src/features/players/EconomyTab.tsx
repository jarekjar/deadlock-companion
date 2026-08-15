import { useMemo } from 'react'
import LineChart from '../../shared/LineChart'
import { type PerformanceCurvePoint } from '../../lib/api'
import { usePerformanceCurve } from '../../lib/queries'

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })

/** Chart cutoff: buckets past ~45 min only contain the rare marathon games. */
const MAX_MINUTES = 45

const SOURCES: { label: string; color: string; of: (p: PerformanceCurvePoint) => number }[] = [
  { label: 'Lane creeps', color: '#c9a24b', of: (p) => p.gold_lane_creep_avg + p.gold_lane_creep_orbs_avg },
  { label: 'Neutrals', color: '#8aa163', of: (p) => p.gold_neutral_creep_avg + p.gold_neutral_creep_orbs_avg },
  { label: 'Player kills', color: '#b0492f', of: (p) => p.gold_player_avg + p.gold_player_orbs_avg },
  { label: 'Bosses', color: '#7f9fc7', of: (p) => p.gold_boss_avg + p.gold_boss_orb_avg },
  { label: 'Treasure', color: '#ddb85f', of: (p) => p.gold_treasure_avg },
  { label: 'Denies', color: '#8f7434', of: (p) => p.gold_denied_avg },
]

export default function EconomyTab({ accountId }: { accountId: number }) {
  const player = usePerformanceCurve(accountId)
  const global = usePerformanceCurve(0)

  const curve = useMemo(() => {
    if (!player.data || !global.data) return null
    const globalByTime = new Map(global.data.map((p) => [p.game_time, p]))
    const points = player.data
      .filter((p) => p.game_time > 0 && p.game_time <= MAX_MINUTES && globalByTime.has(p.game_time))
      .map((p) => ({
        minute: p.game_time,
        mine: p.net_worth_avg,
        everyone: globalByTime.get(p.game_time)!.net_worth_avg,
      }))
    return points.length >= 3 ? points : []
  }, [player.data, global.data])

  const atMinute = (data: PerformanceCurvePoint[] | undefined, minute: number) =>
    data?.find((p) => p.game_time === minute)

  const breakdown = useMemo(() => {
    if (!player.data || !global.data) return null
    const minute = [30, 28, 26, 24, 32, 34].find(
      (m) => atMinute(player.data, m) && atMinute(global.data, m),
    )
    if (!minute) return null
    const mine = atMinute(player.data, minute)!
    const everyone = atMinute(global.data, minute)!
    const rows = (p: PerformanceCurvePoint) => {
      const parts = SOURCES.map((s) => ({ ...s, value: Math.max(0, s.of(p)) }))
      const total = parts.reduce((sum, s) => sum + s.value, 0)
      return parts.map((s) => ({ ...s, share: total > 0 ? (s.value / total) * 100 : 0 }))
    }
    return { minute, mine: rows(mine), everyone: rows(everyone) }
  }, [player.data, global.data])

  if (player.isError || global.isError) {
    return <div className="page-note error">Could not load economy data</div>
  }
  if (!player.data || !global.data) return <div className="page-note">Loading economy data</div>
  if (!curve || curve.length === 0) {
    return <div className="page-note">Not enough tracked matches for economy analysis</div>
  }

  const milestones = [10, 20, 30].flatMap((minute) => {
    const mine = atMinute(player.data, minute)
    const everyone = atMinute(global.data, minute)
    return mine && everyone ? [{ minute, mine, everyone }] : []
  })

  // coaching notes derived from where this economy differs from the field's
  const notes: { good: boolean; text: string }[] = []
  const early = milestones.find((m) => m.minute === 10)
  if (early) {
    const diff = early.mine.net_worth_avg - early.everyone.net_worth_avg
    if (diff <= -300) {
      notes.push({
        good: false,
        text: `The lane phase leaks souls — down ${compact.format(-diff)} on the field by 10:00. Prioritize last hits and the boxes between waves.`,
      })
    } else if (diff >= 300) {
      notes.push({
        good: true,
        text: `Strong lanes — up ${compact.format(diff)} on the field by 10:00.`,
      })
    }
  }
  if (breakdown) {
    const share = (rows: typeof breakdown.mine, label: string) =>
      rows.find((r) => r.label === label)?.share ?? 0
    const neutralGap = share(breakdown.mine, 'Neutrals') - share(breakdown.everyone, 'Neutrals')
    if (neutralGap <= -3) {
      notes.push({
        good: false,
        text: 'A smaller share of these souls comes from camps than the field — sweep neutrals on the way between fights.',
      })
    } else if (neutralGap >= 3) {
      notes.push({ good: true, text: 'Camps are pulling their weight in this economy.' })
    }
    const denyGap = share(breakdown.mine, 'Denies') - share(breakdown.everyone, 'Denies')
    if (denyGap <= -1) {
      notes.push({
        good: false,
        text: 'Denies barely feature here — confirming your orbs and denying theirs swings lanes twice as hard as a last hit.',
      })
    }
    const killShare = share(breakdown.mine, 'Player kills')
    if (killShare - share(breakdown.everyone, 'Player kills') >= 4) {
      notes.push({
        good: true,
        text: 'This economy runs on kills — snowballing works, just keep farming when no fight is on.',
      })
    }
  }

  return (
    <>
      <section className="data-section">
        <h3>Souls Over Time</h3>
        <LineChart
          xs={curve.map((p) => p.minute)}
          series={[
            { label: 'This player', color: '#c9a24b', values: curve.map((p) => p.mine) },
            { label: 'All players', color: '#7c6f58', values: curve.map((p) => p.everyone) },
          ]}
          formatX={(x) => `${Math.round(x)}m`}
          formatY={(y) => compact.format(y)}
          ariaLabel="Average net worth over game time"
          legendNote="average net worth by game time, last 30 days"
        />
      </section>

      {milestones.length > 0 && (
        <div className="stat-row">
          {milestones.map(({ minute, mine, everyone }) => {
            const diff = mine.net_worth_avg - everyone.net_worth_avg
            return (
              <div key={minute} className="stat-tile">
                <div className="stat-label">Souls at {minute}:00</div>
                <div className="stat-value">{compact.format(mine.net_worth_avg)}</div>
                <div className={`eco-diff mono ${diff >= 0 ? 'delta-up' : 'delta-down'}`}>
                  {diff >= 0 ? '+' : ''}
                  {compact.format(diff)} vs field
                </div>
              </div>
            )
          })}
        </div>
      )}

      {breakdown && (
        <section className="data-section">
          <h3>Where The Souls Come From</h3>
          <div className="eco-breakdown">
            {(
              [
                ['This player', breakdown.mine],
                ['All players', breakdown.everyone],
              ] as const
            ).map(([label, parts]) => (
              <div key={label} className="eco-row">
                <span className="eco-row-label">{label}</span>
                <span className="eco-stack" aria-hidden>
                  {parts.map((part) => (
                    <span
                      key={part.label}
                      style={{ width: `${part.share}%`, background: part.color }}
                      title={`${part.label} ${part.share.toFixed(0)}%`}
                    />
                  ))}
                </span>
              </div>
            ))}
          </div>
          <div className="eco-legend">
            {SOURCES.map((s) => {
              const mineShare = breakdown.mine.find((p) => p.label === s.label)?.share ?? 0
              return (
                <span key={s.label}>
                  <span className="swatch" style={{ background: s.color }} />
                  {s.label} <span className="mono">{mineShare.toFixed(0)}%</span>
                </span>
              )
            })}
          </div>
          <p className="grid-note left-note">
            Souls earned by source through {breakdown.minute} minutes, averaged over this player's
            tracked matches versus everyone's.
          </p>
        </section>
      )}

      {notes.length > 0 && (
        <section className="data-section">
          <h3>Coaching Notes</h3>
          <ul className="coach-notes">
            {notes.map((note) => (
              <li key={note.text} className={note.good ? 'coach-good' : 'coach-fix'}>
                {note.text}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
