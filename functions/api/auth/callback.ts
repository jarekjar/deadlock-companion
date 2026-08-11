import { createSessionCookie, type Env } from '../../_shared/session'

const STEAM64_BASE = 76561197960265728n

/**
 * Steam redirects back here after login. Re-post the parameters to Steam with
 * mode=check_authentication; Steam answers is_valid:true only for a signature
 * it minted, which proves the claimed_id (and its SteamID64) is genuine.
 */
export const onRequestGet = async (context: { request: Request; env: Env }) => {
  if (!context.env.SESSION_SECRET) {
    return new Response(
      'Sign-in is not configured: set the SESSION_SECRET variable on the Cloudflare Pages project and redeploy.',
      { status: 500 },
    )
  }
  const url = new URL(context.request.url)
  const params = new URLSearchParams(url.search)
  params.set('openid.mode', 'check_authentication')

  const verify = await fetch('https://steamcommunity.com/openid/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })
  const verdict = await verify.text()
  if (!verdict.includes('is_valid:true')) {
    return new Response('Steam sign-in could not be verified.', { status: 401 })
  }

  const claimedId = url.searchParams.get('openid.claimed_id') ?? ''
  const idMatch = /^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/.exec(claimedId)
  if (!idMatch) {
    return new Response('Unexpected Steam identity.', { status: 400 })
  }

  const accountId = Number(BigInt(idMatch[1]) - STEAM64_BASE)
  const headers = new Headers({
    Location: `${url.origin}/players/${accountId}`,
    'Set-Cookie': await createSessionCookie(accountId, context.env.SESSION_SECRET),
  })
  return new Response(null, { status: 302, headers })
}
