import { describe, expect, it } from 'vitest'
import {
  emptyState,
  formatClock,
  nextSpawn,
  parseGameTime,
  type ObjectiveDef,
} from './timerEngine'

const bridgeBuffs: ObjectiveDef = {
  id: 'bridge-buffs',
  name: 'Bridge Buffs',
  firstSpawn: 300,
  mode: 'interval',
  interval: 300,
}

const urn: ObjectiveDef = {
  id: 'urn',
  name: 'Soul Urn',
  firstSpawn: 600,
  mode: 'event',
  respawn: 300,
}

const midboss: ObjectiveDef = {
  id: 'midboss',
  name: 'Mid-Boss',
  firstSpawn: 600,
  mode: 'ladder',
  ladder: [420, 360, 300],
}

const camps: ObjectiveDef = {
  id: 'small-camps',
  name: 'Small Camps',
  firstSpawn: 120,
  mode: 'info',
}

describe('nextSpawn', () => {
  it('counts down to first spawn for every mode', () => {
    for (const def of [bridgeBuffs, urn, midboss, camps]) {
      expect(nextSpawn(def, emptyState(), 0)).toEqual({
        kind: 'waiting',
        spawnsAt: def.firstSpawn,
      })
      expect(nextSpawn(def, emptyState(), def.firstSpawn - 1)).toEqual({
        kind: 'waiting',
        spawnsAt: def.firstSpawn,
      })
    }
  })

  it('info mode reports spawned from first spawn onward', () => {
    expect(nextSpawn(camps, emptyState(), 120)).toEqual({ kind: 'spawned' })
    expect(nextSpawn(camps, emptyState(), 4000)).toEqual({ kind: 'spawned' })
  })

  it('interval mode counts to the next wave on a fixed cycle', () => {
    expect(nextSpawn(bridgeBuffs, emptyState(), 300)).toEqual({ kind: 'waiting', spawnsAt: 600 })
    expect(nextSpawn(bridgeBuffs, emptyState(), 599)).toEqual({ kind: 'waiting', spawnsAt: 600 })
    expect(nextSpawn(bridgeBuffs, emptyState(), 600)).toEqual({ kind: 'waiting', spawnsAt: 900 })
    expect(nextSpawn(bridgeBuffs, emptyState(), 1750)).toEqual({ kind: 'waiting', spawnsAt: 1800 })
  })

  it('event mode is up until the event, then counts the respawn delay', () => {
    expect(nextSpawn(urn, emptyState(), 600)).toEqual({ kind: 'up' })
    expect(nextSpawn(urn, emptyState(), 2000)).toEqual({ kind: 'up' })
    const delivered = { events: [700] }
    expect(nextSpawn(urn, delivered, 701)).toEqual({ kind: 'waiting', spawnsAt: 1000 })
    expect(nextSpawn(urn, delivered, 1000)).toEqual({ kind: 'up' })
  })

  it('ladder mode walks 7:00 -> 6:00 -> 5:00 and repeats the last delay', () => {
    expect(nextSpawn(midboss, emptyState(), 600)).toEqual({ kind: 'up' })
    expect(nextSpawn(midboss, { events: [650] }, 651)).toEqual({
      kind: 'waiting',
      spawnsAt: 650 + 420,
    })
    expect(nextSpawn(midboss, { events: [650, 1100] }, 1101)).toEqual({
      kind: 'waiting',
      spawnsAt: 1100 + 360,
    })
    expect(nextSpawn(midboss, { events: [650, 1100, 1500] }, 1501)).toEqual({
      kind: 'waiting',
      spawnsAt: 1500 + 300,
    })
    expect(nextSpawn(midboss, { events: [650, 1100, 1500, 1900] }, 1901)).toEqual({
      kind: 'waiting',
      spawnsAt: 1900 + 300,
    })
  })

  it('ladder respawn countdown resolves to up once elapsed', () => {
    expect(nextSpawn(midboss, { events: [650] }, 650 + 420)).toEqual({ kind: 'up' })
  })
})

describe('formatClock', () => {
  it('formats minutes and zero-padded seconds', () => {
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(5)).toBe('0:05')
    expect(formatClock(754)).toBe('12:34')
    expect(formatClock(3900)).toBe('65:00')
  })

  it('clamps negatives and truncates fractions', () => {
    expect(formatClock(-3)).toBe('0:00')
    expect(formatClock(59.9)).toBe('0:59')
  })
})

describe('parseGameTime', () => {
  it('parses mm:ss', () => {
    expect(parseGameTime('12:34')).toBe(754)
    expect(parseGameTime('2:05')).toBe(125)
    expect(parseGameTime(':45')).toBe(45)
  })

  it('parses plain seconds', () => {
    expect(parseGameTime('90')).toBe(90)
  })

  it('rejects garbage and out-of-range seconds', () => {
    expect(parseGameTime('')).toBeNull()
    expect(parseGameTime('abc')).toBeNull()
    expect(parseGameTime('12:75')).toBeNull()
    expect(parseGameTime('1:2:3')).toBeNull()
  })
})
