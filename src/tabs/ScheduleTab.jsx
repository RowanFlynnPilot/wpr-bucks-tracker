import { useState } from 'react'
import { VENUE } from '../config.js'
import { countdown, gameDate, gameTime } from '../format.js'
import GameRow from '../components/GameRow.jsx'
import InjuryReport from '../components/InjuryReport.jsx'
import Coverage from '../components/Coverage.jsx'

const INITIAL_RESULTS = 10

export default function ScheduleTab({ schedule }) {
  const [showAll, setShowAll] = useState(false)

  const played = schedule.events.filter((e) => e.final)
  const upcoming = schedule.events.filter((e) => !e.final)
  const recent = showAll ? [...played].reverse() : [...played].reverse().slice(0, INITIAL_RESULTS)
  const nextHome = upcoming.find((g) => g.home && !g.live)

  return (
    <>
      {upcoming.length > 0 && (
        <div className="card">
          <h2 className="section">Coming up</h2>
          {upcoming.slice(0, 8).map((g) => <GameRow key={g.id} game={g} detail />)}
        </div>
      )}

      {nextHome && (
        <div className="card">
          <h2 className="section">Next at {VENUE}</h2>
          <GameRow game={nextHome} detail />
          <p className="section-note" style={{ marginTop: 10 }}>
            {gameDate(nextHome.date)} at {gameTime(nextHome.date)} CT — tips in {countdown(nextHome.date)}.
          </p>
        </div>
      )}

      <div className="card">
        <h2 className="section">Results</h2>
        {played.length === 0 && <p className="section-note">No games played yet this season.</p>}
        {recent.map((g) => <GameRow key={g.id} game={g} />)}
        {played.length > INITIAL_RESULTS && (
          <button className="copy-link" style={{ marginTop: 12 }}
            onClick={() => setShowAll(!showAll)}>
            {showAll ? 'Show recent only' : `Show all ${played.length} games`}
          </button>
        )}
      </div>

      <InjuryReport />

      <Coverage />
    </>
  )
}
