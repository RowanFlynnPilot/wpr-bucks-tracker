// Everything tweakable lives here. To repoint at a different NBA team,
// change TEAM_ID and TEAM_ABBR. To roll into a new season, bump SEASON.

// ESPN uses the season's END year: 2026 = the 2025-26 season.
// Bump to 2027 when the 2026-27 schedule is published (October).
export const SEASON = 2026

export const TEAM_ID = '15' // Milwaukee Bucks (ESPN)
export const TEAM_ABBR = 'MIL'
export const CONFERENCE = 'Eastern Conference'
export const VENUE = 'Fiserv Forum'

// NBA playoff format: seeds 1-6 are locked in, 7-10 go to the play-in.
export const PLAYOFF_LINE = 6
export const PLAY_IN_LINE = 10
export const GAMES_IN_SEASON = 82

// Central Division rivals — the season-series strip under the standings.
export const CENTRAL_RIVALS = ['CHI', 'CLE', 'DET', 'IND']

// Team identity (Bucks "Good Land Green" + cream)
export const TEAM_COLOR = '#00471B'
export const TEAM_CREAM = '#EEE1C6'

// Set to false for a colors-only header if MLB-style trademark caution
// applies before putting a sponsor on this surface (see README).
export const USE_TEAM_LOGO = true
export const TEAM_LOGO = 'https://a.espncdn.com/i/teamlogos/nba/500/mil.png'

// Title sponsor — both title slots (banner + mid-Season-tab) are one sponsor.
// null = unsold, and the slots show a "sponsorship available" house card
// instead of an empty hole — inventory the sales side can point at.
// Shape: { name, logo, url, tagline, address? }. Sponsor art is SELF-HOSTED
// from public/ — WPR's media library moved to a CDN in Sept 2026 and hot-linked
// uploads 404'd on the Brewers tracker. Copy the file in; note the source.
// The tagline splits at the em-dash (offer large, place small). `address` powers
// the Directions chip. (`let`, not `const`: demo mode below fills OPEN slots.)
export let SPONSOR = {
  name: 'Ho-Chunk Gaming Wittenberg',
  // Source: cdn.wausaupilotandreview.com/wp-content/uploads/2025/07/HCG-W-Logo-1-336x115.jpg
  logo: `${import.meta.env.BASE_URL}hcg-wittenberg-logo.jpg`,
  url: 'https://www.ho-chunkgaming.com/wittenberg/?utm_source=wausaupilotandreview&utm_medium=widget&utm_campaign=bucks_tracker',
  tagline: '800+ slots · Hotel · Dining — Wittenberg, WI',
  address: 'N7198 US-45, Wittenberg, WI 54499',
}
export const SPONSOR_INQUIRY = 'weber.chris@wausaupilotandreview.com'

// Shown in the footer while a gaming brand is the title sponsor. Set to '' to hide.
export const SPONSOR_DISCLAIMER =
  'Must be 21+. If you or someone you know has a gambling problem, call 1-800-GAMBLER.'

// Sales demo mode flag — see the block at the bottom of this file.
export const DEMO_MODE =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('demo')

// Where to watch this week: bar/restaurant listings, sold per listing. Each entry:
//   { name: 'The Bar', tagline: '…', images: ['hero.jpg', 'thumb1.jpg', …],
//     url: 'https://…', address: '123 Third St, Wausau', phone: '715-…',
//     features: ['12 HDTVs', …], specials: ['$3 Wisconsin taps', …] }
// Empty = the section doesn't render (except in ?demo — see below).
export let WATCH_VENUES = []

// WPR's own Bucks coverage (WordPress REST). categoryId is the site's
// "Milwaukee Bucks" category; archive is where bookmarks/copies point when
// the tracker is embedded. null base disables the section.
export const WPR_NEWS = {
  base: 'https://wausaupilotandreview.com/wp-json/wp/v2',
  categoryId: 567085021,
  archive: 'https://wausaupilotandreview.com/category/milwaukee-bucks/',
}

// Where mini-card taps land by default (overridable per-embed via ?to=)
export const TRACKER_URL = 'https://rowanflynnpilot.github.io/wpr-bucks-tracker/'

// Plausible analytics domain. Matches the Pages host so embedded views
// report with wausaupilotandreview.com as the source.
export const PLAUSIBLE_DOMAIN = 'rowanflynnpilot.github.io'

// postMessage type for the iframe auto-resize handshake
export const HEIGHT_MESSAGE_TYPE = 'wpr-bucks-height'

// ---------------------------------------------------------------------------
// SALES DEMO MODE — append ?demo to any page URL and every OPEN slot fills with
// a "Your brand here" placeholder, so WPR sales can show a prospect exactly what
// their sponsorship looks like on the live page: real scores, their name on the
// marquee. Sold slots (the Ho-Chunk title) are never overridden, ordinary
// readers never see it (no ?demo, no placeholders), and App shows a preview
// ribbon so a forwarded link explains itself. Same pattern as the Brewers and
// Packers trackers. This looks like dead code and it is not.
if (DEMO_MODE) {
  SPONSOR = SPONSOR || {
    name: 'Your Brand Here',
    logo: null,
    url: null,
    tagline: `This placement is open for the coming season — ${SPONSOR_INQUIRY}`,
  }
  if (!WATCH_VENUES.length) {
    WATCH_VENUES = [
      {
        name: 'Your Bar Here',
        tagline: "Wausau's home for Bucks basketball — this listing is available",
        images: [],
        url: null,
        address: `Ask about this placement: ${SPONSOR_INQUIRY}`,
        phone: '',
        features: ['12 HDTVs', 'Sound on for every game', 'Full bar & patio'],
        specials: ['$3 Wisconsin taps', '50-cent wings while the Bucks are on'],
      },
      {
        name: 'Your Restaurant Here',
        tagline: 'The family game-night headquarters — kitchen open through the fourth quarter',
        images: [],
        url: null,
        address: `Ask about this placement: ${SPONSOR_INQUIRY}`,
        phone: '',
        features: ['Big-screen wall', 'Kids eat free Sundays', 'Patio seating'],
        specials: ['Burger & tap combo, $9', 'Half-price apps in every fourth quarter'],
      },
    ]
  }
}
