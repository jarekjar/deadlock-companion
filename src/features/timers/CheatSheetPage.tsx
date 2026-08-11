import timersData from '../../data/timers.json'
import { formatClock, type ObjectiveDef } from './timerEngine'
import './timers.css'

const objectives = timersData.objectives as ObjectiveDef[]

function respawnText(def: ObjectiveDef): string {
  switch (def.mode) {
    case 'interval':
      return `Every ${formatClock(def.interval ?? 300)}`
    case 'event':
      return `${formatClock(def.respawn ?? 300)} after ${def.eventLabel?.toLowerCase() ?? 'taken'}`
    case 'ladder':
      return `${(def.ladder ?? []).map(formatClock).join(' / ')} per kill`
    case 'info':
      return def.note ?? 'On clear'
  }
}

export default function CheatSheetPage() {
  return (
    <div className="narrow">
      <table className="cheat-table">
        <thead>
          <tr>
            <th>Objective</th>
            <th>First spawn</th>
            <th>Respawn</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Trooper waves</td>
            <td className="mono">0:30</td>
            <td className="note">Every 30s; every 20s after 35:00</td>
          </tr>
          {objectives.map((def) => (
            <tr key={def.id}>
              <td>
                {def.name}
                {def.tier ? ` (${def.tier})` : ''}
              </td>
              <td className="mono">{formatClock(def.firstSpawn)}</td>
              <td className="note">{respawnText(def)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="cheat-section">
        <h2>Worth knowing</h2>
        <ul>
          <li>Melee troopers join the waves at 5:00.</li>
          <li>The Soul Urn's bounty scales with game time — past 25:00 it is worth 3500+ souls.</li>
          <li>Mid-Boss drops the Rejuvenator; the buff grants the team extra lives for 4:00.</li>
          <li>Breakable boxes scale from ~25 to 150+ souls as the match progresses; the tunnels have the highest density.</li>
          <li>Golden Statues drop stronger (tier 3) buffs after 30:00.</li>
        </ul>
      </section>

      <p className="cheat-sources">
        Timings current as of patch {timersData.patch}, last verified {timersData.verifiedOn}.
        Sources:{' '}
        {timersData.sources.map((url, i) => (
          <span key={url}>
            {i > 0 && ' · '}
            <a href={url} target="_blank" rel="noreferrer">
              {new URL(url).hostname}
            </a>
          </span>
        ))}
      </p>
    </div>
  )
}
