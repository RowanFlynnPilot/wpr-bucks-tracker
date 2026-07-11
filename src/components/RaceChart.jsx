// Cumulative games above/below .500 across the regular season, drawn as a
// single SVG path over a hardwood-toned baseline. Chart-led, like the
// Brewers division-race chart this page descends from.

const W = 820
const H = 240
const PAD = { top: 16, right: 12, bottom: 26, left: 40 }

export default function RaceChart({ games }) {
  if (games.length === 0) {
    return <p className="section-note">No completed games yet — the line starts on opening night.</p>
  }

  let diff = 0
  const series = games.map((g, i) => {
    diff += g.won ? 1 : -1
    return { game: i + 1, diff, won: g.won }
  })

  const maxAbs = Math.max(4, ...series.map((p) => Math.abs(p.diff)))
  const x = (game) => PAD.left + ((game - 1) / Math.max(1, series.length - 1)) * (W - PAD.left - PAD.right)
  const y = (d) => PAD.top + ((maxAbs - d) / (2 * maxAbs)) * (H - PAD.top - PAD.bottom)

  const path = series
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.game).toFixed(1)},${y(p.diff).toFixed(1)}`)
    .join(' ')

  const gridStep = maxAbs > 12 ? 10 : 5
  const gridLines = []
  for (let d = Math.ceil(-maxAbs / gridStep) * gridStep; d <= maxAbs; d += gridStep) {
    if (d !== 0) gridLines.push(d)
  }

  const last = series[series.length - 1]

  return (
    <div className="race-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={`Games above .500 across ${series.length} games, finishing at ${last.diff >= 0 ? '+' : ''}${last.diff}`}>
        {gridLines.map((d) => (
          <g key={d}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(d)} y2={y(d)}
              stroke="var(--cream-deep)" strokeWidth="1" />
            <text x={PAD.left - 8} y={y(d) + 4} textAnchor="end"
              fontFamily="var(--font-data)" fontSize="11" fill="var(--ink-soft)">
              {d > 0 ? `+${d}` : d}
            </text>
          </g>
        ))}

        {/* .500 baseline — the hardwood */}
        <line x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)}
          stroke="#b8905a" strokeWidth="2" />
        <text x={PAD.left - 8} y={y(0) + 4} textAnchor="end"
          fontFamily="var(--font-data)" fontSize="11" fill="#b8905a">.500</text>

        <path d={path} fill="none" stroke="var(--team)" strokeWidth="2.5"
          strokeLinejoin="round" strokeLinecap="round" />

        <circle cx={x(last.game)} cy={y(last.diff)} r="4" fill="var(--team)" />
        <text x={Math.min(x(last.game), W - PAD.right - 34)} y={y(last.diff) - 10}
          fontFamily="var(--font-data)" fontSize="12" fontWeight="700" fill="var(--team)">
          {last.diff >= 0 ? `+${last.diff}` : last.diff}
        </text>

        <text x={W - PAD.right} y={H - 8} textAnchor="end"
          fontFamily="var(--font-data)" fontSize="11" fill="var(--ink-soft)">
          Game {series.length}
        </text>
      </svg>
    </div>
  )
}
