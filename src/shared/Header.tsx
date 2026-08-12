import { Link, NavLink } from 'react-router-dom'
import { isNative } from '../lib/native'
import { useSession, useSignOut } from '../lib/session'
import { OPEN_PALETTE_EVENT } from './CommandPalette'

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
        <NavLink to="/players" end>
          Players
        </NavLink>
        <NavLink to="/heroes" end>
          Heroes
        </NavLink>
        <NavLink to="/items" end>
          Items
        </NavLink>
        <NavLink to="/matchups">Matchups</NavLink>
        <NavLink to="/live">Live</NavLink>
        <NavLink to="/leaderboard">Ranks</NavLink>
        <NavLink to="/my-match">My Match</NavLink>
        {session.data ? (
          <>
            <NavLink to={`/players/${session.data}`}>My Profile</NavLink>
            <button className="nav-action" onClick={() => signOut.mutate()}>
              Sign Out
            </button>
          </>
        ) : isNative ? null : (
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
