import { NavLink } from 'react-router-dom'

export default function Header() {
  return (
    <header className="site-header">
      <h1 className="wordmark">The Cursed Apple</h1>
      <p className="tagline">A Deadlock Companion</p>
      <nav className="site-nav">
        <NavLink to="/timers">Timers</NavLink>
        <NavLink to="/cheat-sheet">Cheat Sheet</NavLink>
      </nav>
    </header>
  )
}
