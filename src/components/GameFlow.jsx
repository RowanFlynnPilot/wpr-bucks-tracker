// Win probability across the game, drawn as a single SVG path — the basketball
// sibling of the Packers film-room chart, hand-rolled like RaceChart (no chart lib).

const W = 820
const H = 200
const PAD = { top: 14, right: 14, bottom: 24, left: 40 }

export default function GameFlow({ winProb, turning, won }) {
  if (winProb.length < 2) {
    return <p className="section-note">ESPN didn't publish win probability for this one.</p>
  }

  const x = (i) => PAD.left + (i / (winProb.length - 1)) * (W - PAD.left - PAD.right)
  const y = (p) => PAD.top + (1 - p) * (H - PAD.top - PAD.bottom)

  const path = winProb
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p).toFixed(1)}`)
    .join(' ')

  return (
    <div className="race-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={`Bucks win probability across the game, ending in a ${won ? 'win' : 'loss'}`}>
        {[1, 0.5, 0].map((p) => (
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

        <path d={path} fill="none" stroke="var(--team)" strokeWidth="2.5"
          strokeLinejoin="round" strokeLinecap="round" />

        {turning && (
          <circle cx={x(turning.index)} cy={y(winProb[turning.index])} r="5"
            fill="none" stroke="#b8905a" strokeWidth="2.5" />
        )}

        <text x={W - PAD.right} y={H - 6} textAnchor="end"
          fontFamily="var(--font-data)" fontSize="11" fill="var(--ink-soft)">
          Game time →
        </text>
      </svg>
    </div>
  )
}
