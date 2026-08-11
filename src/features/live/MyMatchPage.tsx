import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { type ActiveMatch, type HeroAsset } from '../../lib/api'
import {
  useHeroAnalytics,
  useHeroCounters,
  useHeroes,
  useLiveMatchForPlayer,
  useRanks,
  useSteamProfilesBatch,
} from '../../lib/queries'
import { useSession } from '../../lib/session'
import { winRateClass } from '../../lib/winrate'
import RankBadge from '../../components/RankBadge'
import { CounterItems } from '../heroes/MatchupsPage'
import { formatClock } from '../timers/timerEngine'
import { syncClockFromLive } from '../timers/useMatchClock'
import '../players/players.css'
import '../heroes/heroes.css'
import './live.css'

const LANES = ['Left', 'Mid', 'Right', 'Flex'] as const
const PREP_KEY = 'dc.prepBoard.v1'
const MAX_ENEMIES = 6

interface PrepEnemy {
  heroId: number
  lane: string
}

interface PrepState {
  myHeroId: number | null
  enemies: PrepEnemy[]
}

function loadPrep(): PrepState {
  try {
    const raw = localStorage.getItem(PREP_KEY)
    if (raw) return JSON.parse(raw) as PrepState
  } catch {
    // fall through to an empty board
  }
  return { myHeroId: null, enemies: [] }
}

