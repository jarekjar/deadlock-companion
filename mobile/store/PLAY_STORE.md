# Play Store release guide

Everything needed to ship The Cursed Apple to Google Play. The signed
release bundle lives at `android/app/build/outputs/bundle/release/app-release.aab`
after `npm run aab` (or rebuild any time — signing is wired into the checked-in
scripts and survives `npm run prebuild:android`).

## Signing — read this first

- Upload keystore: `credentials/upload-keystore.jks` (alias `upload`),
  passwords in `credentials/keystore.properties`. Both are **gitignored — back
  them up somewhere safe** (password manager + a second location). If the
  upload key is lost you can ask Google to reset it, but it's a support
  process you don't want.
- Google Play App Signing is mandatory for new apps: Google holds the *app*
  signing key; our keystore is only the *upload* key. Accept the default
  ("Use Google-generated key") when creating the app.

## Store listing copy

**App name (30 chars max):** `The Cursed Apple`

**Short description (80 chars max):**
`Unofficial Deadlock companion: spawn timers, matchups, builds, and item stats`

**Full description:**

```
The Cursed Apple is an unofficial companion app for Valve's Deadlock — the
full hero and item meta in your pocket, and a spawn tracker built to sit next
to your keyboard while you play.

SPAWN TIMERS
Start the match clock at the horn (or sync it mid-game) and get a countdown
for every objective — Mid Boss, Urn, buffs, camps, and more. Turn on spawn
alerts and your phone buzzes before each spawn, even with the screen off.

MY MATCH
Pick your hero and add enemies as the draft reveals them. See your matchup
win rate against each enemy and the counter items that actually win the
matchup, ready before the game starts.

HEROES
Win rates, pick rates, abilities, typical build paths, popular items by tier,
and the matchups that matter — for every hero, updated from the last 30 days
of real matches.

ITEMS
Every shop item with what it does, who buys it most, and how often it wins.
Filter by slot, sort by usage, win rate, price, or name.

PLAYERS
Look up any player by Steam link, ID, or name — rank, stats, favorite
heroes, and full match history. Favorite the people you play with.

Stats come from the community-run Deadlock API and cover the last 30 days
across all ranks. No account needed, no ads, no tracking.

The Cursed Apple is a fan project. It is not affiliated with or endorsed by
Valve Corporation. Deadlock and Steam are trademarks of Valve Corporation.
```

## Assets (in this folder)

| File | Purpose | Requirement |
|---|---|---|
| `icon-512.png` | App icon | 512×512 PNG, <1 MB |
| `feature-graphic.png` | Feature graphic | 1024×500 PNG |
| `screenshots/*.png` | Phone screenshots ×6 | 1080×2160 (within the 2:1 max aspect) |

Privacy policy URL: `https://thecursedapple.app/privacy`

## Console walkthrough

1. **Developer account** — [play.google.com/console/signup](https://play.google.com/console/signup),
   personal account, one-time $25 fee, identity verification required.
   ⚠️ Personal accounts created after Nov 13, 2023 must run a **closed test
   with at least 12 testers opted in for 14 consecutive days** before they can
   apply for production access. Plan for this: internal testing → closed
   testing with 12+ friends/guildmates → apply for production. Accounts
   created before that date (and org accounts) can go straight to production.
2. **Create app** — "The Cursed Apple", App (not game — or Game > Casual if
   you prefer; "App > Entertainment" or "Sports" also work, Tools is fine),
   Free. Free apps cannot later become paid.
3. **App content** (Policy > App content) — complete every declaration:
   - Privacy policy: `https://thecursedapple.app/privacy`
   - Ads: **No ads**
   - App access: **All functionality is available without special access**
     (no login)
   - Content rating (IARC questionnaire): reference/utility app; no
     user-generated content, no gambling, no violence *in the app itself*
     (screenshots show stylized game art — answer the "violence" questions
     honestly re: depictions; expect an Everyone/Teen rating)
   - Target audience: **13+** (do not tick under-13 — avoids Families policy)
   - News app: No · COVID-19 app: No · Data safety: see below
   - Government app: No · Financial features: None · Health: None
4. **Data safety form** — the app collects nothing and shares nothing:
   - "Does your app collect or share any of the required user data types?" → **No**
   - Rationale: no accounts, no analytics, no ads SDKs; preferences stay on
     device; searches go to the community API but are not collected/stored by
     us. Encryption in transit: yes (all endpoints are HTTPS).
5. **Testing track** — Test and release > Testing > Internal testing first:
   upload `app-release.aab`, add your own Gmail as a tester, install via the
   opt-in link and sanity-check. Then Closed testing for the 12×14 requirement
   if your account needs it.
6. **Store listing** — paste the copy above, upload icon, feature graphic,
   and the 6 screenshots. Contact email is public — use whichever you're
   comfortable exposing.
7. **Production** — once eligible: Production > Create release > upload the
   same AAB (or promote from testing), release notes, roll out. First review
   typically takes a few days.

## Version bumps

For each new upload: bump `expo.android.versionCode` (+1 every upload, Play
rejects reuse) and `expo.version` (user-facing) in `app.json`, then
`node scripts/patch-android-release.mjs && npm run aab` (or full
`npm run prebuild:android` if native config changed).

## Content/IP note

This is an unofficial fan app using Deadlock hero/item art served by the
community API. Valve has historically tolerated fan projects (see their
fan-content guidelines), but a takedown request would have to be honored —
the disclaimer in the description and privacy policy is there to make the
unofficial status unambiguous.
