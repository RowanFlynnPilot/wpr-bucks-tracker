import { TEAM_ABBR } from '../config.js'
import RaceChart from '../components/RaceChart.jsx'
import StandingsTable from '../components/StandingsTable.jsx'
import GameRow from '../components/GameRow.jsx'

export default function SeasonTab({ schedule, standings }) {
  // Presence guaranteed by fetchStandings — it throws before render otherwise.
  const us = standings.find((row) => row.abbr === TEAM_ABBR)

  const played = schedule.events.filter((e) => e.final)
  const lastGame = played[played.length - 1] ?? null
  const nextGame = schedule.events.find((e) => !e.final) ?? null

  return (
    <>
      <div className="pulse">
        <Stat value={`${us.wins}–${us.losses}`} label="Record" />
        <Stat value={`#${us.seed}`} label="East seed" />
        <Stat value={us.streak} label="Streak" />
        <Stat value={us.lastTen} label="Last 10" />
        <Stat value={us.pointDiff} label="Point diff / game" />
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h2 className="section">The season, game by game</h2>
        <p className="section-note">Games above or below .500 after each regular-season game.</p>
        <RaceChart games={played.filter((g) => !g.postseason)} />
      </div>

      <div className="card">
        <h2 className="section">{nextGame ? 'Last game & next up' : 'How it ended'}</h2>
        {lastGame && <GameRow game={lastGame} />}
        {nextGame
          ? <GameRow game={nextGame} />
          : <p className="section-note" style={{ marginTop: 10 }}>
              Season complete. Next season's schedule lands here when the NBA publishes it.
            </p>}
      </div>

      <div className="card">
        <h2 className="section">Eastern Conference</h2>
        <StandingsTable rows={standings} />
      </div>
    </>
  )
}

function Stat({ value, label }) {
  return (
    <div className="stat">
      <div className="value">{value}</div>
      <div className="label">{label}</div>
    </div>
  )
}
