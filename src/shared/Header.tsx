import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useSession, useSignOut } from '../lib/session'
import { OPEN_PALETTE_EVENT } from './CommandPalette'

/**
 * Dropdown group in the nav. Hover opens it on desktop; click/tap only ever
 * opens (never toggles closed, so it can't fight the hover-open). It closes on
 * pointer leave, a press outside, Escape, or navigation.
 */
function NavGroup({
  label,
  paths,
  children,
}: {
  label: string
  /** Route prefixes that mark this group active. */
  paths: string[]
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const groupRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    setOpen(false)
  }, [location])

  useEffect(() => {
    if (!open) return
    const onPress = (e: PointerEvent) => {
      if (!groupRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPress)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPress)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const active = paths.some(
    (p) => location.pathname === p || location.pathname.startsWith(`${p}/`),
  )

  return (
    <span
      ref={groupRef}
      className="nav-group"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        className={`nav-action${active ? ' active' : ''}`}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        {label} <span className="nav-caret">▾</span>
      </button>
      {open && <span className="nav-menu">{children}</span>}
    </span>
  )
}

export default function Header() {
  const session = useSession()
  const signOut = useSignOut()

  return (
    <header className="site-header">
      <h1 className="wordmark">
        <Link to="/">The Cursed Apple</Link>
      </h1>
      <p className="tagline">A Deadlock Companion</p>
      <nav className="site-nav">
        <NavLink to="/timers">Timers</NavLink>
        <NavLink to="/my-match">My Match</NavLink>
        <NavLink to="/draft">Draft</NavLink>
        <NavGroup label="Heroes" paths={['/heroes', '/matchups', '/builds', '/patch-report']}>
          <NavLink to="/heroes" end>
            All Heroes
          </NavLink>
          <NavLink to="/matchups">Matchups</NavLink>
          <NavLink to="/builds">Build Library</NavLink>
          <NavLink to="/patch-report">Patch Report</NavLink>
        </NavGroup>
        <NavLink to="/items">Items</NavLink>
        <NavGroup label="Players" paths={['/players', '/live', '/leaderboard', '/records', '/upload']}>
          <NavLink to="/players" end>
            Find Players
          </NavLink>
          <NavLink to="/live">Live Matches</NavLink>
          <NavLink to="/leaderboard">Ranks</NavLink>
          <NavLink to="/records">Records</NavLink>
          <NavLink to="/upload">Sync Matches</NavLink>
        </NavGroup>
        {session.data ? (
          <>
            <NavLink to={`/players/${session.data}`}>My Profile</NavLink>
            <button className="nav-action" onClick={() => signOut.mutate()}>
              Sign Out
            </button>
          </>
        ) : (
          <a href="/api/auth/login" rel="nofollow">
            Steam Sign-In
          </a>
        )}
        <button
          className="nav-action"
          title="Quick search (Ctrl+K)"
          onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT))}
        >
          Search
        </button>
      </nav>
    </header>
  )
}
