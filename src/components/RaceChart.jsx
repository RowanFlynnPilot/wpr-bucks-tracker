// Cumulative games above/below .500 across the regular season, drawn as a
// single SVG path over a hardwood-toned baseline, with a two-tone area fill
// (green above .500, rust below) so the season's shape reads at a glance.
// Chart-led, like the Brewers division-race chart this page descends from.
// Drawn at the container's real width (see useChartWidth) so text stays legible on phones.

import { useChartWidth } from '../useChartWidth.js'

const PAD = { top: 16, right: 12, bottom: 26, left: 40 }

export default function RaceChart({ games }) {
  const [ref, width] = useChartWidth()
  return (
    <div className="race-chart" ref={ref}>
      {games.length === 0
        ? <p className="section-note">No completed games yet — the line starts on opening night.</p>
        : width > 0 && <RaceSvg games={games} W={width} H={width < 560 ? 200 : 240} />}
    </div>
  )
}

function RaceSvg({ games, W, H }) {
  // Every season starts level on opening night — the line does too.
  let diff = 0
  const series = [{ game: 0, diff: 0 }, ...games.map((g, i) => {
    diff += g.won ? 1 : -1
    return { game: i + 1, diff, won: g.won }
  })]

  // Fit the range to the season so far, with headroom both sides of .500: a
  // symmetric range left half the chart empty for a team living on one side.
  const hi = Math.max(3, ...series.map((p) => p.diff + 1))
  const lo = Math.min(-3, ...series.map((p) => p.diff - 1))
  const n = series.length - 1
  const x = (game) => PAD.left + (game / n) * (W - PAD.left - PAD.right)
  const y = (d) => PAD.top + ((hi - d) / (hi - lo)) * (H - PAD.top - PAD.bottom)

  const line = series
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.game).toFixed(1)},${y(p.diff).toFixed(1)}`)
    .join(' ')
  // Close the line down to the .500 baseline for the two-tone fill.
  const area = `${line} L${x(n).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`

  const span = hi - lo
  const gridStep = span > 30 ? 10 : span > 12 ? 5 : 2
  const gridLines = []
  for (let d = Math.ceil(lo / gridStep) * gridStep; d <= hi; d += gridStep) {
    if (d !== 0) gridLines.push(d)
  }

  const last = series[series.length - 1]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={`Games above .500 across ${n} games, finishing at ${last.diff >= 0 ? '+' : ''}${last.diff}`}>
        <defs>
          <clipPath id="race-above"><rect x="0" y="0" width={W} height={y(0)} /></clipPath>
          <clipPath id="race-below"><rect x="0" y={y(0)} width={W} height={H - y(0)} /></clipPath>
        </defs>

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

        {/* winning / losing tint, split at .500 */}
        <path d={area} fill="var(--win)" opacity="0.1" clipPath="url(#race-above)" />
        <path d={area} fill="var(--loss)" opacity="0.1" clipPath="url(#race-below)" />

        {/* .500 baseline — the hardwood */}
        <line x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)}
          stroke="#b8905a" strokeWidth="2" />
        <text x={PAD.left - 8} y={y(0) + 4} textAnchor="end"
          fontFamily="var(--font-data)" fontSize="11" fill="#b8905a">.500</text>

        <path d={line} fill="none" stroke="var(--team)" strokeWidth="2.5"
          strokeLinejoin="round" strokeLinecap="round" />

        <circle cx={x(last.game)} cy={y(last.diff)} r="4" fill="var(--team)" />
        <text x={Math.min(x(last.game), W - PAD.right - 34)} y={y(last.diff) - 10}
          fontFamily="var(--font-data)" fontSize="12" fontWeight="700" fill="var(--team)">
          {last.diff >= 0 ? `+${last.diff}` : last.diff}
        </text>

        <text x={W - PAD.right} y={H - 8} textAnchor="end"
          fontFamily="var(--font-data)" fontSize="11" fill="var(--ink-soft)">
          Game {n}
        </text>
      </svg>
  )
}
