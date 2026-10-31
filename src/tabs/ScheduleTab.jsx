import { useState } from 'react'
import { VENUE } from '../config.js'
import { countdown, ctDaysFromToday, gameDate, gameTime } from '../format.js'
import { buildRecapContext, recapFor } from '../recaps.js'
import Section from '../components/Section.jsx'
import GameRow from '../components/GameRow.jsx'
import WhereToWatch from '../components/WhereToWatch.jsx'
import InjuryReport from '../components/InjuryReport.jsx'
import Coverage from '../components/Coverage.jsx'

const INITIAL_RESULTS = 10
const INITIAL_UPCOMING = 8

export default function ScheduleTab({ schedule, onOpenGame }) {
  const [showAll, setShowAll] = useState(false)
  const [showAllUpcoming, setShowAllUpcoming] = useState(false)

  const played = schedule.events.filter((e) => e.final)
  const upcoming = schedule.events.filter((e) => !e.final)
  const recent = showAll ? [...played].reverse() : [...played].reverse().slice(0, INITIAL_RESULTS)
  const ahead = showAllUpcoming ? upcoming : upcoming.slice(0, INITIAL_UPCOMING)
  // "Circle the date" earns its space only when the next home game isn't
  // already the first row of Coming up.
  const nextHome = upcoming.find((g) => g.home && !g.neutral && !g.live)
  const circleDate = nextHome && nextHome !== upcoming[0] ? nextHome : null
  const recaps = buildRecapContext(schedule.events)
  // The morning after (last final today or yesterday, no game today), results
  // lead: that's what a reader opening the tab is looking for.
  const lastFinal = played[played.length - 1]
  const resultsFirst = lastFinal && ctDaysFromToday(lastFinal.date) >= -1
    && !upcoming.some((g) => g.live || ctDaysFromToday(g.date) === 0)

  const comingUp = upcoming.length > 0 && (
    <div className="card" key="coming-up">
      <h3 className="group-label">Coming up</h3>
      {ahead.map((g) => <GameRow key={g.id} game={g} detail />)}
      {upcoming.length > INITIAL_UPCOMING && (
        <button className="copy-link" style={{ marginTop: 12 }}
          onClick={() => setShowAllUpcoming(!showAllUpcoming)}>
          {showAllUpcoming ? 'Show the next few only' : `Show all ${upcoming.length} upcoming games`}
        </button>
      )}
    </div>
  )
  // Nothing to list before the first final — the Coming up card carries the tab.
  const results = played.length > 0 && (
    <div className="card" key="results">
      <h3 className="group-label">Results</h3>
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
  )

  return (
    <>
      <WhereToWatch schedule={schedule} />

      <Section kicker="The season" title="The schedule">
        {resultsFirst ? [results, comingUp] : [comingUp, results]}
      </Section>

      {circleDate && (
        <Section kicker="Circle the date" title={`Next at ${VENUE}`}>
          <div className="card">
            <GameRow game={circleDate} detail />
            <p className="section-note" style={{ marginTop: 10 }}>
              {gameDate(circleDate.date)} at {gameTime(circleDate.date)} CT — tips in {countdown(circleDate.date)}.
            </p>
          </div>
        </Section>
      )}

      <InjuryReport />

      <Coverage />
    </>
  )
}
