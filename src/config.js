// Everything tweakable lives here. To repoint at a different NBA team,
// change TEAM_ID and TEAM_ABBR. To roll into a new season, bump SEASON.

// ESPN uses the season's END year: 2026 = the 2025-26 season.
// Bump to 2027 when the 2026-27 schedule is published (October).
export const SEASON = 2026

export const TEAM_ID = '15' // Milwaukee Bucks (ESPN)
export const TEAM_ABBR = 'MIL'
export const CONFERENCE = 'Eastern Conference'

// NBA playoff format: seeds 1-6 are locked in, 7-10 go to the play-in.
export const PLAYOFF_LINE = 6
export const PLAY_IN_LINE = 10

// Team identity (Bucks "Good Land Green" + cream)
export const TEAM_COLOR = '#00471B'
export const TEAM_CREAM = '#EEE1C6'

// Set to false for a colors-only header if MLB-style trademark caution
// applies before putting a sponsor on this surface (see README).
export const USE_TEAM_LOGO = true
export const TEAM_LOGO = 'https://a.espncdn.com/i/teamlogos/nba/500/mil.png'

// Sponsor slot in the footer. Empty string = slot hidden.
export const SPONSOR_TEXT = ''
export const SPONSOR_URL = ''

// Where mini-card taps land by default (overridable per-embed via ?to=)
export const TRACKER_URL = 'https://rowanflynnpilot.github.io/wpr-bucks-tracker/'

// Plausible analytics domain. Matches the Pages host so embedded views
// report with wausaupilotandreview.com as the source.
export const PLAUSIBLE_DOMAIN = 'rowanflynnpilot.github.io'

// postMessage type for the iframe auto-resize handshake
export const HEIGHT_MESSAGE_TYPE = 'wpr-bucks-height'
