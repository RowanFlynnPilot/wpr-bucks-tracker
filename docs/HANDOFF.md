# Bucks tracker — handoff notes

Everything the newsroom needs to run this without touching code. Live at
<https://rowanflynnpilot.github.io/wpr-bucks-tracker/>. Technical background
is in `README.md`; the non-negotiable architecture decision is in `CLAUDE.md`.

## The four surfaces

| Surface | URL | Where it goes |
|---|---|---|
| Full tracker | `/wpr-bucks-tracker/` | The WPR Bucks page (`/milwaukee-bucks/`) — iframe, auto-resizes |
| Mini scoreboard | `/wpr-bucks-tracker/mini.html` | Sidebar / in-article card |
| Mini standings | `/wpr-bucks-tracker/mini-standings.html` | Sidebar / in-article card |
| Newsletter digest image | `tools.wausaupilotandreview.com/wpr-bucks-tracker/digest.png` | The morning newsletter's sports slot (replaced the Brewers card, Nov 2026) — re-baked at 5:00 AM Central sharp (morning-digest.yml) plus ~6:45 AM / ~3:45 PM backup ticks |

Embed snippets for all of them are in `README.md` (copy-paste into a WordPress
**Custom HTML** block). Two behaviors worth knowing:

- **Deep links:** `/?tab=schedule`, `/?tab=leaders` (Season stats), `/?tab=film`
  open a specific tab — link them from game stories. A specific box score is
  `/?tab=film&game=<espn-event-id>` (every result row links there; copy the URL
  after clicking any game).
- **Minis:** add `?to=https://wausaupilotandreview.com/milwaukee-bucks/` so a tap
  lands on the WPR Bucks page instead of the bare tracker. https URLs only.
  **That page must exist first** — as of Oct 31, 2026 WordPress redirected
  `/milwaukee-bucks/` to a 2023 article. See "The WPR Bucks page" below.

## The WPR Bucks page

The Brewers and Packers each have a WordPress page hosting their tracker
(`/milwaukee-brewers/`, `/green-bay-packers/`); the Bucks need the same at
`/milwaukee-bucks/` — the newsletter link and the minis' `?to=` point there.
Create a page titled **Milwaukee Bucks** with slug `milwaukee-bucks`, and put
in a **Custom HTML** block:

