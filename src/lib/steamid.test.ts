import { describe, expect, it } from 'vitest'
import { accountIdFromSteamId64, parsePlayerInput, steamId64FromAccountId } from './steamid'

describe('steam id conversion', () => {
  it('converts SteamID64 to account_id without float precision loss', () => {
    // 76561198790180895 is above Number.MAX_SAFE_INTEGER
    expect(accountIdFromSteamId64('76561198790180895')).toBe(829915167)
  })

  it('round-trips', () => {
    expect(steamId64FromAccountId(829915167)).toBe('76561198790180895')
    expect(accountIdFromSteamId64(steamId64FromAccountId(1))).toBe(1)
  })

  it('rejects non-steam 17-digit numbers', () => {
    expect(accountIdFromSteamId64('12345678901234567')).toBeNull()
    expect(accountIdFromSteamId64('7656119879018089')).toBeNull()
  })
})

describe('parsePlayerInput', () => {
  it('parses profile URLs', () => {
    expect(
      parsePlayerInput('https://steamcommunity.com/profiles/76561198790180895/'),
    ).toEqual({ kind: 'account', accountId: 829915167 })
  })

  it('parses vanity URLs for server-side resolution', () => {
    expect(parsePlayerInput('https://steamcommunity.com/id/somecoolguy')).toEqual({
      kind: 'vanity',
      name: 'somecoolguy',
    })
    expect(parsePlayerInput('steamcommunity.com/id/some_guy-77/')).toEqual({
      kind: 'vanity',
      name: 'some_guy-77',
    })
  })

  it('parses raw ids', () => {
    expect(parsePlayerInput('76561198790180895')).toEqual({
      kind: 'account',
      accountId: 829915167,
    })
    expect(parsePlayerInput('829915167')).toEqual({ kind: 'account', accountId: 829915167 })
  })

  it('parses SteamID3 and SteamID2 formats', () => {
    expect(parsePlayerInput('[U:1:829915167]')).toEqual({
      kind: 'account',
      accountId: 829915167,
    })
    // STEAM_0:1:414957583 -> 414957583 * 2 + 1
    expect(parsePlayerInput('STEAM_0:1:414957583')).toEqual({
      kind: 'account',
      accountId: 829915167,
    })
  })

  it('falls back to persona search', () => {
    expect(parsePlayerInput('some cool guy')).toEqual({ kind: 'search', query: 'some cool guy' })
    expect(parsePlayerInput('')).toBeNull()
  })
})
