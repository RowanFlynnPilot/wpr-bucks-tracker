import { TEAM_ABBR } from '../config.js'

// Quarter-by-quarter scoring, away over home — the film room's and the live
// hero's. A live game simply has fewer quarters filled in.
export default function Linescore({ detail }) {
  const { away, home } = detail
  const quarters = Math.max(away.quarters.length, home.quarters.length)
  if (quarters === 0) return null
  const label = (i) => (i < 4 ? `Q${i + 1}` : i === 4 ? 'OT' : `${i - 3}OT`)
  return (
    <table className="linescore">
      <thead>
        <tr>
          <th></th>
          {Array.from({ length: quarters }, (_, i) => <th key={i}>{label(i)}</th>)}
          <th>T</th>
        </tr>
      </thead>
      <tbody>
        {[away, home].map((t) => (
          <tr key={t.abbr} className={t.abbr === TEAM_ABBR ? 'us' : ''}>
            <td className="team">{t.name}</td>
            {Array.from({ length: quarters }, (_, i) => <td key={i}>{t.quarters[i] ?? ''}</td>)}
            <td className="total">{t.score}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
