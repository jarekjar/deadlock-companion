/**
 * Signed session cookie for Cloudflare Pages Functions.
 * Value: "<accountId>.<expiresEpochSec>.<base64url hmac-sha256>"
 * Secret comes from the SESSION_SECRET environment variable
 * (Cloudflare dashboard in production, .dev.vars locally).
 */
export const COOKIE_NAME = 'dc_session'
const THIRTY_DAYS_SEC = 30 * 24 * 60 * 60

export interface Env {
  SESSION_SECRET: string
}

async function hmac(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

export async function createSessionCookie(accountId: number, secret: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + THIRTY_DAYS_SEC
  const payload = `${accountId}.${exp}`
  const sig = await hmac(secret, payload)
  return `${COOKIE_NAME}=${payload}.${sig}; Path=/; Max-Age=${THIRTY_DAYS_SEC}; HttpOnly; Secure; SameSite=Lax`
}

export const clearSessionCookie = () =>
  `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`

export async function readSession(request: Request, secret: string): Promise<number | null> {
  const cookies = request.headers.get('Cookie') ?? ''
  const match = new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`).exec(cookies)
  if (!match) return null
  const [accountId, exp, sig] = match[1].split('.')
  if (!accountId || !exp || !sig) return null
  if (Number(exp) < Date.now() / 1000) return null
  const expected = await hmac(secret, `${accountId}.${exp}`)
  if (sig !== expected) return null
  return Number(accountId)
}
