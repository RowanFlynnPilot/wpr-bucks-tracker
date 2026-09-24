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
- Charts are hand-rolled SVG (RaceChart, ScoreFlow, ShotChart). No chart library.
  Line charts draw at their container's real pixel width (`useChartWidth`) so
  text stays 11px on phones — never a fixed wide viewBox scaled down.

## Data layer (`src/api.js`, plus `src/wpr.js`)

- `fetchSchedule()` — regular season (type 2), **Play-In Tournament (type 5 —
  its own season type)** and playoffs (type 3), merged, date-sorted. Each event
  has a `stage`: `regular` | `cupFinal` | `playIn` | `playoffs` (the NBA Cup
  championship arrives in type 2 but carries competition type
  `commissioners-cup` and does NOT count in the standings). **Only `regular`
  games count toward the record** — the race chart, recap records/streaks,
  season series, VsCentral and calendar facts all filter on it; playoff games
  carry series context instead. `neutral` marks Cup games in Las Vegas (a
  designated "home" there is not a Fiserv Forum date). Postponed/canceled —
  anything ESPN closes out without completing — is filtered at this boundary.
  Events carry venue, the Bucks-market/national TV feed (national streaming
  exclusives count), NBA Cup notes, live period/clock and `detail` (ESPN's
  short detail, which names breaks: "Halftime", "End of 3rd" — `liveLabel()`).
  Empty play-in/playoff arrays are data, not errors. Liveness is
  `status.type.state === 'in'` (halftime is still "in").
  **Live scores come from the league scoreboard, not the schedule:** ESPN's team
  schedule drops a game's score while the clock runs (seen on live WNBA/MLB
  games from the same API), so `withLiveScores` overlays score + status from
  `scoreboard?dates=<US Eastern date>` for any live event, and throws if the
  live game is missing there.
  The season label comes from `requestedSeason.displayName`, never the
  top-level `season` block — that one is the league's *current* season and
  flips every September, mislabeling the old season's data until `SEASON` is
  bumped.
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
  in a module Map: linescores, the score-flow timeline (Bucks margin on a real
  elapsed-time axis — the actual scoreboard, deliberately not ESPN's win-prob
  model), chartable shots with shooter ids (free throws carry INT_MIN sentinel
  coords — filtered), scoring plays for runs, game leaders, team stats, and the
  Bucks player box (ids match play participants).
- `fetchPlayerSeason(athleteId)` — season averages per athlete (cached), for
  the stat sheets that unfold under box-score rows.
- `src/wpr.js` — WPR's own Bucks coverage via WordPress REST (third external
  API, same rules: browser fetch, keyless, CORS-open). Coverage is an
  enhancement: the section renders nothing on failure.

## Season rollover

`SEASON` in `src/config.js` is the season's ESPN end-year (2027 = 2026–27).
ESPN's default (no-param) schedule call returns an empty postseason in the
offseason, which is why the season is explicit config, not auto-detected.
Bump it when ESPN publishes the next schedule (the 2026–27 one appeared in
mid-September). Between the bump and opening night ESPN serves real-but-empty
data, and the tracker is built for it — `isPreseason()` in
`src/scheduleFacts.js` drives the preseason views:
- Standings: every team 0–0, `playoffSeed` 0 (normalized to `null`, sorted
  alphabetically), and **no "Last Ten Games" stat at all** (normalized to 0-0
  only for teams that haven't played — a missing last-ten after games throws).
  The Season tab hides the table; the minis show the alphabetical East.
- Leaders: ESPN 404s the new season's leaders, so Season stats shows last
  season's final board, labeled; TeamProfile ranks (all ties) are hidden.
- The pulse becomes "The season ahead" (opener, countdown, dates set, home
  dates, back-to-backs); the race chart and play-in odds wait for results;
  VsCentral counts meetings; RoadAhead shows dates instead of 0–0 records.

## Headless browsers vs ESPN

Since ~Aug 2026 ESPN's edge refuses headless Chromium (403 without CORS
headers — pages see "Failed to fetch"); real browsers are fine. A spoofed user
agent does not get past it. Anything that drives the widget headlessly —
`scripts/render-digest.mjs`, Playwright screenshot/verification scripts — must
relay `*.espn.com` requests through Node's `fetch` with `page.route` and add
`access-control-allow-origin: *` (see the render script). If the deploy's
`digest-alert` job goes red, this is the first thing to check.

