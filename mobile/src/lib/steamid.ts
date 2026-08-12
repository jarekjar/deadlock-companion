/**
 * Steam identity plumbing. Deadlock keys players by account_id (the SteamID3
 * "U" number). SteamID64 values exceed Number.MAX_SAFE_INTEGER, so all
 * conversions go through BigInt.
 */
const STEAM64_BASE = 76561197960265728n

export function accountIdFromSteamId64(steamId64: string): number | null {
  if (!/^\d{17}$/.test(steamId64)) return null
  const accountId = BigInt(steamId64) - STEAM64_BASE
  if (accountId <= 0n || accountId > 0xffffffffn) return null
  return Number(accountId)
}

export type PlayerInput =
  | { kind: 'account'; accountId: number }
  /** A steamcommunity.com/id/<name> URL — resolve via the website's function. */
  | { kind: 'vanity'; name: string }
  /** Not directly resolvable — feed it to the steam-search endpoint. */
  | { kind: 'search'; query: string }

/**
 * Accepts anything a friend might paste: an account id, a SteamID64, a
 * steamcommunity profile URL, STEAM_0:X:Y, [U:1:N], or a persona name.
 */
export function parsePlayerInput(raw: string): PlayerInput | null {
  const input = raw.trim()
  if (input === '') return null

  const profileUrl = /steamcommunity\.com\/profiles\/(\d{17})/i.exec(input)
  if (profileUrl) {
    const accountId = accountIdFromSteamId64(profileUrl[1])
    return accountId === null ? null : { kind: 'account', accountId }
  }

  const vanityUrl = /steamcommunity\.com\/id\/([^/?#\s]+)/i.exec(input)
  if (vanityUrl) return { kind: 'vanity', name: vanityUrl[1] }

  const steam3 = /^\[?U:1:(\d+)\]?$/i.exec(input)
  if (steam3) return { kind: 'account', accountId: Number(steam3[1]) }

  const steam2 = /^STEAM_[0-5]:([01]):(\d+)$/i.exec(input)
  if (steam2) return { kind: 'account', accountId: Number(steam2[2]) * 2 + Number(steam2[1]) }

  if (/^\d{17}$/.test(input)) {
    const accountId = accountIdFromSteamId64(input)
    return accountId === null ? null : { kind: 'account', accountId }
  }

  if (/^\d{1,10}$/.test(input)) return { kind: 'account', accountId: Number(input) }

  return { kind: 'search', query: input }
}
