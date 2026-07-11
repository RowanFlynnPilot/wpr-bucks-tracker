import { useState } from 'react'
import { track } from '../format.js'

// Halfcourt shot chart with a per-player filter. ESPN play coordinates: x spans
// the 50-foot baseline, y runs from the baseline (0) toward halfcourt (47), rim
// centered at (25, 5.25). Free throws and dead plays carry sentinel coords and
// are filtered in api.js. `players` carries each Bucks player's game shooting
// line from the box score, shown when they're selected.

const W = 50
const H = 47
const COURT = '#b8905a' // hardwood, same tone as the .500 baseline

export default function ShotChart({ shots, players = [] }) {
  const [who, setWho] = useState('all')

  if (shots.length === 0) {
    return <p className="section-note">No charted field-goal attempts for this one.</p>
  }

  const shown = who === 'all' ? shots : shots.filter((s) => s.shooterId === who)
  const selected = players.find((p) => p.id === who) ?? null
  const made = shown.filter((s) => s.made)

  const pick = (id) => {
    setWho(id)
    if (id !== 'all') track('Shot Filter')
  }

  return (
    <div className="shot-chart">
      {players.length > 0 && (
        <div className="film-picker shot-filter">
          <label htmlFor="shot-player">Player</label>
          <select id="shot-player" value={who} onChange={(e) => pick(e.target.value)}>
            <option value="all">All Bucks</option>
            {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}

      {selected && <p className="shot-statline">{selected.name} tonight: {selected.statLine}.</p>}

      <svg viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={`Shot chart${selected ? ` for ${selected.name}` : ''}: ${made.length} makes on ${shown.length} field-goal attempts`}>
        {/* hardwood wash so it reads as a court, not a diagram */}
        <rect x="0" y="0" width={W} height={H} fill="#f2e6cf" stroke={COURT} strokeWidth="0.4" />
        {/* halfcourt circle */}
        <path d={`M${25 - 6} ${H} A6 6 0 0 1 ${25 + 6} ${H}`} fill="none" stroke={COURT} strokeWidth="0.45" />
        {/* the paint + free-throw circle */}
        <rect x="17" y="0" width="16" height="19" fill="#eeddc0" stroke={COURT} strokeWidth="0.45" />
        <circle cx="25" cy="19" r="6" fill="none" stroke={COURT} strokeWidth="0.45" />
        {/* backboard + rim */}
        <line x1="22" y1="4" x2="28" y2="4" stroke={COURT} strokeWidth="0.6" />
        <circle cx="25" cy="5.25" r="0.9" fill="none" stroke={COURT} strokeWidth="0.5" />
        {/* three-point line */}
        <path d="M3 0 L3 14 A23.75 23.75 0 0 0 47 14 L47 0" fill="none" stroke={COURT} strokeWidth="0.45" />

        {shown.map((s, i) => s.made
          ? <circle key={i} cx={s.x} cy={s.y} r="0.75" fill="var(--team-soft)" opacity="0.85" />
          : <circle key={i} cx={s.x} cy={s.y} r="0.7" fill="none" stroke="var(--loss)" strokeWidth="0.32" opacity="0.85" />)}
      </svg>

      {shown.length === 0 ? (
        <p className="section-note" style={{ marginTop: 8 }}>No charted attempts for this player.</p>
      ) : (
        <div className="legend" style={{ marginTop: 8 }}>
          <span><span className="shot-swatch made" />Made ({made.length})</span>
          <span><span className="shot-swatch miss" />Missed ({shown.length - made.length})</span>
        </div>
      )}
    </div>
  )
}
