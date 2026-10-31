// Game times are shown in Central time — this is a Wisconsin publication.
const CT = 'America/Chicago'

// A date's Central-time calendar day, as YYYY-MM-DD.
export const ctDay = (date) => date.toLocaleDateString('en-CA', { timeZone: CT })

// Calendar-day offset from today in Central time: 0 today, -1 yesterday, 1 tomorrow.
export function ctDaysFromToday(date) {
  return Math.round((Date.parse(ctDay(date)) - Date.parse(ctDay(new Date()))) / 86_400_000)
}

// "Tonight" from 5 PM on, otherwise "Today" — only for a game on today's date.
export function todayWord(date) {
  const hour = Number(date.toLocaleString('en-US', { timeZone: CT, hour: 'numeric', hour12: false }))
  return hour >= 17 ? 'Tonight' : 'Today'
}

export function gameDate(date) {
  return date.toLocaleDateString('en-US', {
    timeZone: CT,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function gameTime(date) {
  return date.toLocaleTimeString('en-US', {
    timeZone: CT,
    hour: 'numeric',
    minute: '2-digit',
  })
}

// Bare time-until phrase ("3 days" / "5 hours" / "42 min"); callers add the verb.
export function countdown(date) {
  const mins = Math.round((date - Date.now()) / 60_000)
  if (mins < 1) return 'moments'
  if (mins < 90) return `${mins} min`
  const hrs = Math.round(mins / 60)
  if (hrs < 36) return `${hrs} hours`
  return `${Math.round(hrs / 24)} days`
}

// NBA period label: quarters, then OT / 2OT / …
export function periodLabel(period, clock) {
  const p = period <= 4 ? `Q${period}` : period === 5 ? 'OT' : `${period - 4}OT`
  return clock ? `${p} · ${clock}` : p
}

// A live game's status line. Breaks (halftime, end of a quarter) sit on a
// 0.0 clock — "Q2 · 0.0" — so there ESPN's own short detail names them.
export function liveLabel(game) {
  if (!game.clock || /^0(:00|\.0)?$/.test(game.clock)) return game.detail || periodLabel(game.period)
  return periodLabel(game.period, game.clock)
}

export function track(eventName, props) {
  // Guard for local dev / blocked analytics — Plausible loads from index.html.
  if (window.plausible) window.plausible(eventName, props ? { props } : undefined)
}
