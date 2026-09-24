import { CENTRAL_RIVALS } from '../config.js'

// Season series against the Central Division, straight off the schedule —
// regular-season meetings only (a playoff series is its own story).
export default function VsCentral({ schedule }) {
  const rivals = CENTRAL_RIVALS.map((abbr) => {
    const games = schedule.events.filter((e) => e.opponent.abbr === abbr && e.stage === 'regular')
    if (games.length === 0) return null
    const finals = games.filter((g) => g.final)
    const wins = finals.filter((g) => g.won).length
    return {
      abbr,
      name: games[0].opponent.name,
      logo: games[0].opponent.logo,
      meetings: games.length,
      played: finals.length,
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
            {/* Before the first meeting, say how many are coming instead of 0–0. */}
            {r.played > 0 ? `${r.wins}–${r.losses} vs ${r.name}` : `${r.meetings} meetings with the ${r.name}`}
          </span>
        ))}
      </div>
    </div>
  )
}
