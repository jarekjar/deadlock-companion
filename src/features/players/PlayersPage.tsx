import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { parsePlayerInput } from '../../lib/steamid'
import { resolveVanity } from '../../lib/api'
import { usePlayerSearch, useRanks } from '../../lib/queries'
import { useFavorites } from '../../lib/favorites'
import RankBadge from '../../components/RankBadge'
import './players.css'

export default function PlayersPage() {
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const [resolving, setResolving] = useState(false)
  const search = usePlayerSearch(query)
  const { favorites, toggle } = useFavorites()
  const badges = useRanks([
    ...(search.data?.map((p) => p.account_id) ?? []),
    ...favorites.map((f) => f.accountId),
  ])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parsePlayerInput(input)
    if (!parsed) return
    if (parsed.kind === 'account') {
      navigate(`/players/${parsed.accountId}`)
      return
    }
    if (parsed.kind === 'vanity') {
      setResolving(true)
      const accountId = await resolveVanity(parsed.name)
      setResolving(false)
      if (accountId !== null) {
        navigate(`/players/${accountId}`)
        return
      }
      // vanity lookup failed; fall through to a name search
      setQuery(parsed.name)
      return
    }
    setQuery(parsed.query)
  }

  return (
    <>
      <form className="search-form" onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Steam profile URL, ID, or name"
          aria-label="Find a player"
        />
        <button className="btn btn-solid" type="submit" disabled={resolving}>
          {resolving ? 'Finding' : 'Find'}
        </button>
      </form>
      <p className="search-hint">
        Paste a steamcommunity.com profile link, a SteamID, or search by name.
      </p>

      {query && (
        <div className="player-list">
          <div className="player-list-title caps">Results</div>
          {search.isPending && <div className="page-note">Searching</div>}
          {search.isError && <div className="page-note error">Search failed</div>}
          {search.data?.length === 0 && <div className="page-note">No players found</div>}
          {search.data?.map((p) => (
            <Link key={p.account_id} className="player-row" to={`/players/${p.account_id}`}>
              <img src={p.avatarmedium} alt="" />
              <span className="persona">{p.personaname}</span>
              <RankBadge badge={badges.get(p.account_id)} />
              <span className="meta">
                {p.matches_played_last_30d > 0
                  ? `${p.matches_played_last_30d} matches in 30d`
                  : `#${p.account_id}`}
              </span>
            </Link>
          ))}
        </div>
      )}

      {favorites.length > 0 && (
        <div className="player-list">
          <div className="player-list-title caps">Favorites</div>
          {favorites.map((f) => (
            <Link key={f.accountId} className="player-row" to={`/players/${f.accountId}`}>
              <img src={f.avatar} alt="" />
              <span className="persona">{f.personaname}</span>
              <RankBadge badge={badges.get(f.accountId)} />
              <span className="meta">#{f.accountId}</span>
              <button
                className="btn-quiet remove"
                onClick={(e) => {
                  e.preventDefault()
                  toggle(f)
                }}
              >
                remove
              </button>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
