import { VENUE } from '../config.js'
import { gameDate } from '../format.js'
import Section from './Section.jsx'

// Strength of what's left: remaining opponents' combined winning percentage,
// plus the next eight opponents at a glance. With no games left there is no
// road ahead. Opponents who haven't played yet carry no record, so they're
// left out of the combined mark — and before anyone has played, the section
// just shows the first eight dates.
export default function RoadAhead({ schedule, standings }) {
  const upcoming = schedule.events.filter((e) => !e.final && !e.live)
  if (upcoming.length === 0) return null

  const league = [...standings.east, ...standings.west]
  const withRows = upcoming
    .map((g) => ({ g, row: league.find((r) => r.abbr === g.opponent.abbr) }))
    .filter((x) => x.row)
  if (withRows.length === 0) return null

  const rated = withRows.filter((x) => x.row.played > 0)
  const homeLeft = upcoming.filter((g) => g.home && !g.neutral).length
  const next = withRows.slice(0, 8)
  const counts = `${upcoming.length} games left, ${homeLeft} of them at ${VENUE}.`
  const note = rated.length > 0
    ? `Remaining opponents play ${(rated.reduce((s, x) => s + x.row.winPctValue, 0) / rated.length).toFixed(3).replace(/^0/, '')} ball · ${counts}`
    : counts

  return (
    <Section kicker="Strength of schedule" title="The road ahead" note={note}>
      <div className="road-chips">
        {next.map(({ g, row }) => (
          <span className="road-chip" key={g.id} title={gameDate(g.date)}>
            <span className="vsat">{g.home ? 'vs' : 'at'}</span>
            {g.opponent.logo && <img src={g.opponent.logo} alt={g.opponent.name} loading="lazy" />}
            <span className="rec">
              {row.played > 0
                ? `${row.wins}–${row.losses}`
                : g.date.toLocaleDateString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric' })}
            </span>
          </span>
        ))}
      </div>
      <p className="section-note" style={{ marginTop: 10 }}>
        {rated.length > 0
          ? 'The next eight opponents, with their current records.'
          : 'The first eight dates — opponent records fill in once the season starts.'}
      </p>
    </Section>
  )
}
