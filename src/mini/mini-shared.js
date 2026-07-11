import { TRACKER_URL } from '../config.js'
import { track } from '../format.js'

// Where a tap on the card lands. The ?to= param lets each embed point at the
// tracker's page on the news site; without it, the standalone tracker.
// https-only: the param is part of the embed URL, so don't let a crafted embed
// turn the card into a javascript:/data: link.
export function destination() {
  const to = new URLSearchParams(window.location.search).get('to')
  return to && /^https:\/\//i.test(to) ? to : TRACKER_URL
}

export function trackMiniClick(widget) {
  track('Mini Click', { widget })
}
