import { lazy, Suspense, useEffect } from 'react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Header from './shared/Header'
import CommandPalette from './shared/CommandPalette'
import HomePage from './features/home/HomePage'
import timersData from './data/timers.json'
import { useHeroes } from './lib/queries'
import defaultBg from './assets/default-bg.webp'

// Route-level code splitting: the home page stays eager for instant first
// paint; everything else loads on navigation.
const TimersPage = lazy(() => import('./features/timers/TimersPage'))
const CheatSheetPage = lazy(() => import('./features/timers/CheatSheetPage'))
const PlayersPage = lazy(() => import('./features/players/PlayersPage'))
const PlayerProfilePage = lazy(() => import('./features/players/PlayerProfilePage'))
const MatchPage = lazy(() => import('./features/matches/MatchPage'))
const HeroesPage = lazy(() => import('./features/heroes/HeroesPage'))
const HeroPage = lazy(() => import('./features/heroes/HeroPage'))
const MatchupsPage = lazy(() => import('./features/heroes/MatchupsPage'))
const ItemsPage = lazy(() => import('./features/items/ItemsPage'))
const ItemPage = lazy(() => import('./features/items/ItemPage'))
const LeaderboardPage = lazy(() => import('./features/leaderboard/LeaderboardPage'))
const LiveMatchesPage = lazy(() => import('./features/live/LiveMatchesPage'))
const LiveMatchPage = lazy(() => import('./features/live/LiveMatchPage'))
const MyMatchPage = lazy(() => import('./features/live/MyMatchPage'))
const PrivacyPage = lazy(() => import('./features/privacy/PrivacyPage'))

export default function App() {
  const location = useLocation()
  const heroes = useHeroes()

  // new page, top of page — SPAs don't reset scroll on their own
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])
  // hero detail pages swap the ambient poster for that hero's own art
  const heroMatch = /^\/heroes\/(\d+)/.exec(location.pathname)
  const heroBg = heroMatch
    ? heroes.data?.get(Number(heroMatch[1]))?.images.background_image_webp
    : undefined
  return (
    <div className="shell">
      <div
        className={`app-bg${heroBg ? ' strong' : ''}`}
        style={{ backgroundImage: `url(${heroBg ?? defaultBg})` }}
        aria-hidden
      />
      <Header />
      <CommandPalette />
      <main key={location.pathname} className="shell-main">
        <Suspense fallback={<div className="page-note">Loading</div>}>
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
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/live" element={<LiveMatchesPage />} />
            <Route path="/live/:matchId" element={<LiveMatchPage />} />
            <Route path="/my-match" element={<MyMatchPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      <footer className="site-footer">
        Built by <a href="https://github.com/jarekjar">Jared Kjar</a> · timings as of patch{' '}
        {timersData.patch} · stats from the community Deadlock API ·{' '}
        <a href="https://github.com/jarekjar/deadlock-companion">source</a> ·{' '}
        <Link to="/privacy">privacy</Link>
      </footer>
    </div>
  )
}
