// One- to two-sentence game recaps, generated from the schedule alone — no
// extra fetches. Every statement is derivable from real data (score, margin,
// overtime, home/road, running record, streaks); only the WORDING varies.
// Variety comes from seeded template banks: the seed is a hash of the game id,
// so neighboring games read differently but a given game's recap never changes
// between renders or refreshes.

import { VENUE } from './config.js'

// Deterministic, cheap string hash → stable template picks per game.
function hash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0
  return Math.abs(h)
}

const pick = (bank, seed) => bank[seed % bank.length]

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
const word = (n) => WORDS[n] ?? `${n}`

// Running record and win/loss streaks around every final, one pass. Only
// regular-season games count — the NBA Cup final, the play-in and the
// playoffs don't touch the record. Playoff games carry their series score
// instead. `entering` is the streak walking INTO the game — what a win "snaps".
export function buildRecapContext(events) {
  const map = new Map()
  let wins = 0, losses = 0, run = 0, runType = null
  const series = new Map() // playoff opponent → { wins, losses }
  for (const g of events.filter((e) => e.final)) {
    if (g.stage === 'playoffs') {
      const s = series.get(g.opponent.abbr) ?? { wins: 0, losses: 0 }
      const next = { wins: s.wins + (g.won ? 1 : 0), losses: s.losses + (g.won ? 0 : 1) }
      series.set(g.opponent.abbr, next)
      map.set(g.id, { series: next })
      continue
    }
    if (g.stage !== 'regular') continue
    const entering = { type: runType, count: run }
    if (g.won) wins++
    else losses++
    if (runType === (g.won ? 'W' : 'L')) run++
    else { runType = g.won ? 'W' : 'L'; run = 1 }
    map.set(g.id, { wins, losses, streakType: runType, streakCount: run, entering })
  }
  return map
}

// First sentence: the outcome, by margin bucket. `s` is the score winner-first
// (AP style — "Bulls 120–113" can't be misread), `w` is where the BUCKS played
// ('at Fiserv Forum' / 'on the road' / 'at T-Mobile Arena'), `ot` is '' or
// ' in overtime'. `w` only ever sits in a sentence anchored on the Bucks, so
// it can't read as the opponent's location.
const OPENERS = {
  winBig: [
    (o, s, w, ot) => `The Bucks ran the ${o} out of the gym, ${s}${ot}.`,
    (o, s, w, ot) => `Milwaukee buried the ${o}, ${s}${ot}.`,
    (o, s, w, ot) => `No doubt about this one ${w}: Bucks ${s} over the ${o}${ot}.`,
    (o, s, w, ot) => `The Bucks blew the doors off the ${o}, ${s}${ot}.`,
    (o, s, w, ot) => `A laugher ${w} — Bucks ${s} over the ${o}${ot}.`,
  ],
  winComfortable: [
    (o, s, w, ot) => `The Bucks pulled away from the ${o}, ${s}${ot}.`,
    (o, s, w, ot) => `Milwaukee handled the ${o} ${w}, ${s}${ot}.`,
    (o, s, w, ot) => `The Bucks put the ${o} away, ${s}${ot}.`,
    (o, s, w, ot) => `Comfortable night ${w}: Bucks ${s} over the ${o}${ot}.`,
  ],
  winSolid: [
    (o, s, w, ot) => `The Bucks took care of the ${o}, ${s}${ot}.`,
    (o, s, w, ot) => `Milwaukee outlasted the ${o} ${w}, ${s}${ot}.`,
    (o, s, w, ot) => `The Bucks got past the ${o}, ${s}${ot}.`,
    (o, s, w, ot) => `A workmanlike ${s} win over the ${o} ${w}${ot}.`,
  ],
  winTight: [
    (o, s, w, ot) => `The Bucks held off the ${o}, ${s}${ot}.`,
    (o, s, w, ot) => `Milwaukee edged the ${o} ${w}, ${s}${ot}.`,
    (o, s, w, ot) => `The Bucks closed out the ${o}, ${s}${ot}.`,
    (o, s, w, ot) => `Tight one ${w}, but the Bucks landed it, ${s}${ot}.`,
  ],
  winEscape: [
    (o, s, w, ot) => `The Bucks escaped the ${o}, ${s}${ot}.`,
    (o, s, w, ot) => `Milwaukee survived the ${o} ${w}, ${s}${ot}.`,
    (o, s, w, ot) => `By the skin of their teeth: Bucks ${s} over the ${o}${ot}.`,
  ],
  lossBig: [
    (o, s, w, ot) => `The ${o} ran the Bucks off the floor, ${s}${ot}.`,
    (o, s, w, ot) => `A rough night for the Bucks ${w} — the ${o} rolled, ${s}${ot}.`,
    (o, s, w, ot) => `Milwaukee never found an answer for the ${o}, ${s}${ot}.`,
    (o, s, w, ot) => `The ${o} took the Bucks apart, ${s}${ot}.`,
  ],
  lossComfortable: [
    (o, s, w, ot) => `The ${o} pulled away from the Bucks, ${s}${ot}.`,
    (o, s, w, ot) => `Milwaukee couldn't keep pace with the ${o} ${w}, ${s}${ot}.`,
    (o, s, w, ot) => `The ${o} had this one, ${s}${ot}.`,
  ],
  lossSolid: [
    (o, s, w, ot) => `The ${o} got the better of the Bucks, ${s}${ot}.`,
    (o, s, w, ot) => `Milwaukee came up short against the ${o} ${w}, ${s}${ot}.`,
    (o, s, w, ot) => `The ${o} outworked the Bucks, ${s}${ot}.`,
  ],
  lossTight: [
    (o, s, w, ot) => `The Bucks let one slip against the ${o}, ${s}${ot}.`,
    (o, s, w, ot) => `Milwaukee fell just short of the ${o} ${w}, ${s}${ot}.`,
    (o, s, w, ot) => `The ${o} edged the Bucks, ${s}${ot}.`,
    (o, s, w, ot) => `So close for the Bucks ${w} — the ${o} took it, ${s}${ot}.`,
  ],
  lossEscape: [
    (o, s, w, ot) => `The ${o} stole one from the Bucks, ${s}${ot}.`,
    (o, s, w, ot) => `A heartbreaker for the Bucks ${w}: ${o} ${s}${ot}.`,
    (o, s, w, ot) => `One possession short against the ${o}, ${s}${ot}.`,
  ],
}

