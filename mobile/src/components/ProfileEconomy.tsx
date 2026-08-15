import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { type PerformanceCurvePoint } from '../lib/api'
import { usePerformanceCurve } from '../lib/queries'
import { c, compact, f } from '../theme'
import LineChart from './LineChart'
import { Card, Note, SectionTitle } from './ui'

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

export default function ProfileEconomy({ accountId }: { accountId: number }) {
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
    const rows = (p: PerformanceCurvePoint) => {
      const parts = SOURCES.map((s) => ({ ...s, value: Math.max(0, s.of(p)) }))
      const total = parts.reduce((sum, s) => sum + s.value, 0)
      return parts.map((s) => ({ ...s, share: total > 0 ? (s.value / total) * 100 : 0 }))
    }
    return {
      minute,
      mine: rows(atMinute(player.data, minute)!),
      everyone: rows(atMinute(global.data, minute)!),
    }
  }, [player.data, global.data])

  if (player.isError || global.isError) return <Note>Could not load economy data.</Note>
  if (!player.data || !global.data) return <Note>Loading economy data…</Note>
  if (!curve || curve.length === 0) {
    return <Note>Not enough tracked matches for economy analysis.</Note>
  }

  const milestones = [10, 20, 30].flatMap((minute) => {
    const mine = atMinute(player.data, minute)
    const everyone = atMinute(global.data, minute)
    return mine && everyone
      ? [{ minute, value: mine.net_worth_avg, diff: mine.net_worth_avg - everyone.net_worth_avg }]
      : []
  })

  // coaching notes derived from where this economy differs from the field's
  const notes: { good: boolean; text: string }[] = []
  const early = milestones.find((m) => m.minute === 10)
  if (early) {
    if (early.diff <= -300) {
      notes.push({
        good: false,
        text: `The lane phase leaks souls — down ${compact(-early.diff)} on the field by 10:00. Prioritize last hits and the boxes between waves.`,
      })
    } else if (early.diff >= 300) {
      notes.push({ good: true, text: `Strong lanes — up ${compact(early.diff)} on the field by 10:00.` })
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
    if (share(breakdown.mine, 'Player kills') - share(breakdown.everyone, 'Player kills') >= 4) {
      notes.push({
        good: true,
        text: 'This economy runs on kills — snowballing works, just keep farming when no fight is on.',
      })
    }
  }

  return (
    <>
      <SectionTitle>Souls Over Time</SectionTitle>
      <Card>
        <LineChart
          xs={curve.map((p) => p.minute)}
          values={curve.map((p) => p.mine)}
          compareValues={curve.map((p) => p.everyone)}
          formatX={(x) => `${Math.round(x)}m`}
          formatYTick={(y) => compact(y)}
        />
        <Note>Gold line: this player · grey line: all players. Last 30 days.</Note>
      </Card>

      {milestones.length > 0 && (
        <View style={styles.milestones}>
          {milestones.map((m) => (
            <View key={m.minute} style={styles.milestone}>
              <Text style={styles.milestoneLabel}>at {m.minute}:00</Text>
              <Text style={styles.milestoneValue}>{compact(m.value)}</Text>
              <Text
                style={[styles.milestoneDiff, { color: m.diff >= 0 ? c.up : c.danger }]}
              >
                {m.diff >= 0 ? '+' : ''}
                {compact(m.diff)} vs field
              </Text>
            </View>
          ))}
        </View>
      )}

      {breakdown && (
        <>
          <SectionTitle>Where The Souls Come From</SectionTitle>
          <Card style={{ gap: 12 }}>
            {(
              [
                ['This player', breakdown.mine],
                ['All players', breakdown.everyone],
              ] as const
            ).map(([label, parts]) => (
              <View key={label} style={{ gap: 5 }}>
                <Text style={styles.stackLabel}>{label}</Text>
                <View style={styles.stack}>
                  {parts.map((part) => (
                    <View
                      key={part.label}
                      style={{ width: `${part.share}%`, backgroundColor: part.color }}
                    />
                  ))}
                </View>
              </View>
            ))}
            <View style={styles.legend}>
              {SOURCES.map((s) => {
                const mineShare = breakdown.mine.find((p) => p.label === s.label)?.share ?? 0
                return (
                  <View key={s.label} style={styles.legendItem}>
                    <View style={[styles.swatch, { backgroundColor: s.color }]} />
                    <Text style={styles.legendText}>
                      {s.label} {mineShare.toFixed(0)}%
                    </Text>
                  </View>
                )
              })}
            </View>
          </Card>
          <Note>
            Souls by source through {breakdown.minute} minutes — this player versus everyone.
          </Note>
        </>
      )}

      {notes.length > 0 && (
        <>
          <SectionTitle>Coaching Notes</SectionTitle>
          <Card style={{ gap: 10 }}>
            {notes.map((note) => (
              <View
                key={note.text}
                style={[styles.note, { borderLeftColor: note.good ? c.up : c.danger }]}
              >
                <Text style={styles.noteText}>{note.text}</Text>
              </View>
            ))}
          </Card>
        </>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  milestones: { flexDirection: 'row', gap: 8 },
  milestone: {
    flex: 1,
    backgroundColor: c.bgRaised,
    borderWidth: 1,
    borderColor: c.rule,
    borderRadius: 2,
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 3,
    alignItems: 'center',
  },
  milestoneLabel: {
    fontFamily: f.bodySemi,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: c.inkFaint,
  },
  milestoneValue: { fontFamily: f.monoSemi, fontSize: 17, color: c.ink },
  milestoneDiff: { fontFamily: f.mono, fontSize: 11 },
  stackLabel: {
    fontFamily: f.bodySemi,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: c.inkDim,
  },
  stack: {
    flexDirection: 'row',
    height: 16,
    borderWidth: 1,
    borderColor: c.rule,
    overflow: 'hidden',
  },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, columnGap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  swatch: { width: 9, height: 9 },
  legendText: { fontFamily: f.body, fontSize: 11, color: c.inkDim },
  note: { borderLeftWidth: 2, paddingLeft: 10 },
  noteText: { fontFamily: f.body, fontSize: 13, color: c.inkDim, lineHeight: 19 },
})
