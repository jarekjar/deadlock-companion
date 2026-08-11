# The Cursed Apple — a Deadlock companion

**Live at [deadlock-companion.pages.dev](https://deadlock-companion.pages.dev)**

Spawn timers, player stats, hero meta, and live matches for Valve's Deadlock, in a
1930s-noir dress. Free, no account needed.

## Features

- **Spawn timers** — a match clock you sync once (or sync automatically from a live
  match), with countdowns for jungle camps, boxes & golden statues, bridge buffs,
  Sinner's Sacrifice, the Mid-Boss (7:00 / 6:00 / 5:00 respawn ladder), and the Soul
  Urn. Optional chime and browser-notification alerts, plus a full cheat sheet.
- **Player profiles** — find any player by Steam link, ID, or name: win rate, KDA,
  souls/min, favorite and best heroes, favorite items, per-hero stats, rank badges,
  and a match history filterable by hero and date range.
- **Match breakdowns** — team scoreboards, the souls race over time, every player's
  item build with hover details and buy times, and the Mid-Boss log.
- **Hero meta** — 30-day win and pick rates for every hero, and the most popular
  items per tier with their win rates.
- **Matchups & counters** — how a hero fares into every opponent, with the items
  that actually win those specific matchups.
- **Live matches** — browse ongoing games with live soul counts, follow a friend's
  match, and sync the spawn timers to it in one click.
- **Steam sign-in** — optional OpenID login (via Cloudflare Pages Functions) that
  pins "My Profile" in the nav. No password ever touches this app.

Stats come from the community [Deadlock API](https://deadlock-api.com); game art is
served from its assets service.

## Development

```sh
npm install
npm run dev      # dev server (UI only; auth endpoints 404 and read as signed out)
npm run dev:cf   # dev server behind wrangler, with the auth functions running
npm test         # vitest
npm run lint     # eslint
npm run build    # type-check + production build
```

For `dev:cf`, copy `.dev.vars.example` to `.dev.vars` first.

## Timing data

Objective timings live in [`src/data/timers.json`](src/data/timers.json), stamped with the
patch they were verified against. Valve moves these numbers regularly — if a patch changes
a timer, that file is the only thing to update.

## Deployment

Deployed on Cloudflare Pages. Build command `npm run build`, output directory `dist`.
Steam sign-in requires a `SESSION_SECRET` environment variable on the Pages project
(Settings → Variables and Secrets → add as **Secret**): any long random string, e.g.
the output of `openssl rand -hex 32` or PowerShell
`-join ((1..64) | % { '{0:x}' -f (Get-Random -Max 16) })`.
