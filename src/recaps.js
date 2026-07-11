// One- to two-sentence game recaps, generated from the schedule alone — no
// extra fetches. Every statement is derivable from real data (score, margin,
// overtime, home/road, running record, streaks); only the WORDING varies.
// Variety comes from seeded template banks: the seed is a hash of the game id,
// so neighboring games read differently but a given game's recap never changes
// between renders or refreshes.

// Deterministic, cheap string hash → stable template picks per game.
function hash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0
  return Math.abs(h)
}

const pick = (bank, seed) => bank[seed % bank.length]

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
const word = (n) => WORDS[n] ?? `${n}`

// Running record and win/loss streaks around every final, one pass.
// `entering` is the streak walking INTO the game — that's what a win "snaps".
export function buildRecapContext(events) {
  const finals = events.filter((e) => e.final)
  const map = new Map()
  let wins = 0, losses = 0, run = 0, runType = null
  for (const g of finals) {
    const entering = { type: runType, count: run }
    if (g.won) wins++
    else losses++
    if (runType === (g.won ? 'W' : 'L')) run++
    else { runType = g.won ? 'W' : 'L'; run = 1 }
    map.set(g.id, { wins, losses, streakType: runType, streakCount: run, entering })
  }
  return map
}

// First sentence: the outcome, by margin bucket. `s` is the Bucks-first score,
// `where` is 'at Fiserv Forum' / 'on the road', `ot` is '' or ' in overtime'.
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
    (o, s, w, ot) => `A rough night ${w} — the ${o} rolled, ${s}${ot}.`,
    (o, s, w, ot) => `Milwaukee never found an answer for the ${o}, ${s}${ot}.`,
    (o, s, w, ot) => `The ${o} took the Bucks apart, ${s}${ot}.`,
  ],
  lossComfortable: [
    (o, s, w, ot) => `The ${o} pulled away from the Bucks, ${s}${ot}.`,
    (o, s, w, ot) => `Milwaukee couldn't keep pace with the ${o} ${w}, ${s}${ot}.`,
    (o, s, w, ot) => `The ${o} had this one ${w}, ${s}${ot}.`,
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
    (o, s, w, ot) => `So close ${w} — the ${o} took it, ${s}${ot}.`,
  ],
  lossEscape: [
    (o, s, w, ot) => `The ${o} stole one from the Bucks, ${s}${ot}.`,
    (o, s, w, ot) => `A heartbreaker ${w}: ${o} ${s}${ot}.`,
    (o, s, w, ot) => `One possession short against the ${o}, ${s}${ot}.`,
  ],
}

function bucket(won, margin, wentOT) {
  if (wentOT || margin <= 1) return won ? 'winEscape' : 'lossEscape'
  if (margin >= 20) return won ? 'winBig' : 'lossBig'
  if (margin >= 12) return won ? 'winComfortable' : 'lossComfortable'
  if (margin >= 5) return won ? 'winSolid' : 'lossSolid'
  return won ? 'winTight' : 'lossTight'
}

// Second sentence: streak/record context — or nothing, so lengths vary too.
function followUp(game, ctx, seed) {
  if (!ctx) return null
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
  const wentOT = game.period > 4
  const ot = wentOT ? (game.period === 5 ? ' in overtime' : ` in ${game.period - 4} overtimes`) : ''
  const where = game.home ? 'at Fiserv Forum' : 'on the road'
  const score = `${game.ourScore}–${game.theirScore}`

  const opener = pick(OPENERS[bucket(game.won, margin, wentOT)], seed)(
    game.opponent.name, score, where, ot
  )
  const second = followUp(game, ctxMap?.get(game.id), seed >> 3)
  return second ? `${opener} ${second}` : opener
}
