import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { gameTime, type ClockState } from './clock'
import {
  emptyState,
  formatClock,
  nextSpawn,
  type ObjectiveDef,
  type ObjectiveState,
} from './timerEngine'

/** How far ahead (game seconds) to schedule alerts; refreshed on every change. */
const HORIZON_SEC = 45 * 60

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

export async function ensureNotifyPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('spawns', {
      name: 'Spawn alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 100, 200],
      lightColor: '#c9a24b',
    })
  }
  const settings = await Notifications.getPermissionsAsync()
  if (settings.granted) return true
  const result = await Notifications.requestPermissionsAsync()
  return result.granted
}

export async function clearSpawnAlerts(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync()
}

/**
 * Replace all scheduled alerts with the upcoming spawns implied by the
 * current clock + recorded events. Called on every clock/event/setting
 * change; scheduled notifications fire natively even with the app
 * backgrounded or the screen off — the point of the native app.
 */
export async function rescheduleSpawnAlerts(
  objectives: ObjectiveDef[],
  clock: ClockState | null,
  states: Record<string, ObjectiveState>,
  leadSec: number,
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync()
  if (!clock?.running || leadSec <= 0) return

  const nowMs = Date.now()
  const t = gameTime(clock, nowMs)
  const horizon = t + HORIZON_SEC

  const fires: { atMs: number; title: string }[] = []
  for (const def of objectives) {
    const spawnTimes: number[] = []
    if (def.mode === 'interval') {
      const interval = def.interval ?? 300
      let next = def.firstSpawn
      if (t >= def.firstSpawn) {
        next = def.firstSpawn + (Math.floor((t - def.firstSpawn) / interval) + 1) * interval
      }
      for (let s = next; s <= horizon; s += interval) spawnTimes.push(s)
    } else {
      const status = nextSpawn(def, states[def.id] ?? emptyState(), t)
      if (status.kind === 'waiting' && status.spawnsAt <= horizon) {
        spawnTimes.push(status.spawnsAt)
      }
    }
    for (const spawnAt of spawnTimes) {
      const fireMs = nowMs + (spawnAt - t - leadSec) * 1000
      if (fireMs > nowMs + 1000) fires.push({ atMs: fireMs, title: def.name })
    }
  }

  await Promise.all(
    fires.map((fire) =>
      Notifications.scheduleNotificationAsync({
        content: {
          title: fire.title,
          body: `Spawns in ${formatClock(leadSec)}`,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(fire.atMs),
          channelId: 'spawns',
        },
      }),
    ),
  )
}
