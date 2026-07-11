// Win probability across the game, drawn as a single SVG path with a two-tone
// area fill (green when the Bucks are favored, rust when they're not) and
// hardwood dots on the swing plays. Hand-rolled like RaceChart — no chart lib.

const W = 820
const H = 260
const PAD = { top: 14, right: 14, bottom: 24, left: 40 }

export default function GameFlow({ winProb, turning, swings = [], won }) {
  if (winProb.length < 2) {
    return <p className="section-note">ESPN didn't publish win probability for this one.</p>
  }

  const x = (i) => PAD.left + (i / (winProb.length - 1)) * (W - PAD.left - PAD.right)
  const y = (p) => PAD.top + (1 - p) * (H - PAD.top - PAD.bottom)

  const line = winProb
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p).toFixed(1)}`)
    .join(' ')
  // Close the line down to the 50% midline for the two-tone fill.
  const area = `${line} L${x(winProb.length - 1).toFixed(1)},${y(0.5).toFixed(1)} L${x(0).toFixed(1)},${y(0.5).toFixed(1)} Z`

  return (
    <div className="race-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={`Bucks win probability across the game, ending in a ${won ? 'win' : 'loss'}`}>
        <defs>
          <clipPath id="gf-above"><rect x="0" y="0" width={W} height={y(0.5)} /></clipPath>
          <clipPath id="gf-below"><rect x="0" y={y(0.5)} width={W} height={H - y(0.5)} /></clipPath>
        </defs>

        {[1, 0.75, 0.5, 0.25, 0].map((p) => (
          <g key={p}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(p)} y2={y(p)}
              stroke="var(--cream-deep)" strokeWidth="1"
              strokeDasharray={p === 0.5 ? '4 4' : undefined} />
            <text x={PAD.left - 8} y={y(p) + 4} textAnchor="end"
              fontFamily="var(--font-data)" fontSize="11" fill="var(--ink-soft)">
              {Math.round(p * 100)}
            </text>
          </g>
        ))}

        {/* favored / trailing tint, split at the 50% line */}
        <path d={area} fill="var(--win)" opacity="0.09" clipPath="url(#gf-above)" />
        <path d={area} fill="var(--loss)" opacity="0.09" clipPath="url(#gf-below)" />

        <path d={line} fill="none" stroke="var(--team)" strokeWidth="2.5"
          strokeLinejoin="round" strokeLinecap="round" />

        {swings.map((s) => (
          <circle key={s.index} cx={x(s.index)} cy={y(winProb[s.index])} r="3.2"
            fill="#b8905a" stroke="var(--card)" strokeWidth="1" />
        ))}
        {turning && (
          <circle cx={x(turning.index)} cy={y(winProb[turning.index])} r="6"
            fill="none" stroke="#b8905a" strokeWidth="2.5" />
        )}

        <text x={W - PAD.right} y={H - 6} textAnchor="end"
          fontFamily="var(--font-data)" fontSize="11" fill="var(--ink-soft)">
          Game time →
        </text>
      </svg>
      <div className="chart-legend">
        <span><span className="dot-swatch" />swing plays (5%+ shifts) · the ring marks the turning point</span>
        <span>100 = a sure Bucks win</span>
      </div>
    </div>
  )
}
