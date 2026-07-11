import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { TEAM_LOGO } from '../config.js'
import { fetchSchedule } from '../api.js'
import { gameDate, gameTime } from '../format.js'
import { destination, trackMiniClick } from './mini-shared.js'
import './mini.css'

function MiniScoreboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchSchedule().then(setData).catch((err) => setError(err.message))
  }, [])

  // Live-game polling, same pattern as the full tracker: self-sustaining
  // 60s chain that stops at the final buzzer.
  useEffect(() => {
    if (!data || !data.events.some((e) => e.live)) return
    const timer = setTimeout(() => {
      fetchSchedule().then(setData)
        .catch((err) => console.error('Live refresh failed:', err))
    }, 60_000)
    return () => clearTimeout(timer)
  }, [data])

  if (error) return <div className="mini-status">Scoreboard unavailable — refresh to retry.</div>
  if (!data) return <div className="mini-status">Loading…</div>

  const played = data.events.filter((e) => e.final)
  const live = data.events.find((e) => e.live)
  const next = data.events.find((e) => !e.final && !e.live)
  const featured = live ?? next ?? played[played.length - 1]

  if (!featured) return <div className="mini-status">No games on the schedule yet.</div>

  const heading = live ? 'Live now' : featured.final ? 'Final' : 'Next up'
  const bucksPts = featured.ourScore
  const oppPts = featured.theirScore

  return (
    <a className="mini-card" href={destination()} onClick={() => trackMiniClick('scoreboard')}>
      <div className="mini-kicker">Bucks scoreboard · Wausau Pilot &amp; Review</div>
      <div className="mini-head">{heading} · {gameDate(featured.date)}</div>

      <Row logo={featured.home ? featured.opponent.logo : TEAM_LOGO}
        name={featured.home ? featured.opponent.name : 'Bucks'}
        pts={featured.home ? oppPts : bucksPts}
        won={featured.final && (featured.home ? !featured.won : featured.won)}
        scheduled={!featured.final && !featured.live} />
      <Row logo={featured.home ? TEAM_LOGO : featured.opponent.logo}
        name={featured.home ? 'Bucks' : featured.opponent.name}
        pts={featured.home ? bucksPts : oppPts}
        won={featured.final && (featured.home ? featured.won : !featured.won)}
        scheduled={!featured.final && !featured.live} />

      <div className="mini-meta">
        {featured.final || featured.live
          ? `${data.seasonLabel} season${featured.postseason ? ' · Playoffs' : ''}`
          : `Tip-off ${gameTime(featured.date)} CT`}
      </div>
      <div className="mini-cta">Full Bucks tracker →</div>
    </a>
  )
}

function Row({ logo, name, pts, won, scheduled }) {
  return (
    <div className={`mini-matchup ${won ? 'won' : ''}`}>
      {logo && <img src={logo} alt="" />}
      <span className="team-name">{name}</span>
      <span className={`pts ${scheduled ? 'dim' : ''}`}>{scheduled ? '—' : pts}</span>
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MiniScoreboard />
  </StrictMode>
)
