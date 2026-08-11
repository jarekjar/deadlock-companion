import { useEffect, useRef, useState } from 'react'
import timersData from '../../data/timers.json'
import {
  emptyState,
  formatClock,
  nextSpawn,
  parseGameTime,
  type ObjectiveDef,
  type ObjectiveState,
} from './timerEngine'
import { useMatchClock } from './useMatchClock'
import { useMapAsset } from '../../lib/queries'
import {
  defaultAlertSettings,
  playChime,
  requestNotifyPermission,
  sendNotification,
  type AlertSettings,
} from './alerts'
import './timers.css'

const objectives = timersData.objectives as ObjectiveDef[]
const SETTINGS_KEY = 'dc.alertSettings.v1'
const SOON_THRESHOLD_SEC = 30

function loadSettings(): AlertSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? { ...defaultAlertSettings, ...JSON.parse(raw) } : defaultAlertSettings
  } catch {
    return defaultAlertSettings
  }
}

export default function TimersPage() {
  const {
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
  const [settings, setSettings] = useState<AlertSettings>(loadSettings)
  const [syncInput, setSyncInput] = useState('')
  const firedAlerts = useRef(new Set<string>())

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch {
      // storage unavailable; settings just won't persist
    }
  }, [settings])

  useEffect(() => {
    if (!clock?.running || settings.leadSec <= 0) return
    for (const def of objectives) {
      const status = nextSpawn(def, states[def.id] ?? emptyState(), t)
      if (status.kind !== 'waiting') continue
      const remaining = status.spawnsAt - t
      const key = `${def.id}@${status.spawnsAt}`
      if (remaining > 0 && remaining <= settings.leadSec && !firedAlerts.current.has(key)) {
        firedAlerts.current.add(key)
        if (settings.sound) playChime()
        if (settings.notify) {
          sendNotification(def.name, `Spawns in ${formatClock(remaining)}`)
        }
      }
    }
  }, [t, clock?.running, states, settings])

  function handleSync(e: React.FormEvent) {
    e.preventDefault()
    const seconds = parseGameTime(syncInput)
    if (seconds === null) return
    if (clock) {
      resyncMatch(seconds)
    } else {
      startMatch()
      resyncMatch(seconds)
    }
    setSyncInput('')
  }

  async function toggleNotify(enabled: boolean) {
    if (!enabled) {
      setSettings((s) => ({ ...s, notify: false }))
      return
    }
    const granted = await requestNotifyPermission()
    setSettings((s) => ({ ...s, notify: granted }))
  }

  return (
    <div className="narrow">
      <section className="clock-panel">
        <div className="clock-label caps">Match Clock</div>
        <div className="clock-time">{formatClock(t)}</div>
        <div className="clock-controls">
          {!clock && (
            <button className="btn btn-solid" onClick={startMatch}>
              Start Match
            </button>
          )}
          {clock?.running && (
            <button className="btn" onClick={pauseMatch}>
              Pause
            </button>
          )}
          {clock && !clock.running && (
            <button className="btn btn-solid" onClick={resumeMatch}>
              Resume
            </button>
          )}
          {clock && (
            <button
              className="btn"
              onClick={() => {
                if (window.confirm('Reset the match clock?')) resetMatch()
              }}
            >
              Reset
            </button>
          )}
          <form className="sync-form" onSubmit={handleSync}>
            <input
              value={syncInput}
              onChange={(e) => setSyncInput(e.target.value)}
              placeholder="12:34"
              aria-label="Sync to in-game time"
              inputMode="numeric"
            />
            <button className="btn" type="submit">
              Sync
            </button>
          </form>
        </div>
        {!clock && (
          <p className="clock-hint">
            Press Start when the in-game clock hits 0:00, or type the current game time and press
            Sync.
          </p>
        )}
        <div className="alert-controls">
          <label>
            Alert lead
            <select
              value={settings.leadSec}
              onChange={(e) => setSettings((s) => ({ ...s, leadSec: Number(e.target.value) }))}
            >
              <option value={0}>Off</option>
              <option value={10}>10s</option>
              <option value={15}>15s</option>
              <option value={20}>20s</option>
              <option value={30}>30s</option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.sound}
              onChange={(e) => setSettings((s) => ({ ...s, sound: e.target.checked }))}
            />
            Chime
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.notify}
              onChange={(e) => void toggleNotify(e.target.checked)}
            />
            Browser notification
          </label>
        </div>
      </section>

      <section className="board" aria-label="Spawn schedule">
        <div className="board-title caps">Spawn Schedule</div>
        {objectives.map((def) => (
          <ObjectiveRow
            key={def.id}
            def={def}
            state={states[def.id] ?? emptyState()}
            t={t}
            started={clock !== null}
            onEvent={() => recordEvent(def.id)}
            onUndo={() => undoEvent(def.id)}
          />
        ))}
      </section>

      <MapPanel states={states} t={t} started={clock !== null} />
    </div>
  )
}

