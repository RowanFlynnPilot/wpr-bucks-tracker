import { useEffect, useState } from 'react'
import { TEAM_ABBR } from '../config.js'
import { fetchGameDetail } from '../api.js'
import { gameDate, periodLabel } from '../format.js'
import { buildRecapContext, recapFor } from '../recaps.js'
import Section from '../components/Section.jsx'
import GameFlow from '../components/GameFlow.jsx'
import ShotChart from '../components/ShotChart.jsx'

// Replay any final: win probability, the turning point, the full box score,
// game leaders, the big runs, the shot chart, and the team-stats comparison —
// all from ESPN's summary endpoint, fetched per game on demand and cached in
// api.js. The selected game lives in App (deep-linkable as ?game=), so any
// schedule row or the hero can land here on a specific box score.
export default function FilmRoomTab({ schedule, gameId, onPickGame }) {
  const finals = [...schedule.events.filter((e) => e.final)].reverse()
  // Validate the requested id against real finals; default to the latest.
  const selected = finals.some((g) => g.id === gameId) ? gameId : finals[0]?.id ?? null
  const [detail, setDetail] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!selected) return
    let alive = true
    setDetail(null)
    setError(null)
    fetchGameDetail(selected)
      .then((d) => { if (alive) setDetail(d) })
      .catch((err) => { if (alive) setError(err.message) })
    return () => { alive = false }
  }, [selected])

  if (finals.length === 0) {
    return <div className="status-block">The film room opens after the season's first final.</div>
  }

  const game = finals.find((g) => g.id === selected)
  const recap = game ? recapFor(game, buildRecapContext(schedule.events)) : null

  return (
    <>
      <Section kicker="The film room" title="How it unfolded">
        <div className="film-picker">
          <label htmlFor="film-game">Game</label>
          <select id="film-game" value={selected ?? ''} onChange={(e) => onPickGame(e.target.value)}>
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
            {recap && <p className="film-recap">{recap}</p>}
            <Linescore detail={detail} />
            <GameFlow winProb={detail.winProb} turning={detail.turning} swings={detail.swings} won={game.won} />
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
      </Section>

      {detail && game && (
        <>
          <Section kicker="The box score" title="Game leaders">
            <GameLeaders leaders={detail.leaders} />
          </Section>
          <BoxScoreTable boxScore={detail.boxScore} />
          <RunsCard scoring={detail.scoring} opponent={game.opponent.name} />
          <Section
            kicker="The shot chart"
            title="Where the shots fell"
            note="Every Bucks field-goal attempt — filled dots went in."
          >
            <ShotChart shots={detail.shots} />
          </Section>
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
    <div className="game-leaders">
      {sorted.map((team) => (
        <div key={team.abbr}>
          <h3 className="gl-team">{team.abbr === TEAM_ABBR ? 'Bucks' : team.abbr}</h3>
          {team.cats.filter((c) => c.athlete).map((c) => (
            <div className="gl-row" key={c.name}>
              {c.headshot
                ? <img className="gl-face" src={c.headshot} alt="" loading="lazy" />
                : <span className="gl-face gap" aria-hidden="true" />}
              <span className="gl-body">
                <span className="gl-cat">{c.label}</span>
                <span className="gl-who">{c.athlete}</span>
              </span>
              <span className="gl-val">{c.value}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// The Bucks player table. ESPN sends the column names alongside the rows, so
// we select the columns we want by name and stay stable if their order shifts.
const BOX_COLUMNS = ['MIN', 'PTS', 'REB', 'AST', 'FG', '3PT', '+/-']

function BoxScoreTable({ boxScore }) {
  if (!boxScore || boxScore.rows.length === 0) return null
  const idx = BOX_COLUMNS.map((c) => [c, boxScore.names.indexOf(c)]).filter(([, i]) => i >= 0)
  if (idx.length === 0) return null
  const ptsIdx = boxScore.names.indexOf('PTS')
  const rows = [...boxScore.rows].sort(
    (a, b) => (parseInt(b.stats[ptsIdx], 10) || 0) - (parseInt(a.stats[ptsIdx], 10) || 0)
  )
  return (
    <Section kicker="The numbers" title="Bucks box score">
      <div className="card box-scroll">
        <table className="box-table">
          <thead>
            <tr>
              <th className="player">Player</th>
              {idx.map(([label]) => <th key={label}>{label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.name}-${r.jersey}`}>
                <td className="player">
                  {r.name}
                  {r.starter && <span className="starter" title="Starter"> *</span>}
                </td>
                {idx.map(([label, i]) => <td key={label}>{r.stats[i]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="section-note" style={{ marginTop: 10 }}>
          Sorted by points · * started · DNPs omitted.
        </p>
      </div>
    </Section>
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
    <Section kicker="The swings" title="The big runs" note="Unanswered points, biggest first.">
      {runs.map((r, i) => (
        <div className="run-row" key={i}>
          <span className={`run-score ${r.ours ? 'ours' : 'theirs'}`}>{r.points}–0</span>
          <span className="run-who">{r.ours ? 'Bucks' : opponent} run</span>
          <span className="run-when">
            {periodLabel(r.start.period, r.start.clock)} → {periodLabel(r.end.period, r.end.clock)}
          </span>
        </div>
      ))}
    </Section>
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
    <Section kicker="Head to head" title="The team stats">
      <div className="card">
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
    </Section>
  )
}
