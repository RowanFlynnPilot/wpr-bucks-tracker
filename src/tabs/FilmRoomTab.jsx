import { Fragment, useEffect, useState } from 'react'
import { TEAM_ABBR } from '../config.js'
import { fetchGameDetail, fetchPlayerSeason } from '../api.js'
import { gameDate, periodLabel, track } from '../format.js'
import { buildRecapContext, recapFor } from '../recaps.js'
import Section from '../components/Section.jsx'
import ScoreFlow from '../components/ScoreFlow.jsx'
import ShotChart from '../components/ShotChart.jsx'

// Replay any final: the score flow, the full box score (rows open into season
// stat sheets), game leaders, the big runs, the shot chart with a per-player
// filter, and the team-stats comparison — all from ESPN's summary endpoint,
// fetched per game on demand and cached in api.js. The selected game lives in
// App (deep-linkable as ?game=), so any schedule row or the hero can land here.
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

  // Each player's game shooting line for the shot-chart filter, off the box score.
  const shotPlayers = (detail?.boxScore?.rows ?? [])
    .filter((r) => r.id)
    .map((r) => {
      const col = (name) => {
        const i = detail.boxScore.names.indexOf(name)
        return i >= 0 ? r.stats[i] : null
      }
      const pts = col('PTS')
      const fg = col('FG')
      const three = col('3PT')
      const statLine = [
        pts != null ? `${pts} points` : null,
        fg ? `${fg} FG` : null,
        three ? `${three} from three` : null,
      ].filter(Boolean).join(' · ')
      return { id: r.id, name: r.name, statLine }
    })

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
            <ScoreFlow flow={detail.flow} totalSec={detail.totalSec} maxPeriod={detail.maxPeriod} />
          </>
        )}
      </Section>

      {detail && game && (
        <>
          <BoxScoreTable boxScore={detail.boxScore} />
          <Section kicker="At a glance" title="Game leaders">
            <GameLeaders leaders={detail.leaders} />
          </Section>
          <RunsCard scoring={detail.scoring} opponent={game.opponent.name} />
          <Section
            kicker="The shot chart"
            title="Where the shots fell"
            note="Every Bucks field-goal attempt — filled dots went in."
          >
            <ShotChart key={selected} shots={detail.shots} players={shotPlayers} />
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

// The Bucks player table. ESPN sends the column names alongside the rows, so
// we select the columns we want by name and stay stable if their order shifts.
// Rows open into a season stat sheet (fetched per player, cached in api.js).
const BOX_COLUMNS = ['MIN', 'PTS', 'REB', 'AST', 'FG', '3PT', '+/-']

function BoxScoreTable({ boxScore }) {
  const [openId, setOpenId] = useState(null)
  if (!boxScore || boxScore.rows.length === 0) return null
  const idx = BOX_COLUMNS.map((c) => [c, boxScore.names.indexOf(c)]).filter(([, i]) => i >= 0)
  if (idx.length === 0) return null
  const ptsIdx = boxScore.names.indexOf('PTS')
  const rows = [...boxScore.rows].sort(
    (a, b) => (parseInt(b.stats[ptsIdx], 10) || 0) - (parseInt(a.stats[ptsIdx], 10) || 0)
  )

  const toggle = (id) => {
    const next = openId === id ? null : id
    setOpenId(next)
    if (next) track('Player Card')
  }

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
              <Fragment key={`${r.name}-${r.jersey}`}>
                <tr
                  className={`box-row ${r.id ? 'clickable' : ''} ${openId === r.id ? 'open' : ''}`}
                  onClick={r.id ? () => toggle(r.id) : undefined}
                  onKeyDown={r.id ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(r.id) } } : undefined}
                  tabIndex={r.id ? 0 : undefined}
                  aria-expanded={r.id ? openId === r.id : undefined}
                >
                  <td className="player">
                    {r.name}
                    {r.starter && <span className="starter" title="Starter"> *</span>}
                  </td>
                  {idx.map(([label, i]) => <td key={label}>{r.stats[i]}</td>)}
                </tr>
                {openId === r.id && (
                  <tr className="box-expand">
                    <td colSpan={idx.length + 1}>
                      <PlayerSeason id={r.id} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        <p className="section-note" style={{ marginTop: 10 }}>
          Sorted by points · * started · DNPs omitted · tap a player for their season sheet.
        </p>
      </div>
    </Section>
  )
}

// The season stat sheet that unfolds under a clicked box-score row.
const SEASON_TILES = [
  ['avgPoints', 'PPG'], ['avgRebounds', 'RPG'], ['avgAssists', 'APG'],
  ['avgSteals', 'SPG'], ['avgBlocks', 'BPG'], ['fieldGoalPct', 'FG%'],
  ['threePointFieldGoalPct', '3P%'], ['freeThrowPct', 'FT%'],
  ['avgMinutes', 'MIN'], ['gamesPlayed', 'Games'],
]

function PlayerSeason({ id }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    fetchPlayerSeason(id)
      .then((d) => { if (alive) setData(d) })
      .catch((err) => { if (alive) setError(err.message) })
    return () => { alive = false }
  }, [id])

  if (error) return <div className="ps-note">Couldn't load the season sheet. ({error})</div>
  if (!data) return <div className="ps-note">Pulling the season numbers…</div>

  const s = data.stats ?? {}
  const tiles = SEASON_TILES.filter(([key]) => s[key] != null)
  return (
    <div className="player-season">
      {data.headshot && <img src={data.headshot} alt="" loading="lazy" />}
      <div className="ps-body">
        <div className="ps-name">
          {data.name}
          <span className="ps-meta"> {data.position}{data.jersey && ` · #${data.jersey}`}</span>
        </div>
        {tiles.length > 0 ? (
          <div className="ps-tiles">
            {tiles.map(([key, label]) => (
              <span className="ps-tile" key={key}><b>{s[key]}</b> {label}</span>
            ))}
          </div>
        ) : (
          <div className="ps-note">No season averages published yet.</div>
        )}
        <div className="ps-note">Regular-season averages · tap the row again to close.</div>
      </div>
    </div>
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

// Lower is better only for giveaways; everything else, bigger number wins the row.
const LOWER_BETTER = new Set(['turnovers'])

function leader(key, us, them) {
  const a = parseFloat(String(us).match(/-?\d+(\.\d+)?/)?.[0])
  const b = parseFloat(String(them).match(/-?\d+(\.\d+)?/)?.[0])
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) return null
  return (LOWER_BETTER.has(key) ? a < b : a > b) ? 'us' : 'them'
}

function TeamStats({ detail, game }) {
  const byKey = Object.fromEntries(detail.teamStats.map((s) => [s.key, s]))
  const rows = STAT_ROWS.filter(([key]) => byKey[key])
  if (rows.length === 0) return null
  return (
    <Section kicker="Head to head" title="The team stats" note="The better number in each row is bolded.">
      <div className="card">
        <table className="team-stats">
          <thead>
            <tr><th></th><th>Bucks</th><th>{game.opponent.name}</th></tr>
          </thead>
          <tbody>
            {rows.map(([key, label]) => {
              const lead = leader(key, byKey[key].us, byKey[key].them)
              return (
                <tr key={key}>
                  <td className="label">{label}</td>
                  <td className={lead === 'us' ? 'lead' : ''}>{byKey[key].us}</td>
                  <td className={lead === 'them' ? 'lead' : ''}>{byKey[key].them}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Section>
  )
}
