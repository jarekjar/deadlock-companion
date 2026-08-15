// Generates public/sitemap.xml from the static routes plus every hero and
// shopable item page. Run `node scripts/generate-sitemap.mjs` after patches
// that add heroes or items, then commit the result.
import { writeFileSync } from 'node:fs'

const ORIGIN = 'https://thecursedapple.app'
const STATIC_ROUTES = [
  '/',
  '/timers',
  '/cheat-sheet',
  '/players',
  '/heroes',
  '/items',
  '/matchups',
  '/builds',
  '/patch-report',
  '/records',
  '/draft',
  '/upload',
  '/leaderboard',
  '/live',
  '/my-match',
]

const heroes = await (
  await fetch('https://api.deadlock-api.com/v1/assets/heroes?only_active=true')
).json()
const items = await (await fetch('https://api.deadlock-api.com/v1/assets/items')).json()

const urls = [
  ...STATIC_ROUTES,
  ...heroes.map((h) => `/heroes/${h.id}`),
  ...heroes.map((h) => `/matchups/${h.id}`),
  ...items.filter((i) => i.type === 'upgrade' && i.shopable !== false).map((i) => `/items/${i.id}`),
]

const today = new Date().toISOString().slice(0, 10)
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${ORIGIN}${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`
writeFileSync(new URL('../public/sitemap.xml', import.meta.url), xml)
console.log(`sitemap.xml written with ${urls.length} URLs`)
