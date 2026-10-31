import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { TEAM_ABBR, TEAM_LOGO } from '../config.js'
import { fetchSchedule, fetchStandings } from '../api.js'
import { ctDaysFromToday, gameDate, gameTime, liveLabel, todayWord } from '../format.js'
import { pickFeatured } from '../scheduleFacts.js'
import { useRefreshingData } from '../useRefreshingData.js'
import { destination, trackMiniClick } from './mini-shared.js'
import './mini.css'

// Standings ride along so a scheduled game shows both teams' records instead
// of two empty score slots.
const loadMini = () => Promise.all([fetchSchedule(), fetchStandings()])
  .then(([schedule, standings]) => ({ schedule, standings }))
const anyLive = (d) => d.schedule.events.some((e) => e.live)

function MiniScoreboard() {
  // Same always-on refresh as the full tracker: this card sits in article
  // sidebars all evening, so it has to flip from "Next up" to live to final
  // on its own.
  const { data, error } = useRefreshingData(loadMini, anyLive)

  if (error && !data) return <div className="mini-status">Scoreboard unavailable — retrying shortly.</div>
  if (!data) return <div className="mini-status">Loading…</div>

  const { schedule, standings } = data
  const pick = pickFeatured(schedule.events)
  if (!pick) return <div className="mini-status">No games on the schedule yet.</div>
  const featured = pick.game
  const scheduled = pick.mode === 'next'
  const gameDay = scheduled && ctDaysFromToday(featured.date) === 0
  const opening = !schedule.events.some((e) => e.final) && featured.stage === 'regular'

  const heading = pick.mode === 'live' ? 'Live now'
    : featured.final ? `Final · ${gameDate(featured.date)}`
    : gameDay ? `${todayWord(featured.date)} · ${gameTime(featured.date)} CT`
    : `${opening ? 'Opening night' : 'Next up'} · ${gameDate(featured.date)}`

  const league = [...standings.east, ...standings.west]
  const record = (abbr) => {
    const row = league.find((r) => r.abbr === abbr)
    return row && row.played > 0 ? `${row.wins}–${row.losses}` : '—'
  }
  const bucks = { logo: TEAM_LOGO, name: 'Bucks', pts: scheduled ? record(TEAM_ABBR) : featured.ourScore, won: featured.final && featured.won }
  const opp = { logo: featured.opponent.logo, name: featured.opponent.name, pts: scheduled ? record(featured.opponent.abbr) : featured.theirScore, won: featured.final && !featured.won }
  const [top, bottom] = featured.home ? [opp, bucks] : [bucks, opp]

  const tag = featured.tag ? ` · ${featured.tag}` : ''
  const tv = featured.tv ? ` · ${featured.tv}` : ''
  const next = pick.next
  const meta = pick.mode === 'live' ? `${liveLabel(featured)}${tv}`
    : scheduled ? (gameDay ? `${featured.tv ?? 'Tip-off'}${tag}` : `Tip-off ${gameTime(featured.date)} CT${tv}${tag}`)
    // The morning after, the next game rides along under the final.
    : pick.mode === 'recent' && next ? `Next: ${gameDate(next.date)} · ${gameTime(next.date)} CT ${next.home ? 'vs' : 'at'} the ${next.opponent.name}`
    : `${schedule.seasonLabel} season${tag}`

  return (
    <a className="mini-card" href={destination()} target="_top" onClick={() => trackMiniClick('scoreboard')}>
      <div className="mini-kicker">Bucks scoreboard · Wausau Pilot &amp; Review</div>
      <div className="mini-head">{heading}</div>
      <Row team={top} scheduled={scheduled} />
      <Row team={bottom} scheduled={scheduled} />
      <div className="mini-meta">{meta}</div>
      <div className="mini-cta">Full Bucks tracker →</div>
    </a>
  )
}

// A scheduled game shows each team's record, dimmed, where the score will go.
function Row({ team, scheduled }) {
  return (
    <div className={`mini-matchup ${team.won ? 'won' : ''}`}>
      {team.logo && <img src={team.logo} alt="" />}
      <span className="team-name">{team.name}</span>
      <span className={`pts ${scheduled ? 'dim rec' : ''}`}>{team.pts}</span>
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MiniScoreboard />
  </StrictMode>
)