function MapPanel({
  states,
  t,
  started,
}: {
  states: Record<string, ObjectiveState>
  t: number
  started: boolean
}) {
  const map = useMapAsset()
  if (!map.data) return null

  const markerState = (def: ObjectiveDef): { className: string; label: string } => {
    if (!started) return { className: '', label: `at ${formatClock(def.firstSpawn)}` }
    const status = nextSpawn(def, states[def.id] ?? emptyState(), t)
    if (status.kind === 'waiting') {
      return { className: '', label: `in ${formatClock(status.spawnsAt - t)}` }
    }
    return { className: ' up', label: status.kind === 'up' ? 'up now' : 'on map' }
  }

  return (
    <section className="map-panel-section">
      <h3>The Map</h3>
      <div className="map-panel">
        <img src={map.data.images.minimap} alt="Deadlock minimap" loading="lazy" />
        {objectives.flatMap((def) =>
          (def.mapSpots ?? []).map((spot, i) => {
            const state = markerState(def)
            return (
              <span
                key={`${def.id}-${i}`}
                className={`map-marker${state.className}`}
                style={{ left: `${spot.left * 100}%`, top: `${spot.top * 100}%` }}
                title={`${def.name} — ${state.label}`}
              />
            )
          }),
        )}
      </div>
      <p className="map-caption">
        Brass diamonds are up; dim diamonds are waiting to spawn — hover any marker for its
        timer. Positions are approximate. Camps and breakables are spread through the jungles
        and are not marked.
      </p>
    </section>
  )
}

interface RowProps {
  def: ObjectiveDef
  state: ObjectiveState
  t: number
  started: boolean
  onEvent: () => void
  onUndo: () => void
}

function ObjectiveRow({ def, state, t, started, onEvent, onUndo }: RowProps) {
  const status = nextSpawn(def, state, t)
  const eventCount = state.events.length

  let statusContent: React.ReactNode
  if (!started) {
    statusContent = <span className="state-static">at {formatClock(def.firstSpawn)}</span>
  } else if (status.kind === 'waiting') {
    const remaining = status.spawnsAt - t
    const isFirst = eventCount === 0 && status.spawnsAt === def.firstSpawn
    const label = isFirst ? 'First spawn' : def.mode === 'interval' ? 'Next wave' : 'Respawns'
    statusContent = (
      <>
        <span className="label">{label}</span>
        <span className={`time${remaining <= SOON_THRESHOLD_SEC ? ' soon' : ''}`}>
          {formatClock(remaining)}
        </span>
      </>
    )
  } else if (status.kind === 'up') {
    statusContent = <span className="state state-up">Up now</span>
  } else {
    statusContent = <span className="state state-onmap">On map</span>
  }

  return (
    <div className="obj-row">
      <div>
        <span className="obj-name">{def.name}</span>
        {def.tier && <span className="obj-tier">{def.tier}</span>}
        {def.note && <div className="obj-note">{def.note}</div>}
      </div>
      <div className="obj-status">{statusContent}</div>
      <div className="obj-action">
        {eventCount > 0 && (
          <button className="btn-quiet" onClick={onUndo}>
            undo{def.mode === 'ladder' ? ` (×${eventCount})` : ''}
          </button>
        )}
        {def.eventLabel && (
          <button
            className="btn btn-small"
            onClick={onEvent}
            disabled={!started || status.kind !== 'up'}
          >
            {def.eventLabel}
          </button>
        )}
      </div>
    </div>
  )
}
