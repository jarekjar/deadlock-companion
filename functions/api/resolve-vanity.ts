const STEAM64_BASE = 76561197960265728n

/**
 * Resolves a steamcommunity.com/id/<name> vanity URL to an account id using
 * Steam's public XML profile endpoint — no API key required. Runs server-side
 * because steamcommunity.com does not allow cross-origin reads.
 */
export const onRequestGet = async (context: { request: Request }) => {
  const name = new URL(context.request.url).searchParams.get('name') ?? ''
  if (!/^[\w.~-]{2,64}$/.test(name)) {
    return json({ error: 'invalid vanity name' }, 400)
  }

  const res = await fetch(`https://steamcommunity.com/id/${encodeURIComponent(name)}?xml=1`)
  const body = await res.text()
  const match = /<steamID64>(\d{17})<\/steamID64>/.exec(body)
  if (!match) {
    return json({ error: 'profile not found' }, 404)
  }

  return json({ accountId: Number(BigInt(match[1]) - STEAM64_BASE) })
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      // public lookup, no cookies involved — the native app calls this
      // cross-origin from its local WebView origin
      'Access-Control-Allow-Origin': '*',
    },
  })
}
