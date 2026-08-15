# The Cursed Apple — Mobile

The Android companion app for [thecursedapple.app](https://thecursedapple.app), built with
Expo / React Native. It shares the website's data layer (the community Deadlock API) but is
designed for the phone: bottom-tab navigation, card layouts, and native spawn-alert
notifications that fire even with the screen off.

## Tabs

- **Timers** — the match clock and every objective countdown (camps, Sinner's Sacrifice,
  bridge buffs, Mid-Boss ladder, Soul Urn), with scheduled notifications so the phone
  buzzes before each spawn while you play on PC.
- **My Match** — the prep board: pick your hero and the enemy team for matchup win rates,
  counter items, and lane tracking.
- **Heroes** — 30-day win/pick rates, lore, abilities, typical build path, popular items
  by tier, and best/worst matchups.
- **Items** — every shop item with usage, win rate, and who buys it most.
- **Players** — look up anyone by Steam link, ID, or name, with profile tabs: a performance
  score with percentile placement against every tracked player, an economy view (souls curves
  and farm sources versus the field, with coaching notes), per-hero stats, rank history,
  performance trends, and the teammates and nemeses they keep running into.

A **Build Library** (the community's most-favorited in-game builds, with the authors' notes)
is reachable from the home screen and from every hero page, and an all/ranked/brawl mode
filter scopes the stats everywhere.

There is no Steam sign-in in the app — profile lookups work for any player without it.

## Development

```sh
npm install
npx expo start          # Metro dev server (use a dev build or emulator)
```

## Building an APK

The `android/` folder is generated, not committed (Expo prebuild). On Windows the
generated project needs three fixes (64-bit ABIs only, short CMake staging paths,
CMake ≥ 3.31 — the SDK's 3.22 loops forever on ninja regeneration), applied by
`scripts/patch-android-windows.mjs`:

```sh
npm run prebuild:android   # expo prebuild + Windows patches
npm run apk                # -> android/app/build/outputs/apk/release/app-release.apk
```

Requires JDK 17+ and the Android SDK (`ANDROID_HOME`), with `cmake;3.31.6`
installed via sdkmanager. The release build signs with the debug keystore —
fine for sideloading, replace with a real keystore for the Play Store.

## Data

All stats come from the community [Deadlock API](https://deadlock-api.com). Spawn timings
live in `src/data/timers.json`, patch-stamped — keep in sync with the website's copy when
patches move the numbers.
