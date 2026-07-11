// Game times are shown in Central time — this is a Wisconsin publication.
const CT = 'America/Chicago'

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

export function track(eventName, props) {
  // Guard for local dev / blocked analytics — Plausible loads from index.html.
  if (window.plausible) window.plausible(eventName, props ? { props } : undefined)
}
