import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PLAYOFF_LINE, PLAY_IN_LINE, TEAM_ABBR } from '../config.js'
import { fetchStandings } from '../api.js'
import { useRefreshingData } from '../useRefreshingData.js'
import { destination, trackMiniClick } from './mini-shared.js'
import './mini.css'

// Standings move at most once a game, so this card refreshes every 10 minutes
// (and on tab return) rather than on the scoreboard's live cadence.
const loadEast = () => fetchStandings().then((s) => s.east)
const never = () => false
const STANDINGS_REFRESH_MS = 600_000

function MiniStandings() {
  const { data: rows, error } = useRefreshingData(loadEast, never, STANDINGS_REFRESH_MS)

  if (error && !rows) return <div className="mini-status">Standings unavailable — retrying shortly.</div>
  if (!rows) return <div className="mini-status">Loading…</div>

  // Top of the play-in field, plus the Bucks if they sit below it. Before
  // opening night nobody is seeded, so the whole (alphabetical) East shows.
  // MIL presence is guaranteed by fetchStandings.
  const us = rows.find((r) => r.abbr === TEAM_ABBR)
  const shown = rows.filter((r) => r.seed == null || r.seed <= PLAY_IN_LINE || r.abbr === TEAM_ABBR)

  return (
    <a className="mini-card" href={destination()} onClick={() => trackMiniClick('standings')}>
      <div className="mini-kicker">Eastern Conference · Wausau Pilot &amp; Review</div>
      <div className="mini-head">
        {us.seed
          ? <>Bucks: {us.wins}–{us.losses}, #{us.seed} in the East</>
          : 'Everyone’s 0–0 — the race starts on opening night'}
      </div>
      <table className="mini-standings">
        <tbody>
          {shown.map((row) => (
            <tr key={row.teamId} className={[
              row.abbr === TEAM_ABBR ? 'us' : '',
              row.seed === PLAYOFF_LINE ? 'playoff-line' : '',
            ].filter(Boolean).join(' ')}>
              <td className="seed">{row.seed ?? '–'}</td>
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
