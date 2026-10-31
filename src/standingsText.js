import { PLAYOFF_LINE, PLAY_IN_LINE, TEAM_ABBR } from './config.js'

// Standings math and the words for it, shared by the storylines, the digest
// and anything else that places the Bucks against the playoff lines — so a
// gap reads the same everywhere and ties are said out loud.

// Games team `a` trails team `b` (0 when level; negative when ahead).
export function gamesBehind(a, b) {
  return ((b.wins - a.wins) + (a.losses - b.losses)) / 2
}

// As a sports desk writes it: "a half-game", "1 game", "2.5 games".
export function gamesWords(g) {
  const n = Math.abs(g)
  if (n === 0.5) return 'a half-game'
  if (n === 1) return '1 game'
  return `${Number.isInteger(n) ? n : n.toFixed(1)} games`
}

export function ordinal(n) {
  const rem100 = n % 100
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`
  return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th'}`
}

const record = (r) => `${r.wins}–${r.losses}`

// One sentence placing the Bucks against the top-six and play-in lines, with
// ties spelled out ("tied with the Heat for 10th … out on tiebreakers").
// "Today" everywhere: nothing is locked in November. Null before a seed exists.
export function seedRace(east) {
  const us = east.find((r) => r.abbr === TEAM_ABBR)
  if (!us?.seed || us.played === 0) return null
  if (us.seed <= PLAYOFF_LINE) {
    const seventh = east[PLAYOFF_LINE]
    const g = gamesBehind(seventh, us)
    return g === 0
      ? `In a top-six spot today at No. ${us.seed} — level with the ${seventh.name} at ${record(us)}, ahead on tiebreakers.`
      : `In a top-six spot today at No. ${us.seed}, ${gamesWords(g)} clear of the play-in.`
  }
  if (us.seed <= PLAY_IN_LINE) {
    const sixth = east[PLAYOFF_LINE - 1]
    const g = gamesBehind(us, sixth)
    return g === 0
      ? `In the play-in field at No. ${us.seed} — level with the ${sixth.name} for sixth at ${record(us)}, behind on tiebreakers.`
      : `In the play-in field at No. ${us.seed}, ${gamesWords(g)} back of a top-six seed.`
  }
  const tenth = east[PLAY_IN_LINE - 1]
  const g = gamesBehind(us, tenth)
  return g === 0
    ? `Tied with the ${tenth.name} for 10th at ${record(us)} but out on tiebreakers — ${ordinal(us.seed)} in the East.`
    : `${ordinal(us.seed)} in the East, ${gamesWords(g)} back of the play-in (the ${tenth.name} hold 10th at ${record(tenth)}).`
}
