# CLAUDE.md — wpr-bucks-tracker

Live Milwaukee Bucks tracker for Wausau Pilot & Review. React/Vite → GitHub
Pages → WordPress iframe embed. Sibling of `wpr-brewers-tracker`.

## The architectural decision (do not "fix" this)

There is **no Python scraper, no cron-committed JSON** in this repo, and that is
deliberate. ESPN's site API and core API are public, stable, and CORS-open, so
all data is fetched **directly in the browser** at page load. The standard WPR
pipeline (scraper → Actions cron → static JSON) exists for scrape-fragile
sources; ESPN is not one. Adding a caching layer here would be overengineering.
The only GitHub Action builds and deploys.

## Engineering rules (house style — applies to every change)

- One correct path, no fallbacks. `api.js` throws on any bad response.
- Fail fast and loud. No silent defaults, no swallowed errors.
- Surgical, single-responsibility changes. Fix root causes, not symptoms.
- No overengineering. If ESPN's response shape changes, fix the normalizer —
  don't add defensive layers around it.

## Data layer (`src/api.js`)

- `fetchSchedule()` — regular season (type 2) + postseason (type 3), merged,
  date-sorted. Postponed/canceled events are filtered at this boundary
  (ESPN leaves postponed shells in the schedule — e.g. MIL/DAL Jan 2026).
  An empty postseason array is data (missed the playoffs), not an error.
- `fetchStandings()` — Eastern Conference entries, sorted by playoff seed.
- `fetchLeaders()` — core API team leaders. Athlete names/headshots come from
  resolving each leader's `$ref`, **never** from joining the current roster:
  the roster only holds current players, and mid-season departures keep their
  season leads (Giannis led 2025–26 FG% after being traded — the ref approach
  renders him; a roster join drops him silently).

## Season rollover

`SEASON` in `src/config.js` is the season's ESPN end-year (2026 = 2025–26).
ESPN's default (no-param) schedule call returns an empty postseason in the
offseason, which is why the season is explicit config, not auto-detected.
Bump to 2027 when the 2026–27 schedule publishes (~October).

## Surfaces

- `index.html` — full tracker, tabs: Season / Schedule / Leaders. Posts
  `wpr-bucks-height` to the parent on every layout change (ResizeObserver).
- `mini.html` — featured-game card (live > next > last final). `?to=` sets tap
  destination.
- `mini-standings.html` — East play-in field, Bucks always included.

## Live-game polling (index + mini)

While any event is `live`, the page refetches every 60s via a self-sustaining
setTimeout chain that terminates at the final buzzer. Deliberate exception to
fail-loud: a **failed poll** keeps the last good data on screen and logs to
console — replacing a working scoreboard with an error over one transient blip
mid-game is worse than briefly stale numbers. The **initial** load still fails
loud with a visible error.

## Design system

WPR system, non-negotiable: Fraunces (display), Public Sans (body),
JetBrains Mono (data), WPR teal `#3A867C` for publication branding only.
Team accent: Bucks green `#00471B`; backgrounds blend WPR cream `#F6F2E9`
with Bucks cream `#EEE1C6`. Signature element: the games-above-.500 race
chart with a hardwood-toned `.500` baseline.

## Environment

Rowan works on Windows / PowerShell 5.1 (`C:\Users\rpfly\Projects\`,
semicolon command chaining, `python -m pip`). GitHub: `RowanFlynnPilot`.
