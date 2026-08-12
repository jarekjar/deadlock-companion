import { useEffect, useRef, useState } from 'react'
import { Alert, StyleSheet, Switch, Text, TextInput, View } from 'react-native'
import timersData from '../../data/timers.json'
import { Btn, Card, Mono, Note, Screen, SectionTitle } from '../../components/ui'
import {
  clearSpawnAlerts,
  ensureNotifyPermission,
  rescheduleSpawnAlerts,
} from '../../lib/notifications'
import { loadJson, saveJson } from '../../lib/storage'
import {
  emptyState,
  formatClock,
  nextSpawn,
  parseGameTime,
  type ObjectiveDef,
} from '../../lib/timerEngine'
import { useMatchClock } from '../../lib/useMatchClock'
import { c, f } from '../../theme'

const objectives = timersData.objectives as ObjectiveDef[]
const SETTINGS_KEY = 'dc.alertSettings.v1'
const SOON_SEC = 30

interface AlertSettings {
  notify: boolean
  leadSec: number
}

export default function TimersScreen() {
  const {
    ready,
    clock,
    t,
    states,
    startMatch,
    pauseMatch,
    resumeMatch,
    resyncMatch,
    resetMatch,
    recordEvent,
    undoEvent,
  } = useMatchClock()
  const [settings, setSettings] = useState<AlertSettings>({ notify: false, leadSec: 20 })
  const [syncInput, setSyncInput] = useState('')
  const settingsLoaded = useRef(false)

  useEffect(() => {
    void loadJson<AlertSettings>(SETTINGS_KEY).then((saved) => {
      if (saved) setSettings(saved)
      settingsLoaded.current = true
    })
  }, [])
  useEffect(() => {
    if (settingsLoaded.current) void saveJson(SETTINGS_KEY, settings)
  }, [settings])

  // Re-plan the scheduled notifications whenever the clock anchor, recorded
  // events, or alert settings change. (The anchor only changes on start /
  // pause / resume / sync — not every tick.)
  useEffect(() => {
    if (!ready) return
    if (settings.notify) {
      void rescheduleSpawnAlerts(objectives, clock, states, settings.leadSec)
    } else {
      void clearSpawnAlerts()
    }
  }, [ready, clock, states, settings])

  async function toggleNotify(enabled: boolean) {
    if (!enabled) {
      setSettings((s) => ({ ...s, notify: false }))
      return
    }
    const granted = await ensureNotifyPermission()
    if (!granted) {
      Alert.alert('Notifications blocked', 'Allow notifications for The Cursed Apple in Android settings to get spawn alerts.')
    }
    setSettings((s) => ({ ...s, notify: granted }))
  }

  function handleSync() {
    const seconds = parseGameTime(syncInput)
    if (seconds === null) return
    resyncMatch(seconds)
    setSyncInput('')
  }

  return (
    <Screen title="Spawn Timers">
      <Card style={styles.clockCard}>
        <Text style={styles.clockLabel}>Match Clock</Text>
        <Text style={styles.clock}>{formatClock(t)}</Text>
        <View style={styles.controls}>
          {!clock && <Btn label="Start Match" solid onPress={startMatch} />}
          {clock?.running && <Btn label="Pause" onPress={pauseMatch} />}
          {clock && !clock.running && <Btn label="Resume" solid onPress={resumeMatch} />}
          {clock && (
            <Btn
              label="Reset"
              onPress={() =>
                Alert.alert('Reset the match clock?', undefined, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Reset', style: 'destructive', onPress: resetMatch },
                ])
              }
            />
          )}
        </View>
        <View style={styles.syncRow}>
          <TextInput
            style={styles.syncInput}
            value={syncInput}
            onChangeText={setSyncInput}
            placeholder="12:34"
            placeholderTextColor={c.inkFaint}
            keyboardType="numbers-and-punctuation"
            onSubmitEditing={handleSync}
          />
          <Btn label="Sync" small onPress={handleSync} />
        </View>
        {!clock && (
          <Note>
            Press Start when the in-game clock hits 0:00 — or type the current game time and
            Sync mid-match.
          </Note>
        )}
      </Card>

      <Card style={styles.alertCard}>
        <View style={styles.alertRow}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.alertTitle}>Spawn alerts</Text>
            <Note>
              Fire as notifications even with the screen off — keep the phone next to your
              keyboard.
            </Note>
          </View>
          <Switch
            value={settings.notify}
            onValueChange={(v) => void toggleNotify(v)}
            trackColor={{ false: c.rule, true: c.brassDim }}
            thumbColor={settings.notify ? c.brassBright : c.inkFaint}
          />
        </View>
        {settings.notify && (
          <View style={styles.leadRow}>
            <Text style={styles.leadLabel}>Lead time</Text>
            {[10, 20, 30].map((sec) => (
              <Btn
                key={sec}
                small
                solid={settings.leadSec === sec}
                label={`${sec}s`}
                onPress={() => setSettings((s) => ({ ...s, leadSec: sec }))}
              />
            ))}
          </View>
        )}
      </Card>

      <SectionTitle>Objectives</SectionTitle>
      {objectives.map((def) => (
        <ObjectiveRow
          key={def.id}
          def={def}
          t={t}
          events={states[def.id]?.events ?? []}
          onEvent={() => recordEvent(def.id)}
          onUndo={() => undoEvent(def.id)}
        />
      ))}
      <Note>
        Timings as of patch {timersData.patch}. Camps and boxes respawn per-instance after
        clear, so only their first spawn is tracked.
      </Note>
    </Screen>
  )
}

