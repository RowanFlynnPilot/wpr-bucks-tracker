import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { PLAYOFF_LINE, PLAY_IN_LINE, TEAM_ABBR, TEAM_LOGO } from '../config.js'
import { fetchSchedule, fetchStandings } from '../api.js'
import { gameDate, gameTime, periodLabel } from '../format.js'
import { destination } from './mini-shared.js'
import './mini.css'

// The email snapshot: featured game + the play-in field, in one card. Rendered
// to digest.png by scripts/render-digest.mjs at deploy time — email clients
// can't run the live widget, so they get a picture of it. `?image=1` marks the
// screenshot pass and drops the tap-through CTA (dead pixels in an email).
function MiniDigest() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const isImage = new URLSearchParams(window.location.search).get('image') === '1'

  useEffect(() => {
    Promise.all([fetchSchedule(), fetchStandings()])
      .then(([schedule, standings]) => setData({ schedule, standings }))
      .catch((err) => setError(err.message))
  }, [])

  if (error) return <div className="mini-status">Digest unavailable. ({error})</div>
  if (!data) return <div className="mini-status">Loading…</div>

  const events = data.schedule.events
  const live = events.find((e) => e.live)
  const next = events.find((e) => !e.final && !e.live)
  const played = events.filter((e) => e.final)
  const featured = live ?? next ?? played[played.length - 1] ?? null
  const heading = live ? 'Live now' : featured?.final ? 'Final' : played.length === 0 ? 'Opening night' : 'Next up'

  const east = data.standings.east
  // Unseeded (preseason) teams all show, alphabetical — see fetchStandings.
  const shown = east.filter((r) => r.seed == null || r.seed <= PLAY_IN_LINE || r.abbr === TEAM_ABBR)

  const stamp = new Date().toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'long', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })

  return (
    <div className="mini-card digest">
      <div className="mini-kicker">Bucks digest · Wausau Pilot &amp; Review</div>

      {featured && (
        <>
          <div className="mini-head">
            {heading} · {gameDate(featured.date)}
            {featured.live && ` · ${periodLabel(featured.period, featured.clock)}`}
          </div>
          <Row
            logo={featured.home ? featured.opponent.logo : TEAM_LOGO}
            name={featured.home ? featured.opponent.name : 'Bucks'}
            pts={featured.home ? featured.theirScore : featured.ourScore}
            won={featured.final && (featured.home ? !featured.won : featured.won)}
            scheduled={!featured.final && !featured.live}
          />
          <Row
            logo={featured.home ? TEAM_LOGO : featured.opponent.logo}
            name={featured.home ? 'Bucks' : featured.opponent.name}
            pts={featured.home ? featured.ourScore : featured.theirScore}
            won={featured.final && (featured.home ? featured.won : !featured.won)}
            scheduled={!featured.final && !featured.live}
          />
          {!featured.final && !featured.live && (
            <div className="mini-meta">Tip-off {gameTime(featured.date)} CT{featured.tv ? ` · ${featured.tv}` : ''}</div>
          )}
        </>
      )}

      <div className="digest-section">Eastern Conference</div>
      <table className="mini-standings">
        <tbody>
          {shown.map((row) => (
            <tr key={row.teamId} className={[
              row.abbr === TEAM_ABBR ? 'us' : '',
              row.seed === PLAYOFF_LINE ? 'playoff-line' : '',
            ].filter(Boolean).join(' ')}>
              <td className="seed">{row.seed ?? '–'}</td>
              <td className="team">
                {row.logo && <img src={row.logo} alt="" />}
                {row.name}
              </td>
              <td className="num">{row.wins}–{row.losses}</td>
              <td className="num">{row.gamesBehind}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="digest-stamp">Updated {stamp} CT · data via ESPN</div>
      {!isImage && <a className="mini-cta" href={destination()}>Full Bucks tracker →</a>}
    </div>
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
    <MiniDigest />
  </StrictMode>
)
