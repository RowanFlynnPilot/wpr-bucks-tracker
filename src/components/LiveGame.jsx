import { useEffect, useRef, useState } from 'react'
import { TEAM_ABBR } from '../config.js'
import { elapsedSec, fetchLiveGameDetail, gameLengthSec } from '../api.js'
import Linescore from './Linescore.jsx'
import ScoreFlow from './ScoreFlow.jsx'

// The game-night layer under the live score: quarter line, the margin so far
// (the film room's score-flow chart, stopping at the current clock), and who's
// leading each team. The summary is refetched whenever the schedule refresh
// (60s while live) brings a new score or clock. Like the scoreboard itself, a
// failed refresh keeps the last good numbers; only a failed first load shows.
const LEADER_CATS = [['points', 'PTS'], ['rebounds', 'REB'], ['assists', 'AST']]

export default function LiveGame({ game }) {
  const [detail, setDetail] = useState(null)
  const [error, setError] = useState(null)
  const hasDetail = useRef(false)
  const tick = `${game.ourScore}-${game.theirScore}-${game.period}-${game.clock}`

  useEffect(() => {
    let alive = true
    fetchLiveGameDetail(game.id)
      .then((d) => {
        if (!alive) return
        hasDetail.current = true
        setDetail(d)
        setError(null)
      })
      .catch((err) => {
        if (!alive) return
        if (hasDetail.current) console.error('Live box refresh failed:', err)
        else setError(err.message)
      })
    return () => { alive = false }
  }, [game.id, tick])

  if (error) return <p className="live-note">The live box score is catching up — it'll fill in on the next refresh. ({error})</p>
  if (!detail) return null

  const maxPeriod = Math.max(detail.maxPeriod, game.period)
  const sorted = [...detail.leaders].sort((a, b) => (a.abbr === TEAM_ABBR ? -1 : 1) - (b.abbr === TEAM_ABBR ? -1 : 1))

  return (
    <div className="live-game">
      <Linescore detail={detail} />
      {/* Before the first basket there's no line to draw yet. */}
      {detail.flow.length > 0 && (
        <ScoreFlow flow={detail.flow} maxPeriod={maxPeriod} totalSec={gameLengthSec(maxPeriod)}
          nowSec={elapsedSec(game.period, game.clock)} compact />
      )}
      <div className="live-leaders">
        {sorted.map((team) => (
          <div className="live-leader-row" key={team.abbr}>
            <span className="ll-team">{team.abbr === TEAM_ABBR ? 'Bucks' : game.opponent.name}</span>
            <span className="ll-cats">
              {LEADER_CATS.map(([name, unit]) => {
                const c = team.cats.find((x) => x.name === name)
                return c?.athlete
                  ? <span key={name}>{lastName(c.athlete)} <b>{c.value}</b> {unit}</span>
                  : null
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// "Jaime Jaquez Jr." → "Jaquez Jr." — room for three on a phone line.
function lastName(full) {
  const parts = full.split(' ')
  return parts.length > 1 ? parts.slice(1).join(' ') : full
}
