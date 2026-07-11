import { CENTRAL_RIVALS } from '../config.js'

// Season series against the Central Division, straight off the schedule.
export default function VsCentral({ schedule }) {
  const rivals = CENTRAL_RIVALS.map((abbr) => {
    const games = schedule.events.filter((e) => e.opponent.abbr === abbr)
    if (games.length === 0) return null
    const finals = games.filter((g) => g.final)
    const wins = finals.filter((g) => g.won).length
    return {
      abbr,
      name: games[0].opponent.name,
      logo: games[0].opponent.logo,
      wins,
      losses: finals.length - wins,
    }
  }).filter(Boolean)

  if (rivals.length === 0) return null

  return (
    <div className="vs-central">
      <div className="vs-central-title">Bucks vs the Central</div>
      <div className="vs-central-chips">
        {rivals.map((r) => (
          <span className="rival-chip" key={r.abbr}>
            {r.logo && <img src={r.logo} alt="" loading="lazy" />}
            {r.wins}–{r.losses} vs {r.name}
          </span>
        ))}
      </div>
    </div>
  )
}
