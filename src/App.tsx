import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
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
import MyMatchPage from './features/live/MyMatchPage'
import HomePage from './features/home/HomePage'
import ItemsPage from './features/items/ItemsPage'
import ItemPage from './features/items/ItemPage'
import timersData from './data/timers.json'
import { useHeroes } from './lib/queries'

const DEFAULT_BG =
  'https://assets-bucket.deadlock-api.com/assets-api-res/images/heroes/backgrounds/infernus_bg.webp'

export default function App() {
  const location = useLocation()
  const heroes = useHeroes()
  // hero detail pages swap the ambient poster for that hero's own art
  const heroMatch = /^\/heroes\/(\d+)/.exec(location.pathname)
  const heroBg = heroMatch
    ? heroes.data?.get(Number(heroMatch[1]))?.images.background_image_webp
    : undefined
  return (
    <div className="shell">
      <div
        className={`app-bg${heroBg ? ' strong' : ''}`}
        style={{ backgroundImage: `url(${heroBg ?? DEFAULT_BG})` }}
        aria-hidden
      />
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
          <Route path="/items" element={<ItemsPage />} />
          <Route path="/items/:itemId" element={<ItemPage />} />
          <Route path="/live" element={<LiveMatchesPage />} />
          <Route path="/live/:matchId" element={<LiveMatchPage />} />
          <Route path="/my-match" element={<MyMatchPage />} />
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
