# The Cursed Apple — a Deadlock companion

Spawn timers, match tracking, and player stats for Valve's Deadlock.

## Features

- **Spawn timers** — a match clock you sync with the in-game timer, with live countdowns
  for jungle camps, boxes & golden statues, bridge buffs, Sinner's Sacrifice, the Mid-Boss
  (with its 7:00 / 6:00 / 5:00 respawn ladder), and the Soul Urn. Optional chime and
  browser-notification alerts before each spawn.
- **Cheat sheet** — the full objective timing table for the current patch, with sources.

Planned: player profiles, match history and per-match breakdowns, hero/item win rates,
and live match stats — powered by the community [Deadlock API](https://deadlock-api.com).

## Development

```sh
npm install
npm run dev      # dev server
npm test         # vitest
npm run lint     # eslint
npm run build    # type-check + production build
```

## Timing data

Objective timings live in [`src/data/timers.json`](src/data/timers.json), stamped with the
patch they were verified against. Valve moves these numbers regularly — if a patch changes
a timer, that file is the only thing to update.

## Deployment

Deployed on Cloudflare Pages. Build command `npm run build`, output directory `dist`.
