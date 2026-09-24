import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { TEAM_LOGO } from '../config.js'
import { fetchSchedule } from '../api.js'
import { gameDate, gameTime, liveLabel } from '../format.js'
import { useRefreshingData } from '../useRefreshingData.js'
import { destination, trackMiniClick } from './mini-shared.js'
import './mini.css'

const anyLive = (d) => d.events.some((e) => e.live)

function MiniScoreboard() {
  // Same always-on refresh as the full tracker: this card sits in article
  // sidebars all evening, so it has to flip from "Next up" to live to final
  // on its own.
  const { data, error } = useRefreshingData(fetchSchedule, anyLive)

  if (error && !data) return <div className="mini-status">Scoreboard unavailable — retrying shortly.</div>
  if (!data) return <div className="mini-status">Loading…</div>

  const played = data.events.filter((e) => e.final)
  const live = data.events.find((e) => e.live)
  const next = data.events.find((e) => !e.final && !e.live)
  const featured = live ?? next ?? played[played.length - 1]

  if (!featured) return <div className="mini-status">No games on the schedule yet.</div>

  const heading = live ? 'Live now'
    : featured.final ? 'Final'
    : played.length === 0 && featured.stage === 'regular' ? 'Opening night' : 'Next up'
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
        {featured.live
          ? `${liveLabel(featured)} · ${data.seasonLabel} season`
          : featured.final
            ? `${data.seasonLabel} season${featured.tag ? ` · ${featured.tag}` : ''}`
            : `Tip-off ${gameTime(featured.date)} CT${featured.tag ? ` · ${featured.tag}` : ''}`}
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
