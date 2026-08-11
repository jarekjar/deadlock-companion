/** Redirects to Steam's OpenID 2.0 endpoint ("Sign in through Steam"). */
export const onRequestGet = async (context: { request: Request }) => {
  const origin = new URL(context.request.url).origin
  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': `${origin}/api/auth/callback`,
    'openid.realm': origin,
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
  })
  return Response.redirect(`https://steamcommunity.com/openid/login?${params}`, 302)
}