```html
<iframe id="wpr-bucks" src="https://rowanflynnpilot.github.io/wpr-bucks-tracker/"
        style="width:100%;border:0;height:1600px" loading="lazy"
        allow="web-share; clipboard-write"
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

then, like the Brewers page, a heading "Latest Milwaukee Bucks coverage:" and a
Newspack **Post Carousel** block filtered to the *Milwaukee Bucks* category.

Readers who tap **Share this game** or **Bookmark** inside the embed get this
page's address (`WPR_TRACKER_PAGE` in `src/config.js`), not the github.io one —
another reason it has to exist. If the tracker ever lives at a different URL,
change that one constant.

## Newsletter digest

The morning newsletter (`wpr-newsletter`, `wpr-morning-newsletter-template-v2.html`)
carries the digest as a fixture in its sports slot, served through WPR's
first-party image proxy (`tools.wausaupilotandreview.com`, the Cloudflare
Worker `tools-proxy-worker.js` in that repo — `wpr-bucks-tracker` must be on its
`ALLOWED` list, or the proxy redirects the image to the homepage). The card
follows the Brewers/Packers digest grammar: last game (score, the recap line,
the Bucks' points/rebounds/assists leaders), next up (date, tip, venue, TV), the
East around the Bucks' seed with a one-line seed-race note, any sold game-day
partner, and "Presented by" the title sponsor. Dates are always explicit (never
"Tonight") so an image that missed a re-bake is still true.

The image re-bakes twice daily (before the morning and afternoon sends) via the
deploy workflow. If it ever looks stale, run the **Deploy to GitHub Pages** action
manually (Actions tab → Run workflow) — that re-renders it. A failed re-bake turns
the run red rather than shipping an error card.

## The title sponsorship (SOLD — Ho-Chunk Gaming Wittenberg)

`src/config.js` → `SPONSOR` holds the title sponsor; both title slots (the
masthead banner, and "The standings, presented by" directly under the East
standings on the Season tab) render the same
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

## The NBA Cup race (November, sellable)

During NBA Cup group play the Season tab carries "The Cup race" — the Bucks'
group table (East Group A: Pistons, Magic, Raptors, Nets) built from ESPN
results, plus the Bucks' four Cup nights (Nov 6, 13, 25, 27). It appears on its
own and disappears a week after the last group game. It has its own small
"The Cup race, presented by" credit line — a short, seasonal add-on to pitch
(`CUP_SPONSOR` in `src/config.js`: `{ name, logo, url }`, same logo rules as
above). Nothing shows while it's unsold; `?demo` shows the placeholder. Clicks
report as `Sponsor Click` with slot `cup`. Next fall, update `CUP_GROUP` to the
new group's name; the teams come from the schedule automatically.

## Showing a prospect (sales demo mode)

Append **`?demo`** to any tracker URL and every *unsold* slot fills with a
"Your Brand Here" / "Your Bar Here" placeholder on the otherwise-live page —
real scores, their name on the marquee. Sold slots are never overridden, and
ordinary readers never see placeholders. The link to send:

> **https://rowanflynnpilot.github.io/wpr-bucks-tracker/?demo&tab=schedule**

(Same pattern as the Brewers and Packers trackers.)

## Season rollover (once a year, ~September)

When ESPN publishes the new schedule, bump `SEASON` in `src/config.js`
(ESPN uses the season's **end** year: 2027–28 season = `2028`), push to `main`.
The 2026–27 schedule appeared in mid-September. Until opening night the
tracker runs its preseason views on its own — opening-night countdown, the
calendar facts, last season's stat leaders — and flips to live standings
and the race chart after the first tip. Nothing else to change. (ESPN's playoff
projection — "What ESPN's model sees" — comes straight from ESPN's Basketball
Power Index and is attributed as such.)

## What reports to Plausible

`Tab` (tab opens), `Share`, `Calendar` (add-to-calendar), `Mini Click`,
`Roster Sort` (column taps on the Season stats roster table),
`Coverage Click` (newsroom links), `Sponsor Click`, `Box Score` (game clicks
into the film room, tagged `schedule`/`hero`), `Film Game` (film-room game
picks), `Player Card` (box-score row opens), `Shot Filter` (shot-chart player
picks), `Bookmark` (copy link), `Widget Error` (render failures — should be ~0).
Dashboard: plausible.io, site `rowanflynnpilot.github.io`.

## If something looks wrong

- **Widget shows an error on load** — ESPN blip; it retries itself every 2
  minutes. A reload usually clears it immediately.
- **Score seems stale during a game** — it refreshes every 60s while live; check
  the "Updated X min ago" stamp under the masthead. During a game the top card
  also carries the quarter-by-quarter line, the margin chart so far and each
  team's leaders, refreshed on the same beat.
- **A postponed game shows up / a game is missing** — ESPN sometimes leaves
  postponed shells in the schedule; the tracker filters `STATUS_POSTPONED` and
  `STATUS_CANCELED`. If ESPN mislabels one, it clears when they fix their feed.
- **A Brewers (or other non-Bucks) story in "WPR Bucks coverage"** — the
  section reads the *Milwaukee Bucks* category and skips anything tagged
  *Milwaukee Brewers*. A story in the wrong category without that tag still
  shows; fix its category in WordPress (Brewers stories have been landing in
  *Milwaukee Bucks* — the two sit next to each other in the category list).
- **Injury report shows "Couldn't load" / newsroom section missing** — the
  injury report says so in place and the newsroom section hides itself (it's an
  enhancement); both return on the next page load once the feed recovers.
- **Newsletter image looks old** — check the Actions tab: a failed re-render
  turns the run red (and GitHub emails the owner). ESPN refusing the headless
  renderer is the known cause; see "Headless browsers vs ESPN" in `CLAUDE.md`.
