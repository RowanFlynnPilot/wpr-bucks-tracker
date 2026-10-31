import { GAMES_IN_SEASON } from './config.js'
import { ctDay, ctDaysFromToday } from './format.js'

// Which game leads the hero and the mini scoreboard:
//   live      — a game in progress
//   recent    — last night's (or today's) final, until the day of the next game:
//               the morning after, the result is the story, not a game 34 hours out
//   next      — the next game (on game day, "Tonight · 7:00 PM")
//   last      — the most recent final, when nothing is scheduled (offseason)
export function pickFeatured(events) {
  const live = events.find((e) => e.live)
  const next = events.find((e) => !e.final && !e.live) ?? null
  const finals = events.filter((e) => e.final)
  const last = finals[finals.length - 1] ?? null
  if (live) return { game: live, mode: 'live', next, last }
  const nextIsToday = next && ctDaysFromToday(next.date) === 0
  if (last && !nextIsToday && ctDaysFromToday(last.date) >= -1) return { game: last, mode: 'recent', next, last }
  if (next) return { game: next, mode: 'next', next, last }
  if (last) return { game: last, mode: 'last', next, last }
  return null
}

// Plain facts about the regular-season calendar, derived from the schedule
// alone — what the preseason views say before there are results to report.

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
