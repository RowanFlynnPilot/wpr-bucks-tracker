import { useEffect, useState } from 'react'
import { fetchRosterStats } from '../api.js'
import { track } from '../format.js'
import Section from './Section.jsx'

// Every Bucks player's season line — the leaders board shows the top three per
// category; this is the whole roster. Tap a column to sort by it. Phones keep
// the core columns (GP, PTS, REB, AST, FG%); wider screens add the rest.
const COLUMNS = [
  { key: 'gp', label: 'GP', title: 'Games played' },
  { key: 'min', label: 'MIN', title: 'Minutes per game', wide: true },
  { key: 'pts', label: 'PTS', title: 'Points per game' },
  { key: 'reb', label: 'REB', title: 'Rebounds per game' },
  { key: 'ast', label: 'AST', title: 'Assists per game' },
  { key: 'stl', label: 'STL', title: 'Steals per game', wide: true },
  { key: 'blk', label: 'BLK', title: 'Blocks per game', wide: true },
  { key: 'fg', label: 'FG%', title: 'Field-goal percentage' },
  { key: 'three', label: '3P%', title: 'Three-point percentage', wide: true },
]

export default function RosterTable() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)
  const [sortKey, setSortKey] = useState('pts')

  useEffect(() => {
    fetchRosterStats().then(setRows).catch((err) => setError(err.message))
  }, [])

  if (error) {
    return (
      <Section kicker="The roster" title="Every Bucks player, by the numbers">
        <p className="section-note">Couldn't load the roster stats. ({error})</p>
      </Section>
    )
  }
  if (!rows) return null

  const sorted = [...rows].sort((a, b) => b[sortKey].value - a[sortKey].value || b.pts.value - a.pts.value)
  const sortBy = (key) => {
    setSortKey(key)
    track('Roster Sort', { column: key })
  }

  return (
    <Section
      kicker="The roster"
      title="Every Bucks player, by the numbers"
      note="Regular-season averages, everyone who has played. Players dealt away keep their Milwaukee numbers. Tap a column to sort."
    >
      <div className="card">
        <table className="standings roster-table">
          <thead>
            <tr>
              <th className="team-col">Player</th>
              {COLUMNS.map((c) => (
                <th key={c.key} className={c.wide ? 'hide-sm' : ''}
                  aria-sort={sortKey === c.key ? 'descending' : 'none'}>
                  <button type="button" className={`sort-btn ${sortKey === c.key ? 'on' : ''}`}
                    title={c.title} onClick={() => sortBy(c.key)}>
                    {c.label}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id}>
                <td className="team-col">
                  {r.name} <span className="roster-pos">{r.position}</span>
                </td>
                {COLUMNS.map((c) => (
                  <td key={c.key} className={[c.wide ? 'hide-sm' : '', sortKey === c.key ? 'sorted' : ''].filter(Boolean).join(' ')}>
                    {r[c.key].display}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  )
}