## Surfaces

- `index.html` — full tracker, tabs: Season / Schedule / Season stats (`leaders`)
  / Film room (`film`). Tab **ids** are stable — they key `?tab=` deep links and
  Plausible events; labels can change. `?game=<event-id>` deep-links a specific
  film-room box score (invalid ids fall back to the latest final). Posts
  `wpr-bucks-height` to the parent on every layout change (ResizeObserver on
  `body`), and the value must be the CONTENT height
  (`body.getBoundingClientRect().height`): inside an iframe,
  `documentElement.scrollHeight` never drops below the iframe's own height, so
  it only ever ratchets up and leaves blank bands on the WPR page.
- `src/recaps.js` — 1–2 sentence game recaps generated from the schedule alone
  (margin buckets × seeded template banks; hash of the game id keeps each
  game's wording stable across renders). Every claim must stay derivable from
  real data — score, margin, OT, home/road, running record, streaks. Surfaced
  on schedule rows, the hero, and the film room.
- `mini.html` — featured-game card (live > next > last final). `?to=` sets tap
  destination (https-only, guarded in `mini-shared.js`).
- `mini-standings.html` — East play-in field, Bucks always included.
- `mini-digest.html` — the email snapshot (featured game + play-in field),
  rendered to `digest.png` by `scripts/render-digest.mjs` in CI. `?image=1`
  drops the CTA. It renders into a JS-less newsletter, so keep it self-contained.

## Refresh & live behavior (index + minis)

One hook, `useRefreshingData(loader, isLive, restMs)`, drives the tracker and
both live minis (the digest is a one-shot render). Always-on refresh: every
120s at rest (mini standings: 10 min), 60s while any event is live, plus a
refetch on `visibilitychange` — so a page (or sidebar card) opened before
tip-off flips to Live without a reload. Responses are sequence-numbered so a
tab-return load racing a timer load can't land older data over newer.
Deliberate exception to fail-loud: once data has rendered, a **failed refresh**
keeps the last good data on screen and logs to console — replacing a working
scoreboard with an error over one transient blip mid-game is worse than
briefly stale numbers. The **initial** load still fails loud with a visible
error (and self-retries on the next tick). `ErrorBoundary` catches render
throws only; feed failures are handled at the fetch sites.

With nothing left on the schedule, `postseasonState()` decides between "season
over" and "the next play-in game / playoff round isn't posted yet" (the NBA
sets them a day or two out) — never assume no upcoming games means done.

## Sponsorship & product surfaces

`SPONSOR` in config is the title sponsor (SOLD: Ho-Chunk Gaming Wittenberg,
2026–27), rendered in both title slots (`top` in the banner, `season`
mid-Season-tab). A sold lockup is **always a white card** — sponsor art is
drawn for white — with the tagline split at the em-dash, a Directions chip
(role="button" span inside the card link; nested anchors are invalid), a
UTM-tagged `rel="sponsored"` click-through, and `SPONSOR_DISCLAIMER` in the
footer while a gaming brand holds the title. **Sponsor art is self-hosted from
`public/`** — WPR's media CDN migration (Sept 2026) 404'd hot-linked uploads on
the Brewers tracker. `null` renders the "sponsorship available" house card
instead — unsold inventory should be visible, not hidden. `WATCH_VENUES`
(per-listing bar/restaurant cards, "Catch the games this week" atop the
Schedule tab) renders nothing while empty — readers never see an empty shelf.
Clicks track per-slot. **Sales demo mode:** `?demo` (`DEMO_MODE`) fills open
slots with placeholders at module load in config.js and shows a preview ribbon
(sold slots never overridden — the exports are `let` for exactly this reason;
same pattern as the Brewers/Packers). `docs/HANDOFF.md` is the newsroom
runbook; `docs/SPONSOR_PITCH.md` the sales skeleton. Keep both current when
surfaces change.

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
games-above-.500 race chart and the film room's score-flow chart (the real
margin, stepped, green above the hardwood line and rust below), both over
hardwood-toned `#b8905a` accents. Icon/OG art is a generic basketball — no team marks (trademark note
in README).

## Environment

Rowan works on Windows / PowerShell 5.1 (`C:\Users\rpfly\Projects\`,
semicolon command chaining, `python -m pip`). GitHub: `RowanFlynnPilot`.
