import { TRACKER_URL } from '../config.js'
import { track } from '../format.js'

// Where a tap on the card lands. The ?to= param lets each embed point at the
// tracker's page on the news site; without it, the standalone tracker.
export function destination() {
  const to = new URLSearchParams(window.location.search).get('to')
  return to ?? TRACKER_URL
}

export function trackMiniClick(widget) {
  track('Mini Click', { widget })
}
