import { useState } from 'react'
import { VENUE } from '../config.js'
import { countdown, gameDate, gameTime } from '../format.js'
import { buildRecapContext, recapFor } from '../recaps.js'
import Section from '../components/Section.jsx'
import GameRow from '../components/GameRow.jsx'
import WhereToWatch from '../components/WhereToWatch.jsx'
import InjuryReport from '../components/InjuryReport.jsx'
import Coverage from '../components/Coverage.jsx'

const INITIAL_RESULTS = 10

export default function ScheduleTab({ schedule, onOpenGame }) {
  const [showAll, setShowAll] = useState(false)

  const played = schedule.events.filter((e) => e.final)
  const upcoming = schedule.events.filter((e) => !e.final)
  const recent = showAll ? [...played].reverse() : [...played].reverse().slice(0, INITIAL_RESULTS)
  const nextHome = upcoming.find((g) => g.home && !g.live)
  const recaps = buildRecapContext(schedule.events)

  return (
    <>
      <WhereToWatch schedule={schedule} />

      <Section kicker="The season" title="The schedule">
        {upcoming.length > 0 && (
          <div className="card">
            <h3 className="group-label">Coming up</h3>
            {upcoming.slice(0, 8).map((g) => <GameRow key={g.id} game={g} detail />)}
          </div>
        )}
        <div className="card">
          <h3 className="group-label">Results</h3>
          {played.length === 0 && <p className="section-note">No games played yet this season.</p>}
          {recent.map((g) => (
            <GameRow key={g.id} game={g} recap={recapFor(g, recaps)} onOpen={onOpenGame} />
          ))}
          {played.length > INITIAL_RESULTS && (
            <button className="copy-link" style={{ marginTop: 12 }}
              onClick={() => setShowAll(!showAll)}>
              {showAll ? 'Show recent only' : `Show all ${played.length} games`}
            </button>
          )}
        </div>
      </Section>

      {nextHome && (
        <Section kicker="Circle the date" title={`Next at ${VENUE}`}>
          <div className="card">
            <GameRow game={nextHome} detail />
            <p className="section-note" style={{ marginTop: 10 }}>
              {gameDate(nextHome.date)} at {gameTime(nextHome.date)} CT — tips in {countdown(nextHome.date)}.
            </p>
          </div>
        </Section>
      )}

      <InjuryReport />

      <Coverage />
    </>
  )
}
