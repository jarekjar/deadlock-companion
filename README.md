# The Cursed Apple — a Deadlock companion

Spawn timers, match tracking, and player stats for Valve's Deadlock.

## Features

- **Spawn timers** — a match clock you sync with the in-game timer, with live countdowns
  for jungle camps, boxes & golden statues, bridge buffs, Sinner's Sacrifice, the Mid-Boss
  (with its 7:00 / 6:00 / 5:00 respawn ladder), and the Soul Urn. Optional chime and
  browser-notification alerts before each spawn.
- **Cheat sheet** — the full objective timing table for the current patch, with sources.
- **Player profiles** — find any player by Steam URL, ID, or name; win rate, KDA,
  souls/min, per-hero stats, and a sortable match history. Favorites are saved locally.
- **Steam sign-in** — optional OpenID login (via Cloudflare Pages Functions) that pins
  "My Profile" in the nav. No password ever touches this app; Steam vouches for you.

Planned: per-match breakdowns, hero/item win rates, and live match stats — powered by
the community [Deadlock API](https://deadlock-api.com).

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
