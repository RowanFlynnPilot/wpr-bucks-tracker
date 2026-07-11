# CLAUDE.md — wpr-bucks-tracker

Live Milwaukee Bucks tracker for Wausau Pilot & Review. React/Vite → GitHub
Pages → WordPress iframe embed. Sibling of `wpr-brewers-tracker` and
`wpr-packers-tracker` (the feature benchmark).

## The architectural decision (do not "fix" this)

There is **no Python scraper, no cron-committed JSON** in this repo, and that is
deliberate. ESPN's site API and core API are public, stable, and CORS-open, so
all data is fetched **directly in the browser** at page load. The standard WPR
pipeline (scraper → Actions cron → static JSON) exists for scrape-fragile
sources; ESPN is not one. Adding a caching layer here would be overengineering.
The GitHub Action builds and deploys; its twice-daily schedule exists **only**
to re-render the newsletter digest **image** (`dist/digest.png`, baked at build
time, never committed) — email can't run the live widget. An image for email is
not a data cache; don't let it become one.

## Engineering rules (house style — applies to every change)

- One correct path, no fallbacks. `api.js` throws on any bad response.
- Fail fast and loud. No silent defaults, no swallowed errors.
- Surgical, single-responsibility changes. Fix root causes, not symptoms.
- No overengineering. If ESPN's response shape changes, fix the normalizer —
  don't add defensive layers around it.
- Charts are hand-rolled SVG (RaceChart, GameFlow, ShotChart). No chart library.

## Data layer (`src/api.js`, plus `src/wpr.js`)

- `fetchSchedule()` — regular season (type 2) + postseason (type 3), merged,
  date-sorted. Postponed/canceled events are filtered at this boundary. Events
  carry venue, the Bucks-market/national TV feed, NBA Cup notes, and live
  period/clock. An empty postseason array is data (missed the playoffs), not an
  error. Liveness is `status.type.state === 'in'` (halftime is still "in").
- `fetchStandings()` — **both** conferences `{ east, west }`, seed-sorted, with
  home/road/division splits and PPG for/against. East renders the table; the
  league-wide rows feed hero opponent context, TeamProfile ranks, RoadAhead.
- `fetchLeaders()` — core API team leaders. Athlete names/headshots/stat lines
  come from resolving each leader's `$ref` (and its `statistics.$ref`), **never**
  from joining the current roster: the roster only holds current players, and
  mid-season departures keep their season leads (Giannis led 2025–26 FG% after
  being traded — the ref approach renders him; a roster join drops him silently).
- `fetchInjuries()` — core API injuries, athlete refs resolved. Empty = healthy.
- `fetchGameDetail(eventId)` — the summary endpoint, per game on demand, cached
  in a module Map: linescores, win probability (Bucks perspective), the turning
  point (max WP swing), chartable shots (free throws carry INT_MIN sentinel
  coords — filtered), scoring plays for runs, game leaders, team stats.
- `src/wpr.js` — WPR's own Bucks coverage via WordPress REST (third external
  API, same rules: browser fetch, keyless, CORS-open). Coverage is an
  enhancement: the section renders nothing on failure.

## Season rollover

`SEASON` in `src/config.js` is the season's ESPN end-year (2026 = 2025–26).
ESPN's default (no-param) schedule call returns an empty postseason in the
offseason, which is why the season is explicit config, not auto-detected.
Bump to 2027 when the 2026–27 schedule publishes (~October).

## Surfaces

- `index.html` — full tracker, tabs: Season / Schedule / Season stats (`leaders`)
  / Film room (`film`). Tab **ids** are stable — they key `?tab=` deep links and
  Plausible events; labels can change. Posts `wpr-bucks-height` to the parent on
  every layout change (ResizeObserver).
- `mini.html` — featured-game card (live > next > last final). `?to=` sets tap
  destination (https-only, guarded in `mini-shared.js`).
- `mini-standings.html` — East play-in field, Bucks always included.
- `mini-digest.html` — the email snapshot (featured game + play-in field),
  rendered to `digest.png` by `scripts/render-digest.mjs` in CI. `?image=1`
  drops the CTA. It renders into a JS-less newsletter, so keep it self-contained.

## Refresh & live behavior (index + minis)

Always-on refresh: every 120s at rest, 60s while any event is live, plus a
refetch on `visibilitychange` — so a page opened before tip-off flips to Live
without a reload. Deliberate exception to fail-loud: once data has rendered, a
**failed refresh** keeps the last good data on screen and logs to console —
replacing a working scoreboard with an error over one transient blip mid-game
is worse than briefly stale numbers. The **initial** load still fails loud with
a visible error (and self-retries on the next tick). `ErrorBoundary` catches
render throws only; feed failures are handled at the fetch sites.

## Sponsorship & product surfaces

`SPONSOR` in config: `null` renders the "sponsorship available" house card in
both slots (`top` in App, `season` mid-Season-tab) — unsold inventory should be
visible, not hidden. `WATCH_VENUES` (per-listing bar/restaurant cards, "Catch
the games this week" atop the Schedule tab) renders nothing while empty —
readers never see an empty shelf. Clicks track per-slot. **Sales demo mode:**
`?demo` fills open slots with placeholders at module load in config.js (sold
slots never overridden — the exports are `let` for exactly this reason; same
pattern as the Brewers/Packers). `docs/HANDOFF.md` is the newsroom runbook;
`docs/SPONSOR_PITCH.md` the sales skeleton. Keep both current when surfaces
change.

## Design system

WPR system, non-negotiable: Fraunces (display), Public Sans (body),
JetBrains Mono (data), WPR teal `#3A867C` for publication branding only
(light sponsor-band chrome). Team accent: Bucks green `#00471B`; backgrounds
blend WPR cream `#F6F2E9` with Bucks cream `#EEE1C6`.

The page grammar (deliberate, keep it): a dateline row, then the full-bleed
deep-green masthead **banner** (cream kicker/dek on Bucks green, sponsor panel
embedded dark-variant), then open editorial **Sections** — hardwood `#96703f`
small-caps kicker over a big Fraunces headline, sitting on the page background.
Boxes (`.card`) are reserved for genuinely tabular content (standings,
linescore, team stats, injury list); everything else runs open so the page
doesn't read as a stack of rectangles. Signature elements: the two-tone
games-above-.500 race chart and the film room's win-probability chart (green
above the line, rust below, swing dots), both over hardwood-toned `#b8905a`
accents. Icon/OG art is a generic basketball — no team marks (trademark note
in README).

## Environment

Rowan works on Windows / PowerShell 5.1 (`C:\Users\rpfly\Projects\`,
semicolon command chaining, `python -m pip`). GitHub: `RowanFlynnPilot`.
