import { GAMES_IN_SEASON, PLAYOFF_LINE, PLAY_IN_LINE, TEAM_ABBR } from '../config.js'
import Section from './Section.jsx'

const SIMS = 4000

// Monte Carlo the rest of the East, in the browser (no backend, per the architecture).
// Honestly simple house model: each team's true talent is its win% regressed toward .500
// with four games of ballast; remaining wins come from a normal approximation of the
// binomial; seeds are final wins with a random jitter breaking ties. Editorial flavor,
// not Vegas — the note under the tiles says so.
function simulate(east) {
  const talent = east.map((t) => (t.wins + 2) / (t.wins + t.losses + 4))
  const remaining = east.map((t) => Math.max(0, GAMES_IN_SEASON - t.wins - t.losses))
  const meIdx = east.findIndex((t) => t.abbr === TEAM_ABBR)
  const normal = () => {
    let u = 0, v = 0
    while (u === 0) u = Math.random()
    while (v === 0) v = Math.random()
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }
  let top6 = 0, playIn = 0
  const myFinals = new Array(SIMS)
  for (let s = 0; s < SIMS; s++) {
    const finals = east.map((t, i) => {
      const r = remaining[i], p = talent[i]
      const mu = r * p, sd = Math.sqrt(Math.max(0.0001, r * p * (1 - p)))
      const add = Math.min(r, Math.max(0, Math.round(mu + sd * normal())))
      return t.wins + add + Math.random() * 0.5 // jitter breaks ties randomly
    })
    myFinals[s] = finals[meIdx]
    const place = finals.filter((w) => w > finals[meIdx]).length + 1
    if (place <= PLAYOFF_LINE) top6++
    else if (place <= PLAY_IN_LINE) playIn++
  }
  myFinals.sort((a, b) => a - b)
  return { top6: top6 / SIMS, playIn: playIn / SIMS, medianWins: Math.floor(myFinals[SIMS / 2]) }
}

function pct(p) {
  if (p < 0.005) return '<1%'
  if (p > 0.995) return '>99%'
  return `${Math.round(p * 100)}%`
}

export default function PlayInOdds({ standings }) {
  const east = standings.east
  const us = east.find((r) => r.abbr === TEAM_ABBR)
  const remainingTotal = east.reduce((sum, t) => sum + Math.max(0, GAMES_IN_SEASON - t.wins - t.losses), 0)

  // Season over: the dials are trivially 0/100 — state the result instead.
  if (remainingTotal === 0) {
    const finish = us.seed <= PLAYOFF_LINE
      ? 'a top-six playoff seed'
      : us.seed <= PLAY_IN_LINE ? 'a play-in berth' : 'outside the play-in field'
    return (
      <Section kicker="The playoff picture" title="Where the math landed">
        <p className="section-note">
          Final: #{us.seed} in the East — {finish}. The odds tiles return on opening night.
        </p>
      </Section>
    )
  }

  // Before the Bucks' first game every team is a .500 coin flip and the model
  // would just print the field's arithmetic back — wait for real results.
  if (us.played === 0) {
    return (
      <Section kicker="The playoff picture" title="The play-in math">
        <p className="section-note">
          The odds model switches on after opening night — it needs real results to work from.
        </p>
      </Section>
    )
  }

  const { top6, playIn, medianWins } = simulate(east)

  return (
    <Section kicker="The playoff picture" title="The play-in math">
      <div className="pulse odds">
        <div className="stat">
          <div className="value">{pct(top6)}</div>
          <div className="label">Top-six seed</div>
        </div>
        <div className="stat">
          <div className="value">{pct(playIn)}</div>
          <div className="label">Play-in berth (7–10)</div>
        </div>
        <div className="stat">
          <div className="value">{medianWins}</div>
          <div className="label">Projected wins (median)</div>
        </div>
      </div>
      <p className="section-note" style={{ marginTop: 12 }}>
        House model: {SIMS.toLocaleString()} simulated seasons from current records, regressed toward
        .500 — editorial flavor, not a sportsbook.
      </p>
    </Section>
  )
}
