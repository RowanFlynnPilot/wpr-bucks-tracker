import { GAMES_IN_SEASON } from './config.js'

// Plain facts about the regular-season calendar, derived from the schedule
// alone — what the preseason views say before there are results to report.

// A game's date as a Central-time calendar day (YYYY-MM-DD).
const ctDay = (date) => date.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

const DAY_MS = 86_400_000

export function scheduleFacts(events) {
  const regular = events.filter((e) => !e.postseason)
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
    home: regular.filter((e) => e.home).length,
    backToBacks,
  }
}

// True until the Bucks' first tip — the preseason views key off this.
export function isPreseason(events) {
  return !events.some((e) => e.final || e.live)
}
