// Halfcourt shot chart. ESPN play coordinates: x spans the 50-foot baseline,
// y runs from the baseline (0) toward halfcourt (47), rim centered at (25, 5.25).
// Free throws and dead plays carry sentinel coords and are filtered in api.js.

const W = 50
const H = 47
const COURT = '#b8905a' // hardwood, same tone as the .500 baseline

export default function ShotChart({ shots }) {
  if (shots.length === 0) {
    return <p className="section-note">No charted field-goal attempts for this one.</p>
  }
  const made = shots.filter((s) => s.made)

  return (
    <div className="shot-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={`Shot chart: ${made.length} makes on ${shots.length} field-goal attempts`}>
        <rect x="0" y="0" width={W} height={H} fill="var(--cream)" stroke="var(--line)" strokeWidth="0.3" />
        {/* halfcourt circle */}
        <path d={`M${25 - 6} ${H} A6 6 0 0 1 ${25 + 6} ${H}`} fill="none" stroke={COURT} strokeWidth="0.35" />
        {/* the paint + free-throw circle */}
        <rect x="17" y="0" width="16" height="19" fill="none" stroke={COURT} strokeWidth="0.35" />
        <circle cx="25" cy="19" r="6" fill="none" stroke={COURT} strokeWidth="0.35" />
        {/* backboard + rim */}
        <line x1="22" y1="4" x2="28" y2="4" stroke={COURT} strokeWidth="0.5" />
        <circle cx="25" cy="5.25" r="0.9" fill="none" stroke={COURT} strokeWidth="0.4" />
        {/* three-point line */}
        <path d="M3 0 L3 14 A23.75 23.75 0 0 0 47 14 L47 0" fill="none" stroke={COURT} strokeWidth="0.35" />

        {shots.map((s, i) => s.made
          ? <circle key={i} cx={s.x} cy={s.y} r="0.75" fill="var(--team-soft)" opacity="0.85" />
          : <circle key={i} cx={s.x} cy={s.y} r="0.7" fill="none" stroke="var(--loss)" strokeWidth="0.32" opacity="0.85" />)}
      </svg>
      <div className="legend" style={{ marginTop: 8 }}>
        <span><span className="shot-swatch made" />Made ({made.length})</span>
        <span><span className="shot-swatch miss" />Missed ({shots.length - made.length})</span>
      </div>
    </div>
  )
}
