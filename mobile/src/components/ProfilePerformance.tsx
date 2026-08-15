import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { type MetricStats, type ModeFilterValue } from '../lib/api'
import { METRIC_ADVICE, percentileOf, performanceScore, scoreGrade } from '../lib/metrics'
import { usePlayerMetrics } from '../lib/queries'
import { c, compact, f } from '../theme'
import { Card, Note, SectionTitle } from './ui'

const dec1 = (v: number) => v.toFixed(1)
const dec2 = (v: number) => v.toFixed(2)
const pct = (v: number) => `${(v * 100).toFixed(1)}%`
const big = (v: number) => compact(v)

interface MetricDef {
  key: string
  label: string
  fmt: (v: number) => string
  /** Deaths, damage taken: a low value is the good end of the curve. */
  lowerIsBetter?: boolean
}

const METRICS: MetricDef[] = [
  { key: 'kda', label: 'KDA', fmt: dec2 },
  { key: 'kills', label: 'Kills / match', fmt: dec1 },
  { key: 'assists', label: 'Assists / match', fmt: dec1 },
  { key: 'deaths', label: 'Deaths / match', fmt: dec1, lowerIsBetter: true },
  { key: 'net_worth_per_min', label: 'Souls / min', fmt: big },
  { key: 'last_hits', label: 'Last hits / match', fmt: dec1 },
  { key: 'denies', label: 'Denies / match', fmt: dec1 },
  { key: 'accuracy', label: 'Accuracy', fmt: pct },
  { key: 'crit_shot_rate', label: 'Crit shot rate', fmt: pct },
  { key: 'player_damage_per_min', label: 'Damage / min', fmt: big },
  { key: 'player_damage_taken_per_min', label: 'Damage taken / min', fmt: big, lowerIsBetter: true },
  { key: 'healing_per_min', label: 'Healing / min', fmt: big },
  { key: 'boss_damage_per_min', label: 'Boss damage / min', fmt: big },
]

function topColor(topShare: number): string {
  if (topShare <= 25) return c.up
  if (topShare >= 75) return c.danger
  return c.ink
}

export default function ProfilePerformance({
  accountId,
  sinceUnix,
  windowText,
  mode,
}: {
  accountId: number
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
      return [{ def, value: mine.avg, percentile: displayed, topShare: 100 - displayed }]
    })
  }, [player.data, global.data])

  if (player.isError || global.isError) return <Note>Could not load performance metrics.</Note>
  if (!rows || !score) return <Note>Loading performance metrics…</Note>

  const strengths = score.metrics.filter((m) => m.beats >= 55).slice(0, 3)
  const focus = [...score.metrics]
    .reverse()
    .filter((m) => m.beats <= 50)
    .slice(0, 3)

  return (
    <>
      <SectionTitle>Performance Score</SectionTitle>
      <Card style={styles.scoreCard}>
        <View style={styles.dial}>
          <Text style={styles.scoreNumber}>{score.score}</Text>
          <View style={styles.gradeBadge}>
            <Text style={styles.gradeText}>{scoreGrade(score.score)}</Text>
          </View>
        </View>
        <Text style={styles.scoreBlurb}>
          Where {windowText} lands on every tracked player's curve — 50 is dead average, 99 is
          the very top.
        </Text>
      </Card>

      {strengths.length > 0 && (
        <>
          <SectionTitle>Great At</SectionTitle>
          <Card style={{ gap: 8 }}>
            {strengths.map((m) => (
              <Text key={m.key} style={styles.coachLine}>
                <Text style={styles.coachStrong}>{m.label}</Text> — better than{' '}
                <Text style={{ color: c.up, fontFamily: f.monoSemi }}>{Math.round(m.beats)}%</Text>{' '}
                of players
              </Text>
            ))}
          </Card>
        </>
      )}

      {focus.length > 0 && (
        <>
          <SectionTitle>Sharpen This</SectionTitle>
          <Card style={{ gap: 8 }}>
            {focus.map((m) => (
              <Text key={m.key} style={styles.coachLine}>
                <Text style={styles.coachStrong}>{m.label}</Text> —{' '}
                {METRIC_ADVICE[m.key] ?? 'below the field here.'}
              </Text>
            ))}
          </Card>
        </>
      )}

      <SectionTitle>Versus Everyone</SectionTitle>
      <Card style={{ gap: 12 }}>
        {rows.map(({ def, value, percentile, topShare }) => (
          <View key={def.key} style={{ gap: 4 }}>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>{def.label}</Text>
              <Text style={styles.metricValue}>{def.fmt(value)}</Text>
              <Text style={[styles.metricTop, { color: topColor(topShare) }]}>
                top {Math.max(1, Math.round(topShare))}%
              </Text>
            </View>
            <View style={styles.bar}>
              <View style={[styles.barFill, { width: `${percentile}%` }]} />
            </View>
          </View>
        ))}
      </Card>
      <Note>
        Per-match averages over {windowText}. For deaths and damage taken, "top" means lower
        than the field.
      </Note>
    </>
  )
}

const styles = StyleSheet.create({
  scoreCard: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  dial: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 2,
    borderColor: c.brassDim,
    backgroundColor: c.bgInset,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: { fontFamily: f.monoSemi, fontSize: 26, color: c.ink },
  gradeBadge: {
    position: 'absolute',
    top: -7,
    right: -7,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: c.brass,
    backgroundColor: c.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeText: { fontFamily: f.bodyBold, fontSize: 13, color: c.brassBright },
  scoreBlurb: { flex: 1, fontFamily: f.body, fontSize: 12, color: c.inkFaint, lineHeight: 17 },
  coachLine: { fontFamily: f.body, fontSize: 13, color: c.inkDim, lineHeight: 19 },
  coachStrong: { fontFamily: f.bodySemi, color: c.ink },
  metricRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  metricLabel: {
    flex: 1,
    fontFamily: f.bodySemi,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: c.inkDim,
  },
  metricValue: { fontFamily: f.monoSemi, fontSize: 13, color: c.ink },
  metricTop: { fontFamily: f.mono, fontSize: 12, width: 64, textAlign: 'right' },
  bar: { height: 5, backgroundColor: c.bgInset, borderWidth: 1, borderColor: c.ruleFaint },
  barFill: { height: '100%', backgroundColor: c.brass },
})
