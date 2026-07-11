import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { PLAYOFF_LINE, PLAY_IN_LINE, TEAM_ABBR } from '../config.js'
import { fetchStandings } from '../api.js'
import { destination, trackMiniClick } from './mini-shared.js'
import './mini.css'

function MiniStandings() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchStandings().then(setRows).catch((err) => setError(err.message))
  }, [])

  if (error) return <div className="mini-status">Standings unavailable — refresh to retry.</div>
  if (!rows) return <div className="mini-status">Loading…</div>

  // Top of the play-in field, plus the Bucks if they sit below it.
  // MIL presence is guaranteed by fetchStandings.
  const us = rows.find((r) => r.abbr === TEAM_ABBR)
  const shown = rows.filter((r) => r.seed <= PLAY_IN_LINE || r.abbr === TEAM_ABBR)

  return (
    <a className="mini-card" href={destination()} onClick={() => trackMiniClick('standings')}>
      <div className="mini-kicker">Eastern Conference · Wausau Pilot &amp; Review</div>
      <div className="mini-head">
        Bucks: {us.wins}–{us.losses}, #{us.seed} in the East
      </div>
      <table className="mini-standings">
        <tbody>
          {shown.map((row) => (
            <tr key={row.teamId} className={[
              row.abbr === TEAM_ABBR ? 'us' : '',
              row.seed === PLAYOFF_LINE ? 'playoff-line' : '',
            ].filter(Boolean).join(' ')}>
              <td className="seed">{row.seed}</td>
              <td className="team">
                {row.logo && <img src={row.logo} alt="" loading="lazy" />}
                {row.name}
              </td>
              <td className="num">{row.wins}–{row.losses}</td>
              <td className="num">{row.gamesBehind}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mini-cta">Full Bucks tracker →</div>
    </a>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MiniStandings />
  </StrictMode>
)
