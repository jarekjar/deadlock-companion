import { describe, expect, it } from 'vitest'
import { averageBadge, badgeToIndex, indexToBadge } from './api'

describe('badge linearization', () => {
  it('round-trips every real badge', () => {
    for (let tier = 0; tier <= 11; tier++) {
      for (let subrank = 1; subrank <= 6; subrank++) {
        const badge = tier * 10 + subrank
        expect(indexToBadge(badgeToIndex(badge))).toBe(badge)
      }
    }
  })

  it('orders badges across tier boundaries', () => {
    // Emissary 6 (76) is one step below Archon 1 (81)
    expect(badgeToIndex(81) - badgeToIndex(76)).toBe(1)
  })
})

describe('averageBadge', () => {
  it('returns null with no visible badges', () => {
    expect(averageBadge([])).toBeNull()
    expect(averageBadge([0, 0])).toBeNull()
  })

  it('ignores hidden badges and averages the rest', () => {
    expect(averageBadge([0, 85, 85])).toBe(85)
  })

  it('averages across a tier boundary on the linear scale', () => {
    // Emissary 6 (76) and Archon 1 (81) are adjacent steps; their average
    // rounds to one of the two, never an invalid badge like 78 or 79.
    expect([76, 81]).toContain(averageBadge([76, 81]))
  })
})