function ObjectiveRow({
  def,
  t,
  events,
  onEvent,
  onUndo,
}: {
  def: ObjectiveDef
  t: number
  events: number[]
  onEvent: () => void
  onUndo: () => void
}) {
  const status = nextSpawn(def, events.length ? { events } : emptyState(), t)
  const remaining = status.kind === 'waiting' ? status.spawnsAt - t : 0
  const soon = status.kind === 'waiting' && remaining <= SOON_SEC

  return (
    <Card style={styles.objCard}>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={styles.objNameRow}>
          <Text style={styles.objName}>{def.name}</Text>
          {def.tier ? <Text style={styles.objTier}>{def.tier}</Text> : null}
        </View>
        {def.note ? <Note>{def.note}</Note> : null}
        {events.length > 0 && (
          <Text style={styles.eventCount}>
            {def.eventLabel ?? 'Marked'} ×{events.length} · last at {formatClock(events[events.length - 1])}
          </Text>
        )}
      </View>
      <View style={styles.objRight}>
        {status.kind === 'waiting' ? (
          <Mono size={20} color={soon ? c.brassBright : c.ink} style={styles.countdown}>
            {formatClock(remaining)}
          </Mono>
        ) : (
          <Text style={styles.upBadge}>{status.kind === 'up' ? 'UP' : 'SPAWNED'}</Text>
        )}
        {def.eventLabel && (
          <View style={styles.eventBtns}>
            {status.kind === 'up' && <Btn small label={def.eventLabel} onPress={onEvent} />}
            {events.length > 0 && <Btn small label="Undo" onPress={onUndo} />}
          </View>
        )}
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  clockCard: { alignItems: 'center', gap: 12 },
  clockLabel: {
    fontFamily: f.bodyBold,
    fontSize: 11,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    color: c.inkFaint,
  },
  clock: { fontFamily: f.monoSemi, fontSize: 54, color: c.brassBright },
  controls: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  syncRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  syncInput: {
    borderWidth: 1,
    borderColor: c.rule,
    borderRadius: 2,
    backgroundColor: c.bgInset,
    color: c.ink,
    fontFamily: f.mono,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: 100,
    textAlign: 'center',
  },
  alertCard: { gap: 12 },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  alertTitle: { fontFamily: f.bodySemi, fontSize: 15, color: c.ink },
  leadRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  leadLabel: { fontFamily: f.bodySemi, fontSize: 12, color: c.inkFaint, marginRight: 4 },
  objCard: { flexDirection: 'row', gap: 12, paddingVertical: 12 },
  objNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  objName: { fontFamily: f.bodySemi, fontSize: 15, color: c.ink },
  objTier: {
    fontFamily: f.bodyBold,
    fontSize: 10,
    color: c.brass,
    borderWidth: 1,
    borderColor: c.brassDim,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  eventCount: { fontFamily: f.mono, fontSize: 11, color: c.inkFaint },
  objRight: { alignItems: 'flex-end', gap: 8, justifyContent: 'center' },
  countdown: { fontVariant: ['tabular-nums'] },
  upBadge: {
    fontFamily: f.bodyBold,
    fontSize: 13,
    letterSpacing: 1.5,
    color: c.up,
  },
  eventBtns: { flexDirection: 'row', gap: 6 },
})
