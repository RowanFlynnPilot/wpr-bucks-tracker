# Bucks tracker — handoff notes

Everything the newsroom needs to run this without touching code. Live at
<https://rowanflynnpilot.github.io/wpr-bucks-tracker/>. Technical background
is in `README.md`; the non-negotiable architecture decision is in `CLAUDE.md`.

## The four surfaces

| Surface | URL | Where it goes |
|---|---|---|
| Full tracker | `/wpr-bucks-tracker/` | The Bucks page — iframe, auto-resizes |
| Mini scoreboard | `/wpr-bucks-tracker/mini.html` | Sidebar / in-article card |
| Mini standings | `/wpr-bucks-tracker/mini-standings.html` | Sidebar / in-article card |
| Email digest image | `/wpr-bucks-tracker/digest.png` | Newsletter `<img>` — re-baked ~6:30 AM & ~3:30 PM Central |

Embed snippets for all of them are in `README.md` (copy-paste into a WordPress
**Custom HTML** block). Two behaviors worth knowing:

- **Deep links:** `/?tab=schedule`, `/?tab=leaders` (Season stats), `/?tab=film`
  open a specific tab — link them from game stories. A specific box score is
  `/?tab=film&game=<espn-event-id>` (every result row links there; copy the URL
  after clicking any game).
- **Minis:** add `?to=https://wausaupilotandreview.com/milwaukee-bucks/` so a tap
  lands on the WPR Bucks page instead of the bare tracker. https URLs only.

## Newsletter digest

Embed in email as a plain image + a real text link under it:

```html
<a href="https://wausaupilotandreview.com/milwaukee-bucks/">
  <img src="https://rowanflynnpilot.github.io/wpr-bucks-tracker/digest.png"
       width="420" alt="Bucks digest — score, standings" style="width:100%;max-width:420px" />
</a>
<p><a href="https://wausaupilotandreview.com/milwaukee-bucks/">Full Bucks tracker →</a></p>
```

The image re-bakes twice daily (before the morning and afternoon sends) via the
deploy workflow. If it ever looks stale, run the **Deploy to GitHub Pages** action
manually (Actions tab → Run workflow) — that re-renders it.

## The title sponsorship (SOLD — Ho-Chunk Gaming Wittenberg)

`src/config.js` → `SPONSOR` holds the title sponsor; both title slots (the
masthead banner and the mid-page band on the Season tab) render the same
lockup — logo on a white card, "800+ slots · Hotel · Dining" over "Wittenberg,
WI", a Directions chip (Apple Maps on iPhones/Macs, Google Maps elsewhere), and
a UTM-tagged click-through. `SPONSOR_DISCLAIMER` puts the 21+ / 1-800-GAMBLER
line in the footer; it travels with a gaming sponsor and comes out (set it to
`''`) if the title ever goes to a non-gaming brand.

To change sponsors, edit the object:

```js
export let SPONSOR = {
  name: 'Sponsor Name',
  logo: `${import.meta.env.BASE_URL}sponsor-logo.png`,  // a file in public/ — see below
  url: 'https://sponsor.example.com/?utm_source=wausaupilotandreview&utm_medium=widget&utm_campaign=bucks_tracker',
  tagline: 'What they offer — Where they are',           // splits at the em-dash
  address: '123 Main St, Wausau, WI 54401',              // optional — powers Directions
}
```

**Logos live in `public/`, never hot-linked.** WPR's media library moved to a
CDN in September 2026 and hot-linked upload URLs went dead on the Brewers
tracker mid-season. Drop the file in `public/`, reference it as above, and
note the original URL in a comment for provenance.

Push to `main`; the deploy is automatic. Clicks report to Plausible as
`Sponsor Click` with the slot (`top` / `season`) and `action: directions` for
the maps chip. **Trademark:** see the note in `README.md` — the sponsor sits
beside the Bucks logo in the banner; `USE_TEAM_LOGO = false` swaps in a
colors-only mark if that ever needs to change.

## Selling Where-to-Watch listings (bars & restaurants)

"Catch the games this week" at the top of the Schedule tab is a game-night
venue guide, **sold per listing** — separate inventory from the title
sponsorship. `src/config.js` → `WATCH_VENUES`; each listing:

```js
{
  name: 'The Bar Name',
  tagline: 'One italic line about the room',
  images: ['https://…/hero.jpg', 'https://…/thumb1.jpg'],  // first = big photo
  url: 'https://thebar.example.com',       // "Menu & info →", tracked
  address: '123 Third St, Wausau',
  phone: '715-555-0100',
  features: ['12 HDTVs', 'Full bar & patio'],   // amenity chips
  specials: ['$3 Wisconsin taps'],              // game-day specials bullets
}
```

While the array is empty the section doesn't render at all — readers never see
an empty shelf. Venue clicks report as `Sponsor Click` with slot
`where-to-watch`.

## Showing a prospect (sales demo mode)

Append **`?demo`** to any tracker URL and every *unsold* slot fills with a
"Your Brand Here" / "Your Bar Here" placeholder on the otherwise-live page —
real scores, their name on the marquee. Sold slots are never overridden, and
ordinary readers never see placeholders. The link to send:

> **https://rowanflynnpilot.github.io/wpr-bucks-tracker/?demo&tab=schedule**

(Same pattern as the Brewers and Packers trackers.)

## Season rollover (once a year, ~October)

When the NBA publishes the new schedule, bump `SEASON` in `src/config.js`
(ESPN uses the season's **end** year: 2026–27 season = `2027`), push to `main`.
Everything else follows the config.

## What reports to Plausible

`Tab` (tab opens), `Share`, `Calendar` (add-to-calendar), `Mini Click`,
`Coverage Click` (newsroom links), `Sponsor Click`, `Box Score` (game clicks
into the film room, tagged `schedule`/`hero`), `Film Game` (film-room game
picks), `Player Card` (box-score row opens), `Shot Filter` (shot-chart player
picks), `Bookmark` (copy link), `Widget Error` (render failures — should be ~0).
Dashboard: plausible.io, site `rowanflynnpilot.github.io`.

## If something looks wrong

- **Widget shows an error on load** — ESPN blip; it retries itself every 2
  minutes. A reload usually clears it immediately.
- **Score seems stale during a game** — it refreshes every 60s while live; check
  the "Updated X min ago" stamp under the masthead.
- **A postponed game shows up / a game is missing** — ESPN sometimes leaves
  postponed shells in the schedule; the tracker filters `STATUS_POSTPONED` and
  `STATUS_CANCELED`. If ESPN mislabels one, it clears when they fix their feed.
- **Injury report or newsroom section missing** — both fail silent by design
  (they're enhancements); they return when the feed does.
