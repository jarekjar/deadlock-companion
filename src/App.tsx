import { Navigate, Route, Routes } from 'react-router-dom'
import Header from './components/Header'
import TimersPage from './features/timers/TimersPage'
import CheatSheetPage from './features/timers/CheatSheetPage'
import PlayersPage from './features/players/PlayersPage'
import PlayerProfilePage from './features/players/PlayerProfilePage'
import MatchPage from './features/matches/MatchPage'
import HeroesPage from './features/heroes/HeroesPage'
import HeroPage from './features/heroes/HeroPage'
import MatchupsPage from './features/heroes/MatchupsPage'
import LiveMatchesPage from './features/live/LiveMatchesPage'
import LiveMatchPage from './features/live/LiveMatchPage'
import HomePage from './features/home/HomePage'
import timersData from './data/timers.json'

export default function App() {
  return (
    <div className="shell">
      <Header />
      <main className="shell-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/timers" element={<TimersPage />} />
          <Route path="/cheat-sheet" element={<CheatSheetPage />} />
          <Route path="/players" element={<PlayersPage />} />
          <Route path="/players/:accountId" element={<PlayerProfilePage />} />
          <Route path="/matches/:matchId" element={<MatchPage />} />
          <Route path="/heroes" element={<HeroesPage />} />
          <Route path="/heroes/:heroId" element={<HeroPage />} />
          <Route path="/matchups" element={<MatchupsPage />} />
          <Route path="/matchups/:heroId" element={<MatchupsPage />} />
          <Route path="/live" element={<LiveMatchesPage />} />
          <Route path="/live/:matchId" element={<LiveMatchPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="site-footer">
        Built by <a href="https://github.com/jarekjar">Jared Kjar</a> · timings as of patch{' '}
        {timersData.patch} · stats from the community Deadlock API ·{' '}
        <a href="https://github.com/jarekjar/deadlock-companion">source</a>
      </footer>
    </div>
  )
}
