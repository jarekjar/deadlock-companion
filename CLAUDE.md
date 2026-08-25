# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"The Cursed Apple" — a Deadlock (Valve) companion: spawn timers, match prep, player stats, hero/item meta, leaderboards, live matches. Two apps in one repo:

- **Root** — the website ([thecursedapple.app](https://thecursedapple.app)): React 19 + react-router v7 + TanStack Query, Vite, installable PWA. Deployed on Cloudflare Pages (output `dist/`).
- **`mobile/`** — a separate Expo SDK 57 / React Native Android app (expo-router, bottom tabs). Its own package.json and CLAUDE.md (which points to `mobile/AGENTS.md`: read the versioned Expo docs at docs.expo.dev/versions/v57.0.0 before writing Expo code). Not a wrap of the website — no Steam sign-in; headline feature is native spawn-alert notifications.

## Commands

Website (repo root):

```sh
npm run dev      # vite only — /api/* 404s, app reads as signed out
npm run dev:cf   # wrangler pages dev on :8788 wrapping vite — auth functions work
                 #   (copy .dev.vars.example to .dev.vars first)
npm test         # vitest run (one-shot)
npx vitest run src/lib/steamid.test.ts   # single test file
npm run lint     # eslint
npm run build    # tsc -b + vite build
npm run sitemap  # regenerate public/sitemap.xml (run after patches add heroes/items, commit result)
```

Vitest is configured in `vite.config.ts`: **node environment, `src/**/*.test.ts` only** — no jsdom, no `.tsx` tests. Tests cover pure logic (timerEngine, clock, steamid); components are not unit-tested.

Mobile (`cd mobile`):

```sh
npx expo start          # Metro dev server
npm run typecheck       # tsc --noEmit (no test runner in mobile)
npm run lint
npm run prebuild:android  # expo prebuild + Windows patch scripts — required before building
npm run apk               # android/app/build/outputs/apk/release/app-release.apk
```

`mobile/android/` is **generated, not committed**. `scripts/patch-android-windows.mjs` re-applies mandatory Windows fixes (64-bit ABIs only, CMake staging under `C:\b\cxx` to dodge the 250-char path limit, CMake 3.31.6 pin) — never hand-edit `android/`, it gets regenerated.

## Architecture

### Data layer (website)

All stats come from the community Deadlock API (`api.deadlock-api.com` — open CORS, no key). The layering is strict:

- `src/lib/api.ts` — the only fetch client. Typed fetchers with response interfaces trimmed to the fields actually read, plus pure helpers (badge math, item formatting).
- `src/lib/queries.ts` — one react-query hook per fetcher, with deliberate cache tiers: game assets (heroes/items/ranks/map) cache forever; analytics use a **midnight-aligned 30-day window** (`SINCE_30D`) so query keys stay stable, staleTime 30 min; player data 1–5 min; live matches poll on `refetchInterval` (30–60 s).

New API calls follow that pattern: fetcher in `api.ts`, hook in `queries.ts`, never `fetch` in components.

Two data sources sit outside `api.ts`:

- `src/lib/objectives.ts` — the `team_objective_id` enum from match metadata (Guardian/Walker/Shrine/Base Guardian/Titan/Patron per lane) plus `objectiveTimeline()`. The mapping is verified against the `objectives_mask`: ids with a `destroyed_time_s` never overlap bits still set in the mask, and ids **2, 6, 13** (lane 2, removed in the map rework) stay set in every mask forever — so counting raw set bits over-reports by three. Use `OBJECTIVES_PER_TEAM` (13), not 16.
- `src/lib/demoTimeline.ts` — the Urn and Unstable Rift exist only in demo files, so this drives the async demo SQL API (`/v1/matches/demo/query`). Kept behind an explicit button on the match page: a cold parse costs ~55s upstream and only a small minority of matches have a demo at all.

### Features

`src/features/<name>/` folders (timers, live, players, matches, heroes, items, builds, patch, records, draft, leaderboard, home, privacy), each with its pages and a per-feature `.css`. All routes are declared in `src/App.tsx` and lazy-loaded except `HomePage` (kept eager for first paint). Shared chrome (Header with dropdown nav groups, CommandPalette, ItemHover, RankBadge, LineChart) lives in `src/shared/`.

Two global persisted filters gate the meta pages: the rank bracket (`src/lib/rankFilter.ts` + `RankFilterControl`) and the mode bracket (`src/lib/modeFilter.ts` + `ModeFilterControl`: all / ranked-only / Street Brawl). Both thread through the analytics fetchers as `min_average_badge` and `match_mode`/`game_mode` params — new analytics features should accept and forward them. Charts use the shared SVG `src/shared/LineChart.tsx` (same look as the match page's souls race); don't add a chart library.

Patch lists come from **our own** `functions/api/patches.ts`, not straight from the community API: `/v1/patches` mirrors the forum changelog and has run weeks behind (it sat at 06-30-2026 while four newer patches had shipped), while Steam's news feed only reaches back a few months. The function merges both by patch day and serves Valve's notes (`?gid=`); it has to run server-side because `api.steampowered.com` sends no CORS headers. The client falls back to the community feed alone when the function is unreachable (plain `vite dev`).

API quirks learned the hard way: `hero-synergy-stats` 500s without `min_matches` + a time filter; bucketed `item-stats` (`bucket=game_time_min`) 500s unfiltered — pass `include_item_ids` and trim client-side; `item-flow-stats` is flaky, avoid it; `/v1/builds` ids are not unique across languages; patch dates come from the `MM-DD-YYYY` in patch titles, not `pub_date` (the forum posts a patch weeks after its dated title). Demo queries are DataFusion: bare identifiers get lowercased, so **every mixed-case column must be double-quoted**; results are zstd-compressed NDJSON (hence the `fzstd` dependency — browsers cannot decode zstd); and entity `m_flCreateTime` is *round* time, not match clock, so it needs rebasing (the Mid-Boss now spawns at exactly 0:00, which makes it the anchor).

Match coverage: the API only knows matches whose metadata was ingested (auto for the ~top-200 spectateable games; everything else needs someone to submit that match's salts). `/upload` scans `Steam/appcache/httpcache` in the browser for `replay{cluster}.valve.net/1422450/{match}_{salt}.(meta|dem).bz2` URLs and POSTs them to `/v1/matches/salts` (pure logic in `src/lib/salts.ts`). The performance score/percentiles come from `analytics/player-stats/metrics` and `analytics/player-performance-curve` (resolution=2 → 2-minute buckets), player-vs-no-account_ids = player-vs-population (`src/lib/metrics.ts`).

### Timers domain

`src/features/timers/timerEngine.ts` is pure spawn-prediction logic: an `ObjectiveDef` has a `mode` — `info`, `interval` (fixed waves), `event` (respawn after player-recorded kill), or `ladder` (escalating respawn delays, e.g. Mid-Boss). An objective Valve deliberately jitters also carries `variance` (and `warning`): the Unstable Rift runs a ~7:00 cycle ±1:00, so `nextSpawn` returns `earliest`/`latest` alongside `spawnsAt` and the UI shows a window rather than pretending to know the second. Mobile alerts fire against `earliest`, since a windowed objective can arrive early. Objective definitions live in `src/data/timers.json`, **stamped with the patch they were verified against** — when Valve moves a timer, that JSON is the only thing to change. The match clock (`clock.ts` + `useMatchClock.ts`) persists to localStorage and can be seeded from a live match via `syncClockFromLive`.

### Auth (website only)

Steam OpenID via Cloudflare Pages Functions in `functions/api/auth/` (login, callback, logout, me) plus `resolve-vanity`. No database: the session is an HMAC-signed cookie (`functions/_shared/session.ts`) holding just the Steam account id, signed with the `SESSION_SECRET` env var (Pages project secret in prod, `.dev.vars` locally). The client reads it through `useSession()` in `src/lib/session.ts`; a 404 from `/api/auth/me` (plain `vite dev`) reads as signed out by design.

### PWA

`vite.config.ts` configures vite-plugin-pwa: autoUpdate, runtime caching for Deadlock art/asset endpoints and Google fonts, and `/api/` **denylisted from the SPA navigation fallback** — auth endpoints must never be served the app shell. Keep that denylist in mind when adding function routes.

### Web ↔ mobile duplication (important)

There is no shared package. The mobile app **copies** the website's logic files, and they must be kept in sync by hand:

| Website | Mobile copy |
|---|---|
| `src/features/timers/timerEngine.ts` | `mobile/src/lib/timerEngine.ts` |
| `src/features/timers/clock.ts` | `mobile/src/lib/clock.ts` |
| `src/lib/steamid.ts` | `mobile/src/lib/steamid.ts` |
| `src/data/timers.json` | `mobile/src/data/timers.json` (identical) |

`mobile/src/lib/api.ts` and `queries.ts` mirror the web data layer too. When editing any of these on one side, apply the same change on the other (the copies differ only in environment details like localStorage vs AsyncStorage).

### Mobile structure

expo-router file routes in `mobile/src/app/` — `(tabs)/` holds the five tabs (timers, match, heroes, items, players); `heroes/`, `items/`, `players/` hold detail screens. Theme tokens in `mobile/src/theme.ts`; notifications scheduling in `mobile/src/lib/notifications.ts`.

## Deployment

Cloudflare Pages: build `npm run build`, output `dist`. `public/_redirects` provides the SPA fallback; `SESSION_SECRET` must be set as a Pages secret or sign-in returns a 500 with instructions. Play Store metadata for the Android app lives in `mobile/store/`.
