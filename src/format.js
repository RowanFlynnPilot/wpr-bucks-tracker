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

export function track(eventName, props) {
  // Guard for local dev / blocked analytics — Plausible loads from index.html.
  if (window.plausible) window.plausible(eventName, props ? { props } : undefined)
}
