const APP_ID = 1422450
const STEAM_NEWS = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${APP_ID}&count=100&maxlength=0`
const COMMUNITY_PATCHES = 'https://api.deadlock-api.com/v1/patches'
/** Edge cache: patches land a few times a month, so half an hour is plenty. */
const CACHE_SECONDS = 1800

interface SteamNewsItem {
  gid: string
  title: string
  url: string
  contents: string
  feedname: string
  date: number
  tags?: string[]
}

export interface PatchSummary {
  /** Unix seconds at UTC midnight of the patch day — the join key across sources. */
  day: number
  title: string
  link: string
  /** Steam news id, present only when we can serve the notes for this patch. */
  gid: string | null
}

/**
 * Normalized Deadlock patch list, merged from Valve's Steam announcements and
 * the community API's forum feed.
 *
 * Both sources are incomplete on their own: the community feed mirrors the
 * forum changelog and has repeatedly run weeks behind (it stopped at
 * 06-30-2026 while four newer patches had shipped), while Steam's news feed
 * only reaches back a few months. Merging keeps recent patches selectable
 * without losing the older ones.
 *
 * Runs server-side because api.steampowered.com sends no CORS headers.
 *
 * - `GET /api/patches`            -> { patches: PatchSummary[] }, newest first
 * - `GET /api/patches?gid=<gid>`  -> { title, notes: string[] } for one patch
 */
export const onRequestGet = async (context: { request: Request }) => {
  const gid = new URL(context.request.url).searchParams.get('gid')

  if (gid !== null) {
    if (!/^\d{1,32}$/.test(gid)) return json({ error: 'invalid gid' }, 400)
    const item = (await steamPatches()).find((i) => i.gid === gid)
    if (!item) return json({ error: 'patch not found' }, 404)
    return json({ title: item.title, notes: bbcodeToLines(item.contents) })
  }

  const [steam, community] = await Promise.all([steamPatches(), communityPatches()])

  const byDay = new Map<number, PatchSummary>()
  // Community first so a Steam entry (which carries notes) wins on collision.
  for (const p of community) byDay.set(p.day, p)
  for (const item of steam) {
    const day = patchDay(item.title, item.date)
    if (day === null) continue
    byDay.set(day, { day, title: item.title, link: item.url, gid: item.gid })
  }

  const patches = [...byDay.values()].sort((a, b) => b.day - a.day)
  return json({ patches })
}

async function steamPatches(): Promise<SteamNewsItem[]> {
  const res = await fetch(STEAM_NEWS, { cf: { cacheTtl: CACHE_SECONDS } } as RequestInit)
  if (!res.ok) return []
  const body = (await res.json()) as { appnews?: { newsitems?: SteamNewsItem[] } }
  return (body.appnews?.newsitems ?? []).filter(
    (i) =>
      // Valve's own announcements only — the feed also carries press articles.
      i.feedname === 'steam_community_announcements' &&
      (i.tags?.includes('patchnotes') || /\bupdate\b/i.test(i.title)),
  )
}

async function communityPatches(): Promise<PatchSummary[]> {
  const res = await fetch(COMMUNITY_PATCHES, { cf: { cacheTtl: CACHE_SECONDS } } as RequestInit)
  if (!res.ok) return []
  const body = (await res.json()) as { title: string; link: string }[]
  return body.flatMap((p) => {
    const day = patchDay(p.title, null)
    return day === null ? [] : [{ day, title: p.title, link: p.link, gid: null }]
  })
}

/**
 * Patch day from the "MM-DD-YYYY" in a title ("Minor Update - 08-12-2026"),
 * falling back to the post date. Titles are authoritative: the forum feed
 * routinely posts a patch weeks after its dated title.
 */
function patchDay(title: string, postedAt: number | null): number | null {
  const m = /(\d{2})-(\d{2})-(\d{4})/.exec(title)
  if (m) return Date.UTC(Number(m[3]), Number(m[1]) - 1, Number(m[2])) / 1000
  if (postedAt === null) return null
  const d = new Date(postedAt * 1000)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 1000
}

/**
 * Steam patch notes are BBCode: lines wrapped in `[p]`, section headers as
 * `[b][u]\[ General ]...`. Strip the markup and keep one entry per line.
 */
export function bbcodeToLines(contents: string): string[] {
  return contents
    .replace(/\[\/?[a-z][^\]]*\]/gi, '\n')
    .replace(/\\\[/g, '[')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '')
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      // public data, no cookies — the native app may call this cross-origin
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': `public, max-age=${CACHE_SECONDS}`,
    },
  })
}
