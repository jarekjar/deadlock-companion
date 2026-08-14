import { useMemo, useState } from 'react'
import { type HeroAsset } from '../../lib/api'
import { useHeroCounters, useHeroes, useHeroSynergies } from '../../lib/queries'
import { buildCounterMap, buildSynergyMap, scorePick, teamEdge } from '../../lib/draft'
import { bracketLabel, useRankFilter } from '../../lib/rankFilter'
import RankFilterControl from '../../shared/RankFilterControl'
import { modeLabel, useModeFilter } from '../../lib/modeFilter'
import ModeFilterControl from '../../shared/ModeFilterControl'
import { usePageMeta } from '../../lib/usePageMeta'
import { TEAMS } from '../../lib/teams'
import '../players/players.css'
import '../heroes/heroes.css'
import './draft.css'

const TEAM_SIZE = 6

type TeamKey = 0 | 1

export default function DraftPage() {
  usePageMeta(
    'Deadlock Draft Simulator — The Cursed Apple',
    'Draft a Deadlock lobby: fill in both teams and get data-driven pick suggestions from counter and duo win rates, plus a projected team edge.',
  )
  const heroes = useHeroes()
  const { minBadge } = useRankFilter()
  const { mode } = useModeFilter()
  const counters = useHeroCounters(minBadge, mode)
  const synergies = useHeroSynergies(minBadge, mode)

  const [teams, setTeams] = useState<(number | null)[][]>([
    Array(TEAM_SIZE).fill(null),
    Array(TEAM_SIZE).fill(null),
  ])
  const [active, setActive] = useState<{ team: TeamKey; index: number }>({ team: 0, index: 0 })
  const [search, setSearch] = useState('')

  const counterMap = useMemo(
    () => (counters.data ? buildCounterMap(counters.data) : null),
    [counters.data],
  )
  const synergyMap = useMemo(
    () => (synergies.data ? buildSynergyMap(synergies.data) : null),
    [synergies.data],
  )

  const picked = useMemo(() => new Set(teams.flat().filter((id): id is number => id !== null)), [teams])
  const picks = useMemo(
    () => teams.map((t) => t.filter((id): id is number => id !== null)),
    [teams],
  )

  function nextEmpty(team: TeamKey, current: (number | null)[][]): { team: TeamKey; index: number } {
    const own = current[team].findIndex((id) => id === null)
    if (own >= 0) return { team, index: own }
    const other = (1 - team) as TeamKey
    const theirs = current[other].findIndex((id) => id === null)
    return theirs >= 0 ? { team: other, index: theirs } : { team, index: 0 }
  }

  function pick(heroId: number) {
    if (picked.has(heroId)) return
    setTeams((prev) => {
      const next = prev.map((t) => [...t])
      next[active.team][active.index] = heroId
      setActive(nextEmpty(active.team, next))
      return next
    })
  }

  function clearSlot(team: TeamKey, index: number) {
    setTeams((prev) => {
      const next = prev.map((t) => [...t])
      next[team][index] = null
      return next
    })
    setActive({ team, index })
  }

  const suggestions = useMemo(() => {
    if (!counterMap || !synergyMap || !heroes.data) return null
    const allies = picks[active.team]
    const enemies = picks[1 - active.team]
    if (allies.length === 0 && enemies.length === 0) return []
    return [...heroes.data.keys()]
      .filter((id) => !picked.has(id))
      .map((id) => scorePick(id, allies, enemies, counterMap, synergyMap))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
  }, [counterMap, synergyMap, heroes.data, picks, active.team, picked])

  const edge = useMemo(() => {
    if (!counterMap || !synergyMap) return null
    if (picks[0].length === 0 || picks[1].length === 0) return null
    return teamEdge(picks[0], picks[1], counterMap, synergyMap)
  }, [counterMap, synergyMap, picks])

  const pool = useMemo(() => {
    if (!heroes.data) return null
    const needle = search.trim().toLowerCase()
    return [...heroes.data.values()]
      .filter((h) => !needle || h.name.toLowerCase().includes(needle))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [heroes.data, search])

  if (heroes.isError || counters.isError) {
    return <div className="page-note error">Could not load draft data</div>
  }

  const heroFor = (id: number | null) => (id !== null ? heroes.data?.get(id) : undefined)

  return (
    <>
      <div className="draft-boards">
        {([0, 1] as const).map((team) => (
          <div key={team} className="draft-team">
            <div className="team-title" style={{ borderLeftColor: TEAMS[team].color }}>
              <h3>{TEAMS[team].name}</h3>
            </div>
            <div className="draft-slots">
              {teams[team].map((id, index) => {
                const hero = heroFor(id)
                const isActive = active.team === team && active.index === index
                return (
                  <button
                    key={index}
                    className={`draft-slot${isActive ? ' active' : ''}${hero ? ' filled' : ''}`}
                    style={isActive ? { borderColor: TEAMS[team].color } : undefined}
                    onClick={() => (hero ? clearSlot(team, index) : setActive({ team, index }))}
                    title={hero ? `Remove ${hero.name}` : 'Pick into this slot'}
                  >
                    {hero ? (
                      <>
                        <img src={hero.images.icon_hero_card_webp} alt="" />
                        <span className="ds-name">{hero.name}</span>
                        <span className="ds-x">×</span>
                      </>
                    ) : (
                      <span className="ds-empty">{isActive ? 'picking…' : '—'}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="draft-edge">
        {edge === null ? (
          <span className="dim-note">Fill in both teams for a projected edge</span>
        ) : (
          <span className={edge >= 0 ? 'edge-amber' : 'edge-sapphire'}>
            {edge >= 0 ? TEAMS[0].name : TEAMS[1].name} favored by{' '}
            <strong>{Math.abs(edge).toFixed(1)}pp</strong>
          </span>
        )}
      </div>

      <div className="control-bar">
        <span className="cb-group cb-search">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search heroes"
            aria-label="Search heroes"
          />
        </span>
        <RankFilterControl />
        <ModeFilterControl />
        <span className="cb-group">
          <button
            className="cb-dir"
            onClick={() => {
              setTeams([Array(TEAM_SIZE).fill(null), Array(TEAM_SIZE).fill(null)])
              setActive({ team: 0, index: 0 })
            }}
          >
            Reset
          </button>
        </span>
      </div>

      {suggestions && suggestions.length > 0 && (
        <section className="data-section">
          <h3>
            Suggested picks — {TEAMS[active.team].name} · {bracketLabel(minBadge)} ·{' '}
            {modeLabel(mode)}
          </h3>
          <div className="draft-suggestions">
            {suggestions.map((s) => {
              const hero = heroes.data!.get(s.heroId)!
              return (
                <button key={s.heroId} className="draft-suggestion" onClick={() => pick(s.heroId)}>
                  <img src={hero.images.icon_image_small_webp} alt="" loading="lazy" />
                  <span className="sug-body">
                    <span className="sug-name">
                      {hero.name}
                      <span className={`sug-score ${s.score >= 0 ? 'delta-up' : 'delta-down'}`}>
                        {s.score >= 0 ? '+' : ''}
                        {s.score.toFixed(1)}
                      </span>
                    </span>
                    <span className="sug-why">
                      {s.bestAgainst &&
                        `best vs ${heroes.data!.get(s.bestAgainst.heroId)?.name} (${s.bestAgainst.winRate.toFixed(0)}%)`}
                      {s.bestAgainst && s.bestWith && ' · '}
                      {s.bestWith &&
                        `pairs with ${heroes.data!.get(s.bestWith.heroId)?.name} (${s.bestWith.winRate.toFixed(0)}%)`}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
          <p className="grid-note left-note">
            Score = average counter edge against the enemy picks + average duo edge with allied
            picks, in win-rate percentage points, from the last 30 days.
          </p>
        </section>
      )}

      {!pool ? (
        <div className="page-note">Loading heroes</div>
      ) : (
        <div className="draft-pool">
          {pool.map((h: HeroAsset) => (
            <button
              key={h.id}
              className="draft-pool-hero"
              disabled={picked.has(h.id)}
              onClick={() => pick(h.id)}
              title={h.name}
            >
              <img src={h.images.icon_image_small_webp} alt={h.name} loading="lazy" />
              <span>{h.name}</span>
            </button>
          ))}
        </div>
      )}
    </>
  )
}
