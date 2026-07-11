import { useEffect, useState } from 'react'
import { TEAM_ABBR } from '../config.js'
import { fetchGameDetail } from '../api.js'
import { gameDate, periodLabel, track } from '../format.js'
import GameFlow from '../components/GameFlow.jsx'
import ShotChart from '../components/ShotChart.jsx'

// Replay any final: win probability, the turning point, game leaders, the big
// runs, the shot chart, and the team-stats comparison — all from ESPN's summary
// endpoint, fetched per game on demand and cached in api.js.
export default function FilmRoomTab({ schedule }) {
  const finals = [...schedule.events.filter((e) => e.final)].reverse()
  const [gameId, setGameId] = useState(finals[0]?.id ?? null)
  const [detail, setDetail] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!gameId) return
    let alive = true
    setDetail(null)
    setError(null)
    fetchGameDetail(gameId)
      .then((d) => { if (alive) setDetail(d) })
      .catch((err) => { if (alive) setError(err.message) })
    return () => { alive = false }
  }, [gameId])

  if (finals.length === 0) {
    return <div className="status-block">The film room opens after the season's first final.</div>
  }

  const game = finals.find((g) => g.id === gameId)
  const pick = (id) => {
    setGameId(id)
    track('Film Game')
  }

  return (
    <>
      <div className="card">
        <h2 className="section">How it unfolded</h2>
        <div className="film-picker">
          <label htmlFor="film-game">Game</label>
          <select id="film-game" value={gameId ?? ''} onChange={(e) => pick(e.target.value)}>
            {finals.map((g) => (
              <option key={g.id} value={g.id}>
                {gameDate(g.date)} · {g.home ? 'vs' : 'at'} {g.opponent.name} · {g.won ? 'W' : 'L'}{' '}
                {g.ourScore}–{g.theirScore}{g.postseason ? ' · Playoffs' : ''}{g.cup ? ' · NBA Cup' : ''}
              </option>
            ))}
          </select>
        </div>

        {error && <div className="status-block error">Couldn't load this game. ({error})</div>}
        {!error && !detail && <div className="status-block">Rolling the tape…</div>}
        {detail && game && (
          <>
            <Linescore detail={detail} />
            <GameFlow winProb={detail.winProb} turning={detail.turning} won={game.won} />
            <p className="section-note">
              Bucks win probability, play by play — 100 is a sure Bucks win; the ring marks the turning point.
            </p>
            {detail.turning && (
              <div className="turning-point">
                <div className="tp-kicker">
                  The turning point · {periodLabel(detail.turning.period, detail.turning.clock)}
                </div>
                <div className="tp-text">
                  {detail.turning.text}{' '}
                  <span className="tp-swing">
                    ({detail.turning.ourSwing >= 0 ? '+' : ''}{Math.round(detail.turning.ourSwing * 100)}% Bucks)
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {detail && game && (
        <>
          <GameLeaders leaders={detail.leaders} />
          <RunsCard scoring={detail.scoring} opponent={game.opponent.name} />
          <div className="card">
            <h2 className="section">Where the shots fell</h2>
            <p className="section-note">Every Bucks field-goal attempt — filled dots went in.</p>
            <ShotChart shots={detail.shots} />
          </div>
          <TeamStats detail={detail} game={game} />
        </>
      )}
    </>
  )
}

function Linescore({ detail }) {
  const { away, home } = detail
  const quarters = Math.max(away.quarters.length, home.quarters.length)
  if (quarters === 0) return null
  const label = (i) => (i < 4 ? `Q${i + 1}` : i === 4 ? 'OT' : `${i - 3}OT`)
  return (
    <table className="linescore">
      <thead>
        <tr>
          <th></th>
          {Array.from({ length: quarters }, (_, i) => <th key={i}>{label(i)}</th>)}
          <th>T</th>
        </tr>
      </thead>
      <tbody>
        {[away, home].map((t) => (
          <tr key={t.abbr} className={t.abbr === TEAM_ABBR ? 'us' : ''}>
            <td className="team">{t.name}</td>
            {Array.from({ length: quarters }, (_, i) => <td key={i}>{t.quarters[i] ?? ''}</td>)}
            <td className="total">{t.score}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function GameLeaders({ leaders }) {
  if (leaders.length === 0) return null
  // Bucks first, opponent second.
  const sorted = [...leaders].sort((a, b) => (a.abbr === TEAM_ABBR ? -1 : 1) - (b.abbr === TEAM_ABBR ? -1 : 1))
  return (
    <div className="card">
      <h2 className="section">Game leaders</h2>
      <div className="game-leaders">
        {sorted.map((team) => (
          <div key={team.abbr}>
            <h3 className="gl-team">{team.abbr === TEAM_ABBR ? 'Bucks' : team.abbr}</h3>
            {team.cats.filter((c) => c.athlete).map((c) => (
              <div className="gl-row" key={c.name}>
                <span className="gl-cat">{c.label}</span>
                <span className="gl-who">{c.athlete}</span>
                <span className="gl-val">{c.value}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// Unanswered scoring stretches, biggest first.
function biggestRuns(scoring) {
  const runs = []
  let current = null
  for (const p of scoring) {
    if (current && current.ours === p.ours) {
      current.points += p.points
      current.end = p
    } else {
      if (current) runs.push(current)
      current = { ours: p.ours, points: p.points, start: p, end: p }
    }
  }
  if (current) runs.push(current)
  return runs.filter((r) => r.points >= 8).sort((a, b) => b.points - a.points).slice(0, 3)
}

function RunsCard({ scoring, opponent }) {
  const runs = biggestRuns(scoring)
  if (runs.length === 0) return null
  return (
    <div className="card">
      <h2 className="section">The big runs</h2>
      {runs.map((r, i) => (
        <div className="run-row" key={i}>
          <span className={`run-score ${r.ours ? 'ours' : 'theirs'}`}>{r.points}–0</span>
          <span className="run-who">{r.ours ? 'Bucks' : opponent} run</span>
          <span className="run-when">
            {periodLabel(r.start.period, r.start.clock)} → {periodLabel(r.end.period, r.end.clock)}
          </span>
        </div>
      ))}
      <p className="section-note" style={{ marginTop: 8 }}>Unanswered points, biggest first.</p>
    </div>
  )
}

const STAT_ROWS = [
  ['fieldGoalPct', 'FG%'],
  ['threePointFieldGoalsMade-threePointFieldGoalsAttempted', '3-pointers'],
  ['freeThrowsMade-freeThrowsAttempted', 'Free throws'],
  ['totalRebounds', 'Rebounds'],
  ['assists', 'Assists'],
  ['turnovers', 'Turnovers'],
  ['pointsInPaint', 'Points in the paint'],
  ['fastBreakPoints', 'Fast-break points'],
  ['largestLead', 'Largest lead'],
]

function TeamStats({ detail, game }) {
  const byKey = Object.fromEntries(detail.teamStats.map((s) => [s.key, s]))
  const rows = STAT_ROWS.filter(([key]) => byKey[key])
  if (rows.length === 0) return null
  return (
    <div className="card">
      <h2 className="section">The team stats</h2>
      <table className="team-stats">
        <thead>
          <tr><th></th><th>Bucks</th><th>{game.opponent.name}</th></tr>
        </thead>
        <tbody>
          {rows.map(([key, label]) => (
            <tr key={key}>
              <td className="label">{label}</td>
              <td>{byKey[key].us}</td>
              <td>{byKey[key].them}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
