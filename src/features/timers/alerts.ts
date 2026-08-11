export interface AlertSettings {
  /** Seconds of warning before a spawn; 0 disables alerts entirely. */
  leadSec: number
  sound: boolean
  notify: boolean
}

export const defaultAlertSettings: AlertSettings = {
  leadSec: 0,
  sound: true,
  notify: false,
}

let audioContext: AudioContext | null = null

/** Two short brass-band notes; synthesized so no audio asset is needed. */
export function playChime(): void {
  try {
    audioContext ??= new AudioContext()
    const now = audioContext.currentTime
    for (const [offset, frequency] of [
      [0, 659.25],
      [0.18, 880],
    ] as const) {
      const osc = audioContext.createOscillator()
      const gain = audioContext.createGain()
      osc.type = 'triangle'
      osc.frequency.value = frequency
      gain.gain.setValueAtTime(0.0001, now + offset)
      gain.gain.exponentialRampToValueAtTime(0.08, now + offset + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.25)
      osc.connect(gain).connect(audioContext.destination)
      osc.start(now + offset)
      osc.stop(now + offset + 0.3)
    }
  } catch {
    // no audio available; alerts silently degrade
  }
}

export async function requestNotifyPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  return (await Notification.requestPermission()) === 'granted'
}

export function sendNotification(title: string, body: string): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  try {
    new Notification(title, { body, silent: true })
  } catch {
    // some platforms (mobile Chrome) require a service worker; degrade silently
  }
}
