# wpr-bucks-tracker

Live Milwaukee Bucks stats widget for **Wausau Pilot & Review** — a single-scroll,
chart-led page covering the season pulse, the games-above-.500 race chart, the
Eastern Conference standings, the schedule, and team leaders. Embedded into the
WPR WordPress site via iframe from GitHub Pages.

Sibling of [`wpr-brewers-tracker`](https://github.com/RowanFlynnPilot/wpr-brewers-tracker)
and built on the same architectural decision.

## How this differs from the other WPR widgets

Every scrape-fragile widget runs the standard pipeline: **Python scraper → GitHub
Actions cron → static JSON → React/Vite → Pages**. This one does **not**. ESPN's
site API (`site.api.espn.com`) and core API (`sports.core.api.espn.com`) are
public, stable, and CORS-open (`access-control-allow-origin: *`), so the widget
fetches them **directly in the browser**. No scraper, no cron, no committed JSON.
The only GitHub Action here builds and deploys. This is deliberate — see `CLAUDE.md`.

Data sources:

| Data | Endpoint |
|---|---|
| Schedule & results | `site.api.espn.com/.../teams/15/schedule?season=…&seasontype=2\|3` |
| East standings | `site.api.espn.com/apis/v2/.../standings?season=…` |
| Team leaders | `sports.core.api.espn.com/.../seasons/…/types/2/teams/15/leaders` + athlete `$ref` resolution |

Leader athlete names come from resolving the core API's `$ref` links, **not** from
joining against the current roster — players dealt away mid-season (a live issue
in 2025–26) keep their season leads, and a roster join would silently drop them.

## Develop

```
npm install
npm run dev        # http://localhost:5173/wpr-bucks-tracker/
npm run build      # outputs to dist/
npm run preview    # serve the production build locally
```

## Deploy

Push to `main`. The `Deploy to GitHub Pages` workflow builds and publishes
automatically. In the repo Settings → Pages, set the source to **GitHub Actions** once.

Live URL: `https://rowanflynnpilot.github.io/wpr-bucks-tracker/`

## Embed

The tool is organized into tabs (Season / Schedule / Leaders) and **auto-resizes**:
it posts its height to the host page on every layout change, so the iframe always
fits the active tab with no inner scroll. Paste BOTH the iframe and the script into
a WordPress **Custom HTML** block:

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

The `height` in the style is a first-paint fallback (the script takes over once it
loads). `clipboard-write` lets the copy-link button work inside the iframe.
Embedded views are tracked in Plausible with wausaupilotandreview.com as the
source; tab switches fire a `Tab` event and the copy-link button fires `Bookmark`.

### Mini scoreboard (sidebar / in-article)

A compact featured-game card at `/mini.html` — live game if one is on, otherwise
the next game, otherwise the last final. The whole card is a link; the `to`
parameter sets where a tap lands.

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

Each mini is its own Plausible page; clicks fire a `Mini Click` event tagged with
the `widget` (scoreboard/standings).

## Configure

Everything tweakable lives in `src/config.js`: **SEASON** (ESPN uses the season's
end year — bump `2026 → 2027` when the 2026–27 schedule publishes in October),
team, playoff/play-in lines, sponsor strings, and `USE_TEAM_LOGO`. To repoint at
a different NBA team, change `TEAM_ID` and `TEAM_ABBR`.

## Trademark note

The Bucks logo and player headshots are referenced from ESPN's CDN, not redrawn.
The footer carries a non-affiliation line. A team mark on a sponsored surface can
imply endorsement — confirm before going paid, or set `USE_TEAM_LOGO = false` for
a colors-only header.

## Not ported yet from the Brewers tracker

- **Newsletter digest PNG** — the Brewers repo renders `mini-digest.html` to a
  static image on a cron for Devon's email newsletter. Port `scripts/render-digest.mjs`
  and the two `cron` lines from that repo's workflow when a Bucks digest is wanted.
- **Strikeout-tracker analog** — a per-game shot chart mini would be the basketball
  equivalent; ESPN's summary endpoint exposes play-by-play with shot coordinates.

## If `.github/` or `.gitignore` went missing from the zip

Some Windows unzip tools strip dotfiles. If they're absent after extracting:
`.gitignore` should contain `node_modules`, `dist`, `.DS_Store`, `*.local`, `.vite`.
The workflow file is reproduced in `docs/deploy.yml.txt` as a backup.