export default function MyMatchPage() {
  const navigate = useNavigate()
  const heroes = useHeroes()
  const analytics = useHeroAnalytics()
  const counters = useHeroCounters()
  const session = useSession()
  const live = useLiveMatchForPlayer(session.data ?? 0)

  const [prep, setPrep] = useState<PrepState>(loadPrep)
  const [liveCtx, setLiveCtx] = useState<{ match: ActiveMatch; myAccountId: number } | null>(null)
  const [picker, setPicker] = useState<'mine' | 'enemy' | null>(null)
  const [openCounters, setOpenCounters] = useState<number | null>(null)
  const [nowSec, setNowSec] = useState(() => Date.now() / 1000)

  useEffect(() => {
    try {
      localStorage.setItem(PREP_KEY, JSON.stringify(prep))
    } catch {
      // storage unavailable; board just won't persist
    }
  }, [prep])

  useEffect(() => {
    if (!liveCtx) return
    const id = window.setInterval(() => setNowSec(Date.now() / 1000), 1000)
    return () => window.clearInterval(id)
  }, [liveCtx])

  const myHero = prep.myHeroId ? heroes.data?.get(prep.myHeroId) : undefined

  const heroWinRates = useMemo(() => {
    const map = new Map<number, number>()
    for (const s of analytics.data ?? []) {
      if (s.matches > 0) map.set(s.hero_id, (s.wins / s.matches) * 100)
    }
    return map
  }, [analytics.data])

  const matchupWinRates = useMemo(() => {
    const map = new Map<number, number>()
    if (!prep.myHeroId) return map
    for (const c of counters.data ?? []) {
      if (c.hero_id === prep.myHeroId && c.matches_played > 0) {
        map.set(c.enemy_hero_id, (c.wins / c.matches_played) * 100)
      }
    }
    return map
  }, [counters.data, prep.myHeroId])

  /** heroId -> enemy account id, when the board was filled from a live match */
  const liveEnemyByHero = useMemo(() => {
    if (!liveCtx) return new Map<number, number>()
    const me = liveCtx.match.players.find((p) => p.account_id === liveCtx.myAccountId)
    const myTeam = me?.team ?? 0
    return new Map(
      liveCtx.match.players
        .filter((p) => p.team !== myTeam)
        .map((p) => [p.hero_id, p.account_id] as const),
    )
  }, [liveCtx])
  const liveAccountIds = useMemo(() => [...liveEnemyByHero.values()], [liveEnemyByHero])
  const profiles = useSteamProfilesBatch(liveAccountIds)
  const badges = useRanks(liveAccountIds)

  function fillFromLive(match: ActiveMatch, accountId: number) {
    const me = match.players.find((p) => p.account_id === accountId)
    if (!me) return
    setPrep({
      myHeroId: me.hero_id,
      enemies: match.players
        .filter((p) => p.team !== me.team)
        .map((p) => ({ heroId: p.hero_id, lane: '' })),
    })
    setLiveCtx({ match, myAccountId: accountId })
    setOpenCounters(null)
  }

  function pickHero(heroId: number) {
    if (picker === 'mine') {
      setPrep((p) => ({ ...p, myHeroId: heroId }))
    } else if (picker === 'enemy') {
      setPrep((p) =>
        p.enemies.length >= MAX_ENEMIES || p.enemies.some((e) => e.heroId === heroId)
          ? p
          : { ...p, enemies: [...p.enemies, { heroId, lane: '' }] },
      )
    }
    setPicker(null)
  }

  const gameTime = liveCtx ? Math.max(0, nowSec - liveCtx.match.start_time) : 0
  const showLiveBanner =
    session.data && live.data && liveCtx?.match.match_id !== live.data.match_id

  return (
    <>
      <p className="grid-note prep-intro">
        Build your match board: pick your hero and the enemy team to see matchup win rates,
        counter items, and lane tracking — for every match, no sign-in needed.
      </p>

      {showLiveBanner && live.data && session.data && (
        <div className="live-banner">
          <span className="live-chip">Live</span>
          <span className="banner-text">You appear to be in match #{live.data.match_id}.</span>
          <button className="btn btn-solid" onClick={() => fillFromLive(live.data!, session.data!)}>
            Fill board from my live match
          </button>
        </div>
      )}
      {!session.data && (
        <p className="grid-note">
          Tip: sign in through Steam and this page can fill itself from your live match.
        </p>
      )}
      {session.data && live.isFetched && !live.data && !liveCtx && (
        <p className="grid-note">
          No live match detected for your account right now (only the top ~200 spectate-able
          games are visible) — build the board manually below.
        </p>
      )}

      {liveCtx && (
        <div className="live-head prep-live-head">
          <div className="clock">{formatClock(gameTime)}</div>
          <div className="meta">
            Live match #{liveCtx.match.match_id}
            {liveCtx.match.match_mode_parsed ? ` · ${liveCtx.match.match_mode_parsed}` : ''}
          </div>
          <div className="actions">
            <button
              className="btn btn-solid"
              onClick={() => {
                syncClockFromLive(Math.max(0, Date.now() / 1000 - liveCtx.match.start_time))
                navigate('/timers')
              }}
            >
              Sync spawn timers
            </button>{' '}
            <Link className="btn" to={`/live/${liveCtx.match.match_id}`}>
              Live view
            </Link>
          </div>
        </div>
      )}

      <section className="team-section">
        <div className="team-title" style={{ borderLeftColor: 'var(--brass)' }}>
          <h3>Your hero</h3>
        </div>
        {myHero ? (
          <div className="prep-myhero">
            <img src={myHero.images.icon_hero_card_webp} alt="" />
            <span className="enemy-who">
              <Link className="enemy-name" to={`/heroes/${myHero.id}`}>
                {myHero.name}
              </Link>
              <span className="hl-sub">
                {heroWinRates.get(myHero.id) !== undefined
                  ? `${heroWinRates.get(myHero.id)!.toFixed(1)}% win rate, last 30 days`
                  : ''}
              </span>
            </span>
            <button className="btn" onClick={() => setPicker('mine')}>
              Change
            </button>
          </div>
        ) : (
          <div className="prep-empty">
            <button className="btn btn-solid" onClick={() => setPicker('mine')}>
              Pick your hero
            </button>
          </div>
        )}
      </section>

      <section className="team-section">
        <div className="team-title" style={{ borderLeftColor: '#a33c2e' }}>
          <h3>Enemy team</h3>
          <span className="team-note">
            {prep.enemies.length}/{MAX_ENEMIES} · counter items are for{' '}
            {myHero?.name ?? 'your hero'}
          </span>
        </div>
        <div className="enemy-list">
          {prep.enemies.map((enemy, index) => {
            const hero = heroes.data?.get(enemy.heroId)
            if (!hero) return null
            const heroWr = heroWinRates.get(enemy.heroId)
            const vsWr = matchupWinRates.get(enemy.heroId)
            const liveAccountId = liveEnemyByHero.get(enemy.heroId)
            const persona = liveAccountId
              ? profiles.data?.get(liveAccountId)?.personaname
              : undefined
            const isOpen = openCounters === enemy.heroId
            return (
              <div key={enemy.heroId} className="enemy-block">
                <div className="enemy-row">
                  <img
                    className="enemy-hero"
                    src={hero.images.icon_hero_card_webp}
                    alt=""
                    loading="lazy"
                  />
                  <span className="enemy-who">
                    <Link className="enemy-name" to={`/heroes/${hero.id}`}>
                      {hero.name}
                    </Link>
                    {liveAccountId ? (
                      <span className="persona-cell">
                        <Link className="player-link dim-link" to={`/players/${liveAccountId}`}>
                          {persona ?? `#${liveAccountId}`}
                        </Link>
                        <RankBadge badge={badges.get(liveAccountId)} />
                      </span>
                    ) : (
                      <button className="btn-quiet" onClick={() => {
                        setPrep((p) => ({
                          ...p,
                          enemies: p.enemies.filter((_, i) => i !== index),
                        }))
                        if (isOpen) setOpenCounters(null)
                      }}>
                        remove
                      </button>
                    )}
                  </span>
                  <span className="enemy-stat">
                    <span className="stat-label">Hero WR</span>
                    <span className={`mono ${heroWr !== undefined ? winRateClass(heroWr) : ''}`}>
                      {heroWr !== undefined ? `${heroWr.toFixed(1)}%` : '—'}
                    </span>
                  </span>
                  <span className="enemy-stat">
                    <span className="stat-label">{myHero?.name ?? 'You'} vs</span>
                    <span className={`mono ${vsWr !== undefined ? winRateClass(vsWr) : ''}`}>
                      {vsWr !== undefined ? `${vsWr.toFixed(1)}%` : '—'}
                    </span>
                  </span>
                  <span className="enemy-stat">
                    <span className="stat-label">Lane</span>
                    <select
                      value={enemy.lane}
                      onChange={(e) =>
                        setPrep((p) => ({
                          ...p,
                          enemies: p.enemies.map((en, i) =>
                            i === index ? { ...en, lane: e.target.value } : en,
                          ),
                        }))
                      }
                      aria-label="Assign lane"
                    >
                      <option value="">—</option>
                      {LANES.map((lane) => (
                        <option key={lane} value={lane}>
                          {lane}
                        </option>
                      ))}
                    </select>
                  </span>
                  <button
                    className="btn btn-small"
                    disabled={!myHero}
                    title={myHero ? undefined : 'Pick your hero first'}
                    onClick={() => setOpenCounters(isOpen ? null : enemy.heroId)}
                  >
                    {isOpen ? 'Hide counters' : 'Counters'}
                  </button>
                </div>
                {isOpen && myHero && (
                  <div className="enemy-counters">
                    <CounterItems heroId={myHero.id} enemy={hero} heroName={myHero.name} />
                  </div>
                )}
              </div>
            )
          })}
          {prep.enemies.length < MAX_ENEMIES && (
            <div className="enemy-add">
              <button className="btn" onClick={() => setPicker('enemy')}>
                Add enemy hero
              </button>
            </div>
          )}
        </div>
      </section>

      {(prep.myHeroId !== null || prep.enemies.length > 0) && (
        <p className="prep-clear">
          <button
            className="btn-quiet"
            onClick={() => {
              setPrep({ myHeroId: null, enemies: [] })
              setLiveCtx(null)
              setOpenCounters(null)
            }}
          >
            clear board
          </button>
        </p>
      )}

      {picker && heroes.data && (
        <HeroPickerModal
          heroes={[...heroes.data.values()]}
          exclude={
            picker === 'enemy' ? new Set(prep.enemies.map((e) => e.heroId)) : new Set<number>()
          }
          onPick={pickHero}
          onClose={() => setPicker(null)}
        />
      )}
    </>
  )
}

function HeroPickerModal({
  heroes,
  exclude,
  onPick,
  onClose,
}: {
  heroes: HeroAsset[]
  exclude: Set<number>
  onPick: (heroId: number) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const needle = search.trim().toLowerCase()
  const list = heroes
    .filter((h) => !exclude.has(h.id) && (!needle || h.name.toLowerCase().includes(needle)))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel"
        role="dialog"
        aria-label="Pick a hero"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <span className="caps modal-title">Pick a hero</span>
          <button className="btn-quiet" onClick={onClose}>
            close
          </button>
        </div>
        <input
          autoFocus
          className="picker-search"
          placeholder="Search heroes"
          aria-label="Search heroes"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="picker-grid">
          {list.map((hero) => (
            <button key={hero.id} className="picker-hero" onClick={() => onPick(hero.id)}>
              <img src={hero.images.icon_image_small_webp} alt="" loading="lazy" />
              <span>{hero.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