// Margin alone picks the bucket — overtime is said by the `ot` suffix, not
// assumed to mean close ("escaped" a 13-point overtime win was wrong).
// "Escape" is one possession: 3 points or fewer.
function bucket(won, margin) {
  if (margin <= 3) return won ? 'winEscape' : 'lossEscape'
  if (margin >= 20) return won ? 'winBig' : 'lossBig'
  if (margin >= 12) return won ? 'winComfortable' : 'lossComfortable'
  if (margin >= 7) return won ? 'winSolid' : 'lossSolid'
  return won ? 'winTight' : 'lossTight'
}

// Second sentence: series, Cup, streak or record context — or nothing, so
// lengths vary too.
function followUp(game, ctx, seed) {
  if (game.stage === 'cupFinal') {
    return game.won ? 'The Bucks are NBA Cup champions.' : `The NBA Cup goes to the ${game.opponent.name}.`
  }
  if (!ctx) return null
  if (ctx.series) {
    const { wins: sw, losses: sl } = ctx.series
    if (sw === 4) return `That wins the series, ${sw}–${sl}.`
    if (sl === 4) return `That ends the series, ${sw}–${sl}.`
    if (sw === sl) return `The series is tied ${sw}–${sl}.`
    return sw > sl ? `The Bucks lead the series ${sw}–${sl}.` : `The Bucks trail the series ${sw}–${sl}.`
  }
  const { wins, losses, streakCount, entering } = ctx
  // A result that ends a 3+ game run the other way is the story.
  if (entering.type && entering.type !== (game.won ? 'W' : 'L') && entering.count >= 3) {
    return game.won
      ? pick([
          `That snapped a ${word(entering.count)}-game skid.`,
          `The ${word(entering.count)}-game slide is over.`,
        ], seed)
      : pick([
          `That ended the ${word(entering.count)}-game winning streak.`,
          `The ${word(entering.count)}-game run stops there.`,
        ], seed)
  }
  if (streakCount >= 2) {
    return game.won
      ? pick([
          `That's ${word(streakCount)} straight wins.`,
          `Make it ${word(streakCount)} in a row.`,
          `The streak's at ${word(streakCount)}.`,
        ], seed)
      : pick([
          `That's ${word(streakCount)} straight losses.`,
          `The skid hit ${word(streakCount)}.`,
          `A ${word(streakCount)}-game slide now.`,
        ], seed)
  }
  // Sometimes note the record, sometimes let the opener stand alone.
  return pick([
    `Milwaukee sits ${wins}–${losses}.`,
    `The record: ${wins}–${losses}.`,
    null,
    null,
  ], seed)
}

// The public API: a 1–2 sentence recap for a FINAL game, or null otherwise.
export function recapFor(game, ctxMap) {
  if (!game?.final || game.ourScore == null || game.theirScore == null) return null
  const ours = parseInt(game.ourScore, 10)
  const theirs = parseInt(game.theirScore, 10)
  if (!Number.isFinite(ours) || !Number.isFinite(theirs)) return null

  const seed = hash(String(game.id))
  const margin = Math.abs(ours - theirs)
  const ot = game.period > 4 ? (game.period === 5 ? ' in overtime' : ` in ${game.period - 4} overtimes`) : ''
  // Neutral sites (the Cup's Las Vegas rounds) name the arena; a designated
  // "home" game there is not a Fiserv Forum night.
  const where = game.neutral ? `at ${game.venue}` : game.home ? `at ${game.venue ?? VENUE}` : 'on the road'
  const score = game.won ? `${game.ourScore}–${game.theirScore}` : `${game.theirScore}–${game.ourScore}`

  const opener = pick(OPENERS[bucket(game.won, margin)], seed)(game.opponent.name, score, where, ot)
  const second = followUp(game, ctxMap?.get(game.id), seed >> 3)
  return second ? `${opener} ${second}` : opener
}
