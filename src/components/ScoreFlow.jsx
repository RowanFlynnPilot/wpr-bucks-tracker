// The score, throughout the game: Bucks margin after every basket on a real
// elapsed-time axis, stepped (the score holds between scores), tinted green
// while Milwaukee leads and rust while it trails, with quarter lines. Replaces
// the win-probability model with the actual scoreboard — hand-rolled SVG like
// RaceChart, no chart lib.

const W = 820
const H = 260
const PAD = { top: 16, right: 14, bottom: 26, left: 40 }

export default function ScoreFlow({ flow, totalSec, maxPeriod }) {
  if (flow.length === 0) {
    return <p className="section-note">No scoring timeline for this one.</p>
  }

  const maxAbs = Math.max(6, ...flow.map((p) => Math.abs(p.margin)))
  const x = (t) => PAD.left + (t / totalSec) * (W - PAD.left - PAD.right)
  const y = (m) => PAD.top + ((maxAbs - m) / (2 * maxAbs)) * (H - PAD.top - PAD.bottom)

  // Stepped path: hold the previous margin until the moment of each score.
  let line = `M${x(0).toFixed(1)},${y(0).toFixed(1)}`
  let prev = 0
  for (const p of flow) {
    line += ` L${x(p.t).toFixed(1)},${y(prev).toFixed(1)} L${x(p.t).toFixed(1)},${y(p.margin).toFixed(1)}`
    prev = p.margin
  }
  line += ` L${x(totalSec).toFixed(1)},${y(prev).toFixed(1)}`
  const area = `${line} L${x(totalSec).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`

  // Quarter boundaries (Q1–4 are 12 minutes, OTs 5).
  const boundaries = []
  let acc = 0
  for (let q = 1; q < maxPeriod; q++) {
    acc += q <= 4 ? 720 : 300
    boundaries.push({ t: acc, label: q + 1 <= 4 ? `Q${q + 1}` : q + 1 === 5 ? 'OT' : `${q - 3}OT` })
  }

  const gridStep = maxAbs > 15 ? 10 : 5
  const grid = []
  for (let m = Math.ceil(-maxAbs / gridStep) * gridStep; m <= maxAbs; m += gridStep) {
    if (m !== 0) grid.push(m)
  }

  const final = flow[flow.length - 1].margin
  const high = Math.max(0, ...flow.map((p) => p.margin))
  const low = Math.min(0, ...flow.map((p) => p.margin))

  return (
    <div className="race-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={`The score margin through the game — biggest Bucks lead ${high}, worst deficit ${low}, final margin ${final >= 0 ? '+' : ''}${final}`}>
        <defs>
          <clipPath id="sf-above"><rect x="0" y="0" width={W} height={y(0)} /></clipPath>
          <clipPath id="sf-below"><rect x="0" y={y(0)} width={W} height={H - y(0)} /></clipPath>
        </defs>

        {grid.map((m) => (
          <g key={m}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(m)} y2={y(m)}
              stroke="var(--cream-deep)" strokeWidth="1" />
            <text x={PAD.left - 8} y={y(m) + 4} textAnchor="end"
              fontFamily="var(--font-data)" fontSize="11" fill="var(--ink-soft)">
              {m > 0 ? `+${m}` : m}
            </text>
          </g>
        ))}

        {boundaries.map((b) => (
          <g key={b.t}>
            <line x1={x(b.t)} x2={x(b.t)} y1={PAD.top} y2={H - PAD.bottom}
              stroke="var(--line)" strokeWidth="1" strokeDasharray="3 4" />
            <text x={x(b.t) + 4} y={PAD.top + 10}
              fontFamily="var(--font-data)" fontSize="10" fill="var(--ink-soft)">
              {b.label}
            </text>
          </g>
        ))}

        {/* leading / trailing tint, split at even */}
        <path d={area} fill="var(--win)" opacity="0.1" clipPath="url(#sf-above)" />
        <path d={area} fill="var(--loss)" opacity="0.1" clipPath="url(#sf-below)" />

        {/* even — the hardwood */}
        <line x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)}
          stroke="#b8905a" strokeWidth="2" />

        <path d={line} fill="none" stroke="var(--team)" strokeWidth="2.5"
          strokeLinejoin="round" strokeLinecap="round" />

        <circle cx={x(totalSec)} cy={y(final)} r="4" fill="var(--team)" />
        <text x={W - PAD.right} y={y(final) + (final >= 0 ? -10 : 18)} textAnchor="end"
          fontFamily="var(--font-data)" fontSize="12" fontWeight="700" fill="var(--team)">
          {final >= 0 ? `+${final}` : final}
        </text>

        <text x={W - PAD.right} y={H - 6} textAnchor="end"
          fontFamily="var(--font-data)" fontSize="11" fill="var(--ink-soft)">
          Game time →
        </text>
      </svg>
      <div className="chart-legend">
        <span>Bucks lead above the hardwood line</span>
        <span>biggest lead +{high} · worst deficit {low}</span>
      </div>
    </div>
  )
}
