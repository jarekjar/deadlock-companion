import { type MetricStats } from './api'

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
