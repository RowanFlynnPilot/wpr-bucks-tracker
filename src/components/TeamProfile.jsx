import { TEAM_ABBR } from '../config.js'
import Section from './Section.jsx'

// League context: where the team ranks among all 30, from the standings feed
// (the one source that has every team's scoring numbers in a single response).

function rank(league, key, better) {
  const sorted = [...league].sort((a, b) => (better === 'high' ? b[key] - a[key] : a[key] - b[key]))
  return sorted.findIndex((r) => r.abbr === TEAM_ABBR) + 1
}

function ordinal(n) {
  const rem100 = n % 100
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`
  const suffix = { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th'
  return `${n}${suffix}`
}

export default function TeamProfile({ standings }) {
  const league = [...standings.east, ...standings.west]
  const us = league.find((r) => r.abbr === TEAM_ABBR)

  const metrics = [
    { label: 'Scoring offense', value: `${us.ppgDisplay} pts/game`, rank: rank(league, 'ppg', 'high') },
    { label: 'Scoring defense', value: `${us.oppgDisplay} allowed`, rank: rank(league, 'oppg', 'low') },
    { label: 'Point differential', value: `${us.pointDiff} /game`, rank: rank(league, 'pointDiffValue', 'high') },
    { label: 'Winning', value: us.winPct, rank: rank(league, 'winPctValue', 'high') },
  ]
  const best = metrics.reduce((a, b) => (b.rank < a.rank ? b : a))
  const worst = metrics.reduce((a, b) => (b.rank > a.rank ? b : a))

  return (
    <Section
      kicker="League context"
      title="The team, in profile"
      note="Each dot is the Bucks' rank among the NBA's 30 teams — the left edge leads the league."
    >
      {metrics.map((m) => (
        <div className="profile-row" key={m.label}>
          <div className="profile-label">{m.label}</div>
          <div className="profile-value">{m.value}</div>
          <div className="profile-track" aria-hidden="true">
            <span className="profile-dot" style={{ left: `calc(${((m.rank - 1) / 29) * 100}% - 4px)` }} />
          </div>
          <div className="profile-rank">{ordinal(m.rank)}</div>
        </div>
      ))}
      <p className="section-note" style={{ marginTop: 12 }}>
        Sharpest edge: {best.label.toLowerCase()} ({ordinal(best.rank)} in the NBA) · biggest soft spot:{' '}
        {worst.label.toLowerCase()} ({ordinal(worst.rank)}).
      </p>
    </Section>
  )
}
