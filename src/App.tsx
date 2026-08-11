import { Navigate, Route, Routes } from 'react-router-dom'
import Header from './components/Header'
import TimersPage from './features/timers/TimersPage'
import CheatSheetPage from './features/timers/CheatSheetPage'
import timersData from './data/timers.json'

export default function App() {
  return (
    <div className="shell">
      <Header />
      <main className="shell-main">
        <Routes>
          <Route path="/" element={<Navigate to="/timers" replace />} />
          <Route path="/timers" element={<TimersPage />} />
          <Route path="/cheat-sheet" element={<CheatSheetPage />} />
          <Route path="*" element={<Navigate to="/timers" replace />} />
        </Routes>
      </main>
      <footer className="site-footer">
        Timings as of patch {timersData.patch} · community data ·{' '}
        <a href="https://github.com/jarekjar/deadlock-companion">source</a>
      </footer>
    </div>
  )
}
