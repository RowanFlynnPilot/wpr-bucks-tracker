import { useState } from 'react'
import GameRow from '../components/GameRow.jsx'

const INITIAL_RESULTS = 10

export default function ScheduleTab({ schedule }) {
  const [showAll, setShowAll] = useState(false)

  const played = schedule.events.filter((e) => e.final)
  const upcoming = schedule.events.filter((e) => !e.final)
  const recent = showAll ? [...played].reverse() : [...played].reverse().slice(0, INITIAL_RESULTS)

  return (
    <>
      {upcoming.length > 0 && (
        <div className="card">
          <h2 className="section">Coming up</h2>
          {upcoming.slice(0, 8).map((g) => <GameRow key={g.id} game={g} />)}
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
    </>
  )
}
