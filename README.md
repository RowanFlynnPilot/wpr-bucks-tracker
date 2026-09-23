# wpr-bucks-tracker

Live Milwaukee Bucks tracker for **Wausau Pilot & Review** — a chart-led,
tabbed page covering the featured game (live score or countdown), auto-written
storylines, the games-above-.500 race chart, play-in odds, the Eastern
Conference standings, the schedule with TV listings and the injury report,
season stat leaders, and a film room that replays any game (win probability,
the turning point, the big runs, a shot chart). Embedded into the WPR WordPress
site via iframe from GitHub Pages.

Sibling of [`wpr-packers-tracker`](https://github.com/RowanFlynnPilot/wpr-packers-tracker)
and [`wpr-brewers-tracker`](https://github.com/RowanFlynnPilot/wpr-brewers-tracker),
built on the same architectural decision. Newsroom-facing docs live in
[`docs/HANDOFF.md`](docs/HANDOFF.md); the sales one-pager skeleton in
[`docs/SPONSOR_PITCH.md`](docs/SPONSOR_PITCH.md).

## How this differs from the other WPR widgets

Every scrape-fragile widget runs the standard pipeline: **Python scraper → GitHub
Actions cron → static JSON → React/Vite → Pages**. This one does **not**. ESPN's
site API (`site.api.espn.com`) and core API (`sports.core.api.espn.com`) are
public, stable, and CORS-open (`access-control-allow-origin: *`), so the widget
fetches them **directly in the browser**. No scraper, no cron-committed data.
The GitHub Action builds and deploys — its only schedule re-bakes the newsletter
**image** (see below), never data. This is deliberate — see `CLAUDE.md`.

Data sources (all browser-direct, keyless):

| Data | Endpoint |
|---|---|
| Schedule, venues, TV, NBA Cup tags | `site.api.espn.com/.../teams/15/schedule?season=…&seasontype=2\|3` |
| Standings, both conferences (records, splits, PPG) | `site.api.espn.com/apis/v2/.../standings?season=…` |
| Team leaders + per-athlete stat lines | `sports.core.api.espn.com/.../teams/15/leaders` + athlete/statistics `$ref` resolution |
| Injury report | `sports.core.api.espn.com/.../teams/15/injuries` + athlete `$ref` resolution |
| Film room (win prob, plays, shots, box) | `site.api.espn.com/.../summary?event=…`, per game on demand |
| WPR's own Bucks coverage | `wausaupilotandreview.com/wp-json/wp/v2/posts?categories=…` (WordPress REST) |

Leader athlete names come from resolving the core API's `$ref` links, **not** from
joining against the current roster — players dealt away mid-season (Giannis, 2025–26)
keep their season leads, and a roster join would silently drop them.

## Develop

```
npm install
npm run dev        # http://localhost:5173/wpr-bucks-tracker/
npm run build      # outputs to dist/
npm run preview    # serve the production build locally
```

Regenerate the share card / touch icon after a branding change:
`python scripts/og-card.py` (needs Pillow).

## Deploy

Push to `main`. The `Deploy to GitHub Pages` workflow builds and publishes
automatically; it also runs twice daily on a schedule purely to re-render the
newsletter digest image. In repo Settings → Pages, set the source to **GitHub
Actions** once.

Live URL: `https://rowanflynnpilot.github.io/wpr-bucks-tracker/`

## Embed

The tool is organized into tabs (Season / Schedule / Season stats / Film room)
and **auto-resizes**: it posts its height to the host page on every layout
change, so the iframe always fits with no inner scroll. Paste BOTH the iframe
and the script into a WordPress **Custom HTML** block:

```html
<iframe id="wpr-bucks" src="https://rowanflynnpilot.github.io/wpr-bucks-tracker/"
        style="width:100%;border:0;height:1600px" loading="lazy"
        allow="clipboard-write"
        title="The Bucks, by the numbers — live stats tracker"></iframe>
<script>
window.addEventListener('message', function (e) {
  if (e.origin !== 'https://rowanflynnpilot.github.io') return
  if (e.data && e.data.type === 'wpr-bucks-height') {
    var f = document.getElementById('wpr-bucks')
    if (f && e.data.height) f.style.height = e.data.height + 'px'
  }
})
</script>
```

The `height` in the style is a first-paint fallback (the script takes over once
it loads). `clipboard-write` lets the copy-link/share buttons work inside the
iframe. Deep links: append `?tab=schedule`, `?tab=leaders` (Season stats), or
`?tab=film` to the iframe `src` to open a specific tab — useful from game stories.

While a game is live the page refreshes every 60 seconds; at rest, every 2
minutes and whenever the reader returns to the tab — a page opened before
tip-off flips to Live on its own.

### Mini scoreboard (sidebar / in-article)

Featured-game card at `/mini.html` — live game (with quarter/clock) if one is
on, otherwise the next game, otherwise the last final. The whole card is a
link; `to` sets where a tap lands (https URLs only).

```html
<iframe src="https://rowanflynnpilot.github.io/wpr-bucks-tracker/mini.html?to=https://wausaupilotandreview.com/milwaukee-bucks/"
        style="width:100%;border:0;height:280px" loading="lazy"
        title="Bucks scoreboard — tap for the full tracker"></iframe>
```

### Mini standings (sidebar / in-article)

The East play-in field (top 10, plus the Bucks if they sit below it) at
`/mini-standings.html`. Same `to` + click behavior.

```html
<iframe src="https://rowanflynnpilot.github.io/wpr-bucks-tracker/mini-standings.html?to=https://wausaupilotandreview.com/milwaukee-bucks/"
        style="width:100%;border:0;height:560px" loading="lazy"
        title="East standings — tap for the full tracker"></iframe>
```

Each mini is its own Plausible page; clicks fire a `Mini Click` event tagged
with the `widget` (scoreboard/standings).

### Newsletter digest image

Email can't run an iframe, so the deploy bakes `/mini-digest.html` into a
static PNG at `/digest.png` (featured game + the play-in field), re-rendered on
every deploy and twice daily (~6:30 AM / ~3:30 PM Central) by the workflow
schedule. Embed snippet and ops notes: `docs/HANDOFF.md`. The renderer is
`scripts/render-digest.mjs` (Playwright, CI-only) — it snapshots an **image**
for email; it is not a data pipeline.

## Configure

Everything tweakable lives in `src/config.js`:

- **SEASON** — ESPN uses the season's *end* year; bump `2026 → 2027` when the
  2026–27 schedule publishes (October).
- **SPONSOR / SPONSOR_INQUIRY / SPONSOR_DISCLAIMER** — the title sponsor
  (currently Ho-Chunk Gaming Wittenberg; logo self-hosted in `public/`, never
  hot-linked). `null` shows the "sponsorship available" house card in both
  slots instead. The disclaimer rides in the footer for gaming sponsors.
- **WATCH_VENUES** — per-listing bar/restaurant cards in "Catch the games this
  week" (Schedule tab). Empty = section hidden. Append `?demo` to any URL for
  sales demo mode: open slots fill with "Your Brand Here" placeholders (sold
  slots never overridden; ordinary readers never see it).
- **WPR_NEWS** — WordPress REST base + the `milwaukee-bucks` category id that
  powers "From the newsroom".
- **TEAM_ID / TEAM_ABBR / VENUE / CENTRAL_RIVALS** — repoint at another NBA
  team if WPR ever wants a second tracker.
- **USE_TEAM_LOGO** — set `false` for a colors-only masthead (see trademark note).

## Analytics

Plausible (domain `rowanflynnpilot.github.io`, so embedded views report with
wausaupilotandreview.com as the source). Events: `Tab`, `Share`, `Calendar`,
`Mini Click`, `Coverage Click`, `Sponsor Click`, `Film Game`, `Bookmark`,
`Widget Error`.

## Trademark note

The Bucks logo and player headshots are referenced from ESPN's CDN, not
redrawn; the icon/OG art is a generic basketball. The footer carries a
non-affiliation line. A team mark on a sponsored surface can imply endorsement —
confirm before going paid, or set `USE_TEAM_LOGO = false` for a colors-only
header.

## If `.github/` or `.gitignore` went missing from the zip

Some Windows unzip tools strip dotfiles. If they're absent after extracting:
`.gitignore` should contain `node_modules`, `dist`, `.DS_Store`, `*.local`,
`.vite`. The workflow file is reproduced in `docs/deploy.yml.txt` as a backup.
