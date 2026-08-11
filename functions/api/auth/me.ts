import { readSession, type Env } from '../../_shared/session'

/** Returns the signed-in player's account id, or 401 when signed out. */
export const onRequestGet = async (context: { request: Request; env: Env }) => {
  if (!context.env.SESSION_SECRET) {
    return new Response(JSON.stringify({ error: 'not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const accountId = await readSession(context.request, context.env.SESSION_SECRET)
  if (accountId === null) {
    return new Response(JSON.stringify({ error: 'signed out' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return new Response(JSON.stringify({ accountId }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
