import { useEffect, useRef, useState } from 'react'
import { postMatchSalts, type MatchSalt } from '../../lib/api'
import { extractSalts, mergeSalts } from '../../lib/salts'
import { useSession } from '../../lib/session'
import { usePageMeta } from '../../lib/usePageMeta'
import '../players/players.css'
import './upload.css'

/** Cache blobs are small; anything huge is not a cached HTTP response. */
const MAX_FILE_BYTES = 64 * 1024 * 1024
const SUBMIT_CHUNK = 200

type Phase =
  | { kind: 'idle' }
  | { kind: 'scanning'; done: number; total: number; found: number }
  | { kind: 'submitting'; done: number; total: number }
  | { kind: 'done'; submitted: number; withMeta: number }
  | { kind: 'empty'; scanned: number }
  | { kind: 'error'; message: string }

export default function UploadPage() {
  usePageMeta(
    'Sync Matches — The Cursed Apple',
    'Push your recent Deadlock matches into the community database by scanning your Steam cache locally — nothing but match IDs and download keys leave your browser.',
  )
  const session = useSession()
  const inputRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })

  // webkitdirectory is not part of React's input typings
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.setAttribute('webkitdirectory', '')
      inputRef.current.setAttribute('directory', '')
    }
  }, [])

  async function scan(files: FileList) {
    const list = [...files].filter((f) => f.size > 0 && f.size <= MAX_FILE_BYTES)
    if (list.length === 0) {
      setPhase({ kind: 'empty', scanned: 0 })
      return
    }
    const decoder = new TextDecoder('latin1')
    const all: MatchSalt[] = []
    setPhase({ kind: 'scanning', done: 0, total: list.length, found: 0 })
    for (let i = 0; i < list.length; i++) {
      try {
        const buffer = await list[i].arrayBuffer()
        all.push(...extractSalts(decoder.decode(buffer)))
      } catch {
        // unreadable file: skip it
      }
      if (i % 20 === 19 || i === list.length - 1) {
        const found = mergeSalts(all).length
        setPhase({ kind: 'scanning', done: i + 1, total: list.length, found })
        await new Promise((r) => setTimeout(r, 0))
      }
    }

    const merged = mergeSalts(all).map((salt) => ({
      ...salt,
      username: session.data ? String(session.data) : null,
    }))
    if (merged.length === 0) {
      setPhase({ kind: 'empty', scanned: list.length })
      return
    }

    try {
      setPhase({ kind: 'submitting', done: 0, total: merged.length })
      for (let i = 0; i < merged.length; i += SUBMIT_CHUNK) {
        await postMatchSalts(merged.slice(i, i + SUBMIT_CHUNK))
        setPhase({
          kind: 'submitting',
          done: Math.min(i + SUBMIT_CHUNK, merged.length),
          total: merged.length,
        })
      }
      setPhase({
        kind: 'done',
        submitted: merged.length,
        withMeta: merged.filter((s) => s.metadata_salt != null).length,
      })
    } catch (error) {
      setPhase({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Submitting failed',
      })
    }
  }

  const busy = phase.kind === 'scanning' || phase.kind === 'submitting'

  return (
    <div className="upload-page">
      <h2>Sync Your Matches</h2>
      <p className="upload-lede">
        The community Deadlock API only knows about matches somebody synced — high-profile games
        get picked up automatically from the spectate system, but most lobbies don't. If matches
        are missing from your profile, this fixes it.
      </p>

      <section className="data-section">
        <h3>How It Works</h3>
        <ol className="upload-steps">
          <li>
            When you play (or watch a replay), the Deadlock client downloads match files, and
            Steam keeps those downloads in a local cache folder.
          </li>
          <li>
            Point this page at that folder. Your browser scans it <strong>locally</strong> for
            Deadlock match references — files are never uploaded.
          </li>
          <li>
            Only the match IDs and their download keys ("salts") are sent to the community API,
            which then fetches those matches from Valve and adds them to the database.
          </li>
        </ol>
        <p className="grid-note left-note">
          A few minutes after syncing, the matches show up in profiles, match pages, and the
          stats everywhere — for all twelve players in them, on every site built on the community
          API.
        </p>
      </section>

      <section className="data-section">
        <h3>Pick Your Steam Cache Folder</h3>
        <p className="upload-path">
          The folder is <code>Steam\appcache\httpcache</code> inside your Steam install —
          usually:
        </p>
        <code className="upload-code">C:\Program Files (x86)\Steam\appcache\httpcache</code>
        <div className="upload-actions">
          <button
            className="btn upload-btn"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? 'Working…' : 'Choose folder and scan'}
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) void scan(e.target.files)
              e.target.value = ''
            }}
          />
        </div>

        {phase.kind === 'scanning' && (
          <p className="upload-status mono">
            Scanning {phase.done.toLocaleString()} / {phase.total.toLocaleString()} files ·{' '}
            {phase.found.toLocaleString()} matches found
          </p>
        )}
        {phase.kind === 'submitting' && (
          <p className="upload-status mono">
            Submitting {phase.done.toLocaleString()} / {phase.total.toLocaleString()} matches…
          </p>
        )}
        {phase.kind === 'done' && (
          <p className="upload-status upload-ok">
            Synced {phase.submitted.toLocaleString()} matches ({phase.withMeta.toLocaleString()}{' '}
            with full match data). Give the API a few minutes to fetch them, then check your
            profile.
          </p>
        )}
        {phase.kind === 'empty' && (
          <p className="upload-status">
            No Deadlock match references found
            {phase.scanned > 0 ? ` in ${phase.scanned.toLocaleString()} files` : ''}. Make sure
            you picked <code>appcache\httpcache</code> on the machine you play on — and note the
            cache only holds fairly recent downloads.
          </p>
        )}
        {phase.kind === 'error' && <p className="upload-status error">{phase.message}</p>}
      </section>

      <section className="data-section">
        <h3>Keep It Synced Automatically</h3>
        <p className="upload-path">
          The community runs a tiny open-source background tool that watches the same cache and
          submits new matches as you play —{' '}
          <a
            href="https://github.com/deadlock-api/deadlock-api-ingest"
            target="_blank"
            rel="noreferrer"
          >
            deadlock-api-ingest on GitHub
          </a>
          . Install it once and your matches (and your teammates') stay tracked without ever
          visiting this page.
        </p>
      </section>

      <section className="data-section">
        <h3>Privacy</h3>
        <p className="upload-path">
          Everything is scanned in your browser. The only thing transmitted is a list of match
          IDs with their download keys — no files, no credentials, no personal data. The keys
          only allow fetching match data that Valve already serves to any client.
        </p>
      </section>
    </div>
  )
}
