import { GAMES_IN_SEASON } from './config.js'

// Plain facts about the regular-season calendar, derived from the schedule
// alone — what the preseason views say before there are results to report.

// A game's date as a Central-time calendar day (YYYY-MM-DD).
const ctDay = (date) => date.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

const DAY_MS = 86_400_000

export function scheduleFacts(events) {
  const regular = events.filter((e) => e.stage === 'regular')
  const days = regular.map((e) => ctDay(e.date))
  let backToBacks = 0
  for (let i = 1; i < days.length; i++) {
    if (Date.parse(days[i]) - Date.parse(days[i - 1]) === DAY_MS) backToBacks++
  }
  return {
    opener: regular[0] ?? null,
    scheduled: regular.length,
    // NBA Cup group play decides the last two regular-season dates each fall.
    toBeSet: Math.max(0, GAMES_IN_SEASON - regular.length),
    home: regular.filter((e) => e.home && !e.neutral).length,
    backToBacks,
  }
}

// True until the Bucks' first tip — the preseason views key off this.
export function isPreseason(events) {
  return !events.some((e) => e.final || e.live)
}

// With nothing left on the schedule: is the season over, or is the next
// round just not posted yet? The NBA sets play-in and playoff games a day or
// two after the previous round ends, so "no upcoming games" alone would call a
// play-in team's season complete. `seed` is the final regular-season seed.
//   'over'     — out of the field, or eliminated
//   'awaiting' — the next play-in game / playoff round isn't scheduled yet
export function postseasonState(events, seed) {
  const post = events.filter((e) => e.final && (e.stage === 'playIn' || e.stage === 'playoffs'))
  if (post.length === 0) return seed != null && seed <= 10 ? 'awaiting' : 'over'
  const last = post[post.length - 1]
  if (last.stage === 'playoffs') {
    const series = post.filter((e) => e.stage === 'playoffs' && e.opponent.abbr === last.opponent.abbr)
    const wins = series.filter((e) => e.won).length
    return series.length - wins === 4 ? 'over' : 'awaiting'
  }
  // Play-in: a win always moves on (to the playoffs or the final play-in
  // game); a loss is fatal unless it was the 7-vs-8 game, which gets a second try.
  if (last.won) return 'awaiting'
  const playIn = post.filter((e) => e.stage === 'playIn')
  return playIn.length === 1 && seed != null && seed <= 8 ? 'awaiting' : 'over'
}
