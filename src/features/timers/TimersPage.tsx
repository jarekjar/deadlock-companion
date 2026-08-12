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
import { CheatSheetContent } from './CheatSheetPage'
import { useMapAsset } from '../../lib/queries'
import { useSession } from '../../lib/session'
import { fetchActiveMatchForPlayer } from '../../lib/api'
import { usePageMeta } from '../../lib/usePageMeta'
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
  usePageMeta(
    'Deadlock Spawn Timers & Objective Map — The Cursed Apple',
    'Live spawn countdowns for camps, Sinner’s Sacrifice, bridge buffs, the Mid-Boss ladder, and the Soul Urn — with spawn alerts, an objective map, and one-click sync to your live Deadlock match.',
  )
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
  const session = useSession()
  const [settings, setSettings] = useState<AlertSettings>(loadSettings)
  const [syncInput, setSyncInput] = useState('')
  const [focusId, setFocusId] = useState<string | null>(null)
  const [liveSync, setLiveSync] = useState<{ busy: boolean; message: string | null }>({
    busy: false,
    message: null,
  })
  const [showCheatSheet, setShowCheatSheet] = useState(false)
  const firedAlerts = useRef(new Set<string>())

  useEffect(() => {
    if (!showCheatSheet) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowCheatSheet(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showCheatSheet])

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

  async function syncMyMatch() {
    if (!session.data) {
      setLiveSync({
        busy: false,
        message: 'Sign in through Steam first — this finds your live match automatically.',
      })
      return
    }
    setLiveSync({ busy: true, message: null })
    try {
      const match = await fetchActiveMatchForPlayer(session.data)
      if (!match) {
        setLiveSync({
          busy: false,
          message:
            'No live match found for your account. You may not be in a match, or it is not in the top-200 watch list.',
        })
        return
      }
      startMatch()
      resyncMatch(Math.max(0, Date.now() / 1000 - match.start_time))
      setLiveSync({ busy: false, message: `Synced to your live match #${match.match_id}.` })
    } catch {
      setLiveSync({ busy: false, message: 'Could not check for a live match right now.' })
    }
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
    <div className="timers-layout">
      <div className="timers-main">
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
          <button className="btn" onClick={() => void syncMyMatch()} disabled={liveSync.busy}>
            {liveSync.busy ? 'Searching' : 'Sync My Match'}
          </button>
          <button className="btn" onClick={() => setShowCheatSheet(true)}>
            Cheat Sheet
          </button>
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
        {liveSync.message && <p className="clock-hint">{liveSync.message}</p>}
        {!clock && !liveSync.message && (
          <p className="clock-hint">
            Press Start when the in-game clock hits 0:00, type the current game time and press
            Sync — or use Sync My Match to find your live game (Steam sign-in required).
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
            focused={focusId === def.id}
            onFocus={setFocusId}
            onEvent={() => recordEvent(def.id)}
            onUndo={() => undoEvent(def.id)}
          />
        ))}
      </section>
      </div>

      <aside className="timers-side">
        <MapPanel
          states={states}
          t={t}
          started={clock !== null}
          focusId={focusId}
          onFocus={setFocusId}
        />
      </aside>

      {showCheatSheet && (
        <div className="modal-overlay" onClick={() => setShowCheatSheet(false)}>
          <div
            className="modal-panel"
            role="dialog"
            aria-label="Timing cheat sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <span className="caps modal-title">Cheat Sheet</span>
              <button className="btn-quiet" onClick={() => setShowCheatSheet(false)}>
                close
              </button>
            </div>
            <CheatSheetContent />
          </div>
        </div>
      )}
    </div>
  )
}

function MapPanel({
  states,
  t,
  started,
  focusId,
  onFocus,
}: {
  states: Record<string, ObjectiveState>
  t: number
  started: boolean
  focusId: string | null
  onFocus: (id: string | null) => void
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
        {objectives.flatMap((def) => {
          const spots = def.mapSpots ?? []
          const state = markerState(def)
          const focused = focusId === def.id
          return spots.map((spot, i) => (
            <span
              key={`${def.id}-${i}`}
              className={`map-marker${state.className}${focused ? ' focus' : ''}`}
              style={{ left: `${spot.left * 100}%`, top: `${spot.top * 100}%` }}
              onMouseEnter={() => onFocus(def.id)}
              onMouseLeave={() => onFocus(null)}
            />
          ))
        })}
        {(() => {
          const def = objectives.find((d) => d.id === focusId)
          const spot = def?.mapSpots?.[0]
          if (!def || !spot) return null
          const state = markerState(def)
          return (
            <span
              className="map-label"
              style={{ left: `${spot.left * 100}%`, top: `${spot.top * 100}%` }}
            >
              {def.name} · {state.label}
            </span>
          )
        })()}
      </div>
      <p className="map-caption">
        Brass diamonds are up; dim diamonds are waiting to spawn. Hover a timer row to see its
        spots on the map, or hover a marker for its countdown. Positions are approximate; camps
        and breakables are spread through the jungles and are not marked.
      </p>
    </section>
  )
}

interface RowProps {
  def: ObjectiveDef
  state: ObjectiveState
  t: number
  started: boolean
  focused: boolean
  onFocus: (id: string | null) => void
  onEvent: () => void
  onUndo: () => void
}

function ObjectiveRow({ def, state, t, started, focused, onFocus, onEvent, onUndo }: RowProps) {
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
    <div
      className={`obj-row${focused && def.mapSpots ? ' focus' : ''}`}
      onMouseEnter={() => onFocus(def.id)}
      onMouseLeave={() => onFocus(null)}
    >
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
