import { PLAYOFF_LINE, PLAY_IN_LINE, TEAM_ABBR } from './config.js'

// Standings math and the words for it, shared by the storylines, the digest
// and anything else that places the Bucks against the playoff lines — so a
// gap reads the same everywhere and ties are said out loud.

// Games team `a` trails team `b` (0 when level; negative when ahead).
export function gamesBehind(a, b) {
  return ((b.wins - a.wins) + (a.losses - b.losses)) / 2
}

// As a sports desk writes it: "a half-game", "1 game", "2.5 games". Only for
// a positive gap — a zero or negative one is a percentage race (see seedRace).
export function gamesWords(g) {
  if (g === 0.5) return 'a half-game'
  if (g === 1) return '1 game'
  return `${Number.isInteger(g) ? g : g.toFixed(1)} games`
}

export function ordinal(n) {
  const rem100 = n % 100
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`
  return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th'}`
}

const record = (r) => `${r.wins}–${r.losses}`

// Three different situations, three different sentences:
//   tied   — identical records; the seed came down to a tiebreaker
//   games  — a real games gap (> 0)
//   pct    — level or "behind" on games but split by winning percentage
//            (3–2 vs 4–3, or 4–1 vs 6–2) — never a tiebreaker, never a gap
function separation(lead, trail) {
  if (lead.wins === trail.wins && lead.losses === trail.losses) return { kind: 'tied' }
  const g = gamesBehind(trail, lead)
  return g > 0 ? { kind: 'games', g } : { kind: 'pct' }
}

// One sentence placing the Bucks against the top-six and play-in lines, with
// ties spelled out ("tied with the Heat for 10th … out on tiebreakers").
// "Today" everywhere: nothing is locked in November. Null before a seed exists.
export function seedRace(east) {
  const us = east.find((r) => r.abbr === TEAM_ABBR)
  if (!us?.seed || us.played === 0) return null
  if (us.seed <= PLAYOFF_LINE) {
    const seventh = east[PLAYOFF_LINE]
    const s = separation(us, seventh)
    const head = `In a top-six spot today at No. ${us.seed}`
    if (s.kind === 'tied') return `${head} — level with the ${seventh.name} at ${record(us)}, ahead on tiebreakers.`
    if (s.kind === 'pct') return `${head}, ahead of the seventh-place ${seventh.name} (${record(seventh)}) on winning percentage.`
    return `${head}, ${gamesWords(s.g)} clear of the play-in.`
  }
  if (us.seed <= PLAY_IN_LINE) {
    const sixth = east[PLAYOFF_LINE - 1]
    const s = separation(sixth, us)
    const head = `In the play-in field at No. ${us.seed}`
    if (s.kind === 'tied') return `${head} — level with the ${sixth.name} for sixth at ${record(us)}, behind on tiebreakers.`
    if (s.kind === 'pct') return `${head}, behind the sixth-place ${sixth.name} (${record(sixth)}) only on winning percentage.`
    return `${head}, ${gamesWords(s.g)} back of a top-six seed.`
  }
  const tenth = east[PLAY_IN_LINE - 1]
  const s = separation(tenth, us)
  if (s.kind === 'tied') return `Tied with the ${tenth.name} for 10th at ${record(us)} but out on tiebreakers — ${ordinal(us.seed)} in the East.`
  if (s.kind === 'pct') return `${ordinal(us.seed)} in the East, behind the 10th-place ${tenth.name} (${record(tenth)}) only on winning percentage.`
  return `${ordinal(us.seed)} in the East, ${gamesWords(s.g)} back of the play-in (the ${tenth.name} hold 10th at ${record(tenth)}).`
}
