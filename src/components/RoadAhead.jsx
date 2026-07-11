import { VENUE } from '../config.js'
import { gameDate } from '../format.js'

// Strength of what's left: remaining opponents' combined winning percentage,
// plus the next eight opponents at a glance. In-season only — with no games
// left there is no road ahead.
export default function RoadAhead({ schedule, standings }) {
  const upcoming = schedule.events.filter((e) => !e.final && !e.live)
  if (upcoming.length === 0) return null

  const league = [...standings.east, ...standings.west]
  const withRows = upcoming
    .map((g) => ({ g, row: league.find((r) => r.abbr === g.opponent.abbr) }))
    .filter((x) => x.row)
  if (withRows.length === 0) return null

  const combined = withRows.reduce((s, x) => s + x.row.winPctValue, 0) / withRows.length
  const homeLeft = upcoming.filter((g) => g.home).length
  const next = withRows.slice(0, 8)

  return (
    <div className="card">
      <h2 className="section">The road ahead</h2>
      <p className="section-note">
        Remaining opponents play {combined.toFixed(3).replace(/^0/, '')} ball ·{' '}
        {upcoming.length} games left, {homeLeft} of them at {VENUE}.
      </p>
      <div className="road-chips">
        {next.map(({ g, row }) => (
          <span className="road-chip" key={g.id} title={gameDate(g.date)}>
            <span className="vsat">{g.home ? 'vs' : 'at'}</span>
            {g.opponent.logo && <img src={g.opponent.logo} alt={g.opponent.name} loading="lazy" />}
            <span className="rec">{row.wins}–{row.losses}</span>
          </span>
        ))}
      </div>
      <p className="section-note" style={{ marginTop: 10 }}>
        The next eight opponents, with their current records.
      </p>
    </div>
  )
}
