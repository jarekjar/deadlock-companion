import { type MetricStats, type PlayerMetrics } from './api'

/**
 * Where a value sits on a population's percentile curve, interpolated between
 * the known percentile points. Returns 1..99 (clamped at the measured tails).
 */
export function percentileOf(value: number, population: MetricStats): number {
  const points: [number, number][] = [
    [1, population.percentile1],
    [5, population.percentile5],
    [10, population.percentile10],
    [25, population.percentile25],
    [50, population.percentile50],
    [75, population.percentile75],
    [90, population.percentile90],
    [95, population.percentile95],
    [99, population.percentile99],
  ]
  if (value <= points[0][1]) return 1
  for (let i = 1; i < points.length; i++) {
    const [pctA, valA] = points[i - 1]
    const [pctB, valB] = points[i]
    if (value <= valB) {
      if (valB === valA) return pctB
      return pctA + ((value - valA) / (valB - valA)) * (pctB - pctA)
    }
  }
  return 99
}

/* ---- the composite performance score ---- */

interface ScoreComponent {
  key: string
  label: string
  weight: number
  lowerIsBetter?: boolean
}

/** Impact-weighted mix; weights sum to 1. */
const SCORE_COMPONENTS: ScoreComponent[] = [
  { key: 'kda', label: 'KDA', weight: 0.2 },
  { key: 'net_worth_per_min', label: 'Souls per min', weight: 0.2 },
  { key: 'player_damage_per_min', label: 'Damage per min', weight: 0.15 },
  { key: 'deaths', label: 'Deaths', weight: 0.1, lowerIsBetter: true },
  { key: 'last_hits', label: 'Last hits', weight: 0.1 },
  { key: 'accuracy', label: 'Accuracy', weight: 0.1 },
  { key: 'denies', label: 'Denies', weight: 0.05 },
  { key: 'boss_damage_per_min', label: 'Boss damage', weight: 0.05 },
  { key: 'healing_per_min', label: 'Healing', weight: 0.05 },
]

export interface ScoredMetric {
  key: string
  label: string
  /** 1-99: the share of the field this player beats (higher is better). */
  beats: number
}

export interface PerformanceScore {
  /** 1-99, an impact-weighted average of the percentile placements. */
  score: number
  /** Every scored metric, best first. */
  metrics: ScoredMetric[]
}

/**
 * One number for "how is this player doing versus everyone", built from the
 * percentile placement of their per-match averages.
 */
export function performanceScore(
  player: PlayerMetrics,
  population: PlayerMetrics,
): PerformanceScore | null {
  let weighted = 0
  let weightSum = 0
  const metrics: ScoredMetric[] = []
  for (const component of SCORE_COMPONENTS) {
    const mine = player[component.key]
    const pop = population[component.key]
    if (!mine || !pop) continue
    const pct = percentileOf(mine.avg, pop)
    const beats = component.lowerIsBetter ? 100 - pct : pct
    weighted += beats * component.weight
    weightSum += component.weight
    metrics.push({ key: component.key, label: component.label, beats })
  }
  if (weightSum === 0) return null
  metrics.sort((a, b) => b.beats - a.beats)
  return { score: Math.min(99, Math.max(1, Math.round(weighted / weightSum))), metrics }
}

export function scoreGrade(score: number): string {
  if (score >= 85) return 'S'
  if (score >= 70) return 'A'
  if (score >= 55) return 'B'
  if (score >= 40) return 'C'
  return 'D'
}

/** What to actually do about a weak metric — the coaching line per key. */
export const METRIC_ADVICE: Record<string, string> = {
  kda: 'Trade fights on your terms — kills are worth less than the deaths they cost.',
  kills: 'Look for more kill windows — track enemy cooldowns and commit with your team.',
  assists: 'Be there for your team’s fights — rotations and ganks feed this.',
  deaths: 'Dying less is the fastest win-rate fix — respect the map when your escape is down.',
  net_worth_per_min: 'Keep farming between fights — idle minutes are the biggest souls leak.',
  last_hits: 'Secure more last hits in lane; every orb you miss is souls for nobody.',
  denies: 'Deny more in lane — it starves your opponent and snowballs the matchup.',
  accuracy: 'Your shots land less than the field’s — warm up your aim and pick fights in range.',
  crit_shot_rate: 'Aim higher — headshot-range crits are free damage.',
  player_damage_per_min: 'Find more damage uptime in fights — position to keep shooting.',
  player_damage_taken_per_min: 'You soak more damage than the field — watch positioning and disengage earlier.',
  healing_per_min: 'Lean on sustain — orbs, items, and regen keep you in lane and in fights.',
  boss_damage_per_min: 'Convert picks into objectives — hit bosses and shrines harder.',
}
