import { describe, expect, it } from 'vitest'
import { gameTime, pause, resume, resync, start } from './clock'

describe('match clock', () => {
  it('starts at zero and advances with real time', () => {
    const clock = start(10_000)
    expect(gameTime(clock, 10_000)).toBe(0)
    expect(gameTime(clock, 15_500)).toBe(5.5)
  })

  it('freezes while paused and resumes without losing time', () => {
    let clock = start(0)
    clock = pause(clock, 30_000)
    expect(gameTime(clock, 90_000)).toBe(30)
    clock = resume(clock, 90_000)
    expect(gameTime(clock, 95_000)).toBe(35)
  })

  it('resyncs to a typed in-game time while running', () => {
    let clock = start(0)
    clock = resync(clock, 60_000, 754)
    expect(gameTime(clock, 60_000)).toBe(754)
    expect(gameTime(clock, 61_000)).toBe(755)
    expect(clock.running).toBe(true)
  })

  it('resyncs while paused and stays paused', () => {
    let clock = pause(start(0), 10_000)
    clock = resync(clock, 20_000, 300)
    expect(clock.running).toBe(false)
    expect(gameTime(clock, 99_000)).toBe(300)
  })
})
