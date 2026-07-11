import { PLAYOFF_LINE, PLAY_IN_LINE, TEAM_ABBR } from '../config.js'

export default function StandingsTable({ rows }) {
  return (
    <>
      <table className="standings">
        <thead>
          <tr>
            <th className="team-col">Team</th>
            <th>W</th>
            <th>L</th>
            <th>Pct</th>
            <th>GB</th>
            <th className="hide-sm">L10</th>
            <th className="hide-sm">Strk</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const classes = [
              row.abbr === TEAM_ABBR ? 'us' : '',
              row.seed === PLAYOFF_LINE ? 'playoff-line' : '',
              row.seed === PLAY_IN_LINE ? 'play-in-line' : '',
            ].filter(Boolean).join(' ')
            return (
              <tr key={row.teamId} className={classes}>
                <td className="team-col">
                  <span className="seed">{row.seed}</span>
                  {row.logo && <img src={row.logo} alt="" loading="lazy" />}
                  {row.name}
                </td>
                <td>{row.wins}</td>
                <td>{row.losses}</td>
                <td>{row.winPct}</td>
                <td>{row.gamesBehind}</td>
                <td className="hide-sm">{row.lastTen}</td>
                <td className="hide-sm">{row.streak}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="legend">
        <span><span className="swatch solid" />Playoff line (top 6)</span>
        <span><span className="swatch dashed" />Play-in line (7–10)</span>
      </div>
    </>
  )
}
