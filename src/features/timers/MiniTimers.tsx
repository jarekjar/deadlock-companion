import { useState } from 'react'
import { Link } from 'react-router-dom'
import timersData from '../../data/timers.json'
import { emptyState, formatClock, nextSpawn, parseGameTime, type ObjectiveDef } from './timerEngine'
import { useMatchClock } from './useMatchClock'
import './timers.css'

/** The objectives worth tracking mid-match without the full board. */
const KEY_IDS = new Set(['bridge-buffs', 'sinners', 'midboss', 'urn'])
const objectives = (timersData.objectives as ObjectiveDef[]).filter((d) => KEY_IDS.has(d.id))
const SOON_SEC = 30

/**
 * Compact spawn-timer strip. Shares the persisted match clock and objective
 * events with the Timers page, so state carries across both.
 */
export default function MiniTimers({ liveStartTime }: { liveStartTime?: number }) {
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
  const [syncInput, setSyncInput] = useState('')

  function syncToLive() {
    if (liveStartTime === undefined) return
    startMatch()
    resyncMatch(Math.max(0, Date.now() / 1000 - liveStartTime))
  }

  function handleSync(e: React.FormEvent) {
    e.preventDefault()
    const seconds = parseGameTime(syncInput)
    if (seconds === null) return
    if (!clock) startMatch()
    resyncMatch(seconds)
    setSyncInput('')
  }

  return (
    <section className="mini-timers">
      <div className="mini-head">
        <span className="caps mini-title">Spawn Timers</span>
        <span className="mini-clock">{formatClock(t)}</span>
        <span className="mini-actions">
          {!clock && liveStartTime === undefined && (
            <button className="btn btn-small" onClick={startMatch}>
              Start
            </button>
          )}
          {liveStartTime !== undefined && (
            <button className="btn btn-small btn-solid" onClick={syncToLive}>
              Sync to live clock
            </button>
          )}
          {clock?.running && (
            <button className="btn btn-small" onClick={pauseMatch}>
              Pause
            </button>
          )}
          {clock && !clock.running && (
            <button className="btn btn-small" onClick={resumeMatch}>
              Resume
            </button>
          )}
          <form className="mini-sync" onSubmit={handleSync}>
            <input
              value={syncInput}
              onChange={(e) => setSyncInput(e.target.value)}
              placeholder="12:34"
              aria-label="Sync to in-game time"
              inputMode="numeric"
            />
            <button className="btn btn-small" type="submit">
              Sync
            </button>
          </form>
          {clock && (
            <button
              className="btn btn-small"
              onClick={() => {
                if (window.confirm('Reset the match clock?')) resetMatch()
              }}
            >
              Reset
            </button>
          )}
          <Link className="btn-quiet" to="/timers">
            full timers &amp; alerts
          </Link>
        </span>
      </div>
      {clock && (
        <div className="mini-rows">
          {objectives.map((def) => {
            const state = states[def.id] ?? emptyState()
            const status = nextSpawn(def, state, t)
            return (
              <div key={def.id} className="mini-row">
                <span className="mini-name">{def.name}</span>
                <span className="mini-status">
                  {status.kind === 'waiting' ? (
                    <span
                      className={`mono${status.spawnsAt - t <= SOON_SEC ? ' soon' : ''}`}
                    >
                      {formatClock(status.spawnsAt - t)}
                    </span>
                  ) : (
                    <span className="state-up caps">Up now</span>
                  )}
                </span>
                <span className="mini-act">
                  {state.events.length > 0 && (
                    <button className="btn-quiet" onClick={() => undoEvent(def.id)}>
                      undo
                    </button>
                  )}
                  {def.eventLabel && (
                    <button
                      className="btn-quiet"
                      disabled={status.kind !== 'up'}
                      onClick={() => recordEvent(def.id)}
                    >
                      {def.eventLabel.toLowerCase()}
                    </button>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
