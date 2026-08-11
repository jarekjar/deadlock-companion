import { NavLink } from 'react-router-dom'
import { useSession, useSignOut } from '../lib/session'

export default function Header() {
  const session = useSession()
  const signOut = useSignOut()

  return (
    <header className="site-header">
      <h1 className="wordmark">The Cursed Apple</h1>
      <p className="tagline">A Deadlock Companion</p>
      <nav className="site-nav">
        <NavLink to="/timers">Timers</NavLink>
        <NavLink to="/cheat-sheet">Cheat Sheet</NavLink>
        <NavLink to="/players" end>
          Players
        </NavLink>
        <NavLink to="/heroes" end>
          Heroes
        </NavLink>
        <NavLink to="/matchups">Matchups</NavLink>
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
      </nav>
    </header>
  )
}
