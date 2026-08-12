/**
 * The Cursed Apple design tokens, mobile flavor. Same 1930s occult-noir
 * palette as the website, tuned for handheld density and touch targets.
 */
export const c = {
  bg: '#17110b',
  bgRaised: '#201812',
  bgInset: '#120d08',
  ink: '#e8dcc0',
  inkDim: '#c9bda0',
  inkFaint: '#8f8368',
  brass: '#c9a24b',
  brassBright: '#ddb85f',
  brassDim: '#8f7434',
  rule: '#3b2f1e',
  ruleFaint: '#2a2013',
  up: '#8aa163',
  danger: '#b0492f',
} as const

export const f = {
  display: 'Limelight_400Regular',
  body: 'JosefinSans_400Regular',
  bodySemi: 'JosefinSans_600SemiBold',
  bodyBold: 'JosefinSans_700Bold',
  mono: 'IBMPlexMono_500Medium',
  monoSemi: 'IBMPlexMono_600SemiBold',
} as const

export function winRateColor(wr: number): string {
  if (wr >= 52) return c.up
  if (wr <= 48) return c.danger
  return c.ink
}

/** "12842" -> "12.8k" without relying on Hermes Intl coverage. */
export function compact(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`
  if (abs >= 10_000) return `${Math.round(n / 1000)}k`
  if (abs >= 1_000) return `${(n / 1000).toFixed(1)}k`
  return String(Math.round(n))
}
