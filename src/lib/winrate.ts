/** Muted state coloring for win rates: green above 52%, red below 48%. */
export function winRateClass(winRate: number): string {
  if (winRate >= 52) return 'wr-good'
  if (winRate <= 48) return 'wr-bad'
  return ''
}
