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

// Sponsor lockup. null = unsold, and the slots show a tasteful "sponsorship
// available" house card instead of an empty hole — inventory the sales side
// can point at. Fill in to go paid:
// { name: 'Culver's of Wausau', url: 'https://…', logo: 'https://…', tagline: '…' }
// (`let`, not `const`: sales demo mode at the bottom of this file fills open slots.)
export let SPONSOR = null
export const SPONSOR_INQUIRY = 'sales@wausaupilotandreview.com'

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
// marquee. Sold slots are never overridden, ordinary readers never see it (no
// ?demo, no placeholders). Same pattern as the Brewers and Packers trackers.
if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('demo')) {
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
