import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './styles/global.css'

// A deploy replaces the hashed chunk files, so a tab loaded before it can ask
// for a chunk that no longer exists when it navigates to a lazy route. Reload
// once to pick up the new build; if that didn't help (really offline), let the
// error reach the boundary instead of reload-looping.
window.addEventListener('vite:preloadError', (event) => {
  const RELOADED_AT = 'dc.chunkReload.v1'
  try {
    const last = Number(sessionStorage.getItem(RELOADED_AT) ?? 0)
    if (Date.now() - last < 30_000) return
    sessionStorage.setItem(RELOADED_AT, String(Date.now()))
  } catch {
    // no sessionStorage means no loop guard — fall through to the boundary
    return
  }
  event.preventDefault()
  window.location.reload()
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
