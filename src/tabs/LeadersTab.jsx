import { useEffect, useState } from 'react'
import { fetchLeaders } from '../api.js'
import TeamProfile from '../components/TeamProfile.jsx'

// Loaded on first visit to the tab — the leaders call fans out into athlete +
// stat-line fetches, so it shouldn't tax the initial page load.
export default function LeadersTab({ standings }) {
  const [categories, setCategories] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchLeaders().then(setCategories).catch((err) => setError(err.message))
  }, [])

  if (error) {
    return <div className="status-block error">Couldn't load team leaders. ({error})</div>
  }
  if (!categories) {
    return <div className="status-block">Pulling the box scores…</div>
  }

  const points = categories.find((c) => c.name === 'pointsPerGame')
  const blocks = categories.find((c) => c.name === 'blocksPerGame')
  const featuredScorer = points?.leaders[0]?.athlete ?? null
  const featuredAnchor = blocks?.leaders[0]?.athlete ?? null
  const showAnchor = featuredAnchor && featuredScorer && featuredAnchor.id !== featuredScorer.id

  return (
    <>
      <div className="featured-grid">
        {featuredScorer && (
          <FeaturedLeader
            kicker="Carrying the scoring"
            athlete={featuredScorer}
            statline={featuredLine(featuredScorer, points.leaders[0].value, 'PPG', ['fieldGoalPct', '% FG'], ['avgRebounds', ' REB'])}
          />
        )}
        {showAnchor && (
          <FeaturedLeader
            kicker="Anchoring the paint"
            athlete={featuredAnchor}
            statline={featuredLine(featuredAnchor, blocks.leaders[0].value, 'BPG', ['avgRebounds', ' RPG'], ['avgMinutes', ' MIN'])}
          />
        )}
      </div>

      <p className="section-note">
        Regular-season team leaders. Players dealt away mid-season keep the numbers they
        put up here.
      </p>
      <div className="leader-grid">
        {categories.map((cat) => (
          <div className="leader-card" key={cat.name}>
            <h3>{cat.label}</h3>
            {cat.leaders.map((l, i) => (
              <div className={`leader-row ${i === 0 ? 'top' : ''}`} key={l.athlete.id}>
                {l.athlete.headshot
                  ? <img src={l.athlete.headshot} alt="" loading="lazy" />
                  : <div style={{ width: 36, height: 36 }} />}
                <div className="who">
                  <div className="name">{l.athlete.name}</div>
                  <div className="meta">
                    {l.athlete.position}{l.athlete.jersey && ` · #${l.athlete.jersey}`}
                    {subline(cat.name, l.athlete.stats) && ` · ${subline(cat.name, l.athlete.stats)}`}
                  </div>
                </div>
                <div className="stat-value">{l.value}</div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {standings && <TeamProfile standings={standings} />}
    </>
  )
}

// The one-line season context under each leader — tuned per category.
function subline(category, s) {
  if (!s) return null
  switch (category) {
    case 'pointsPerGame': return `${s.fieldGoalPct}% FG · ${s.gamesPlayed} games`
    case 'reboundsPerGame': return `${s.doubleDouble} double-doubles · ${s.gamesPlayed} games`
    case 'assistsPerGame': return `${s.avgMinutes} min/game · ${s.gamesPlayed} games`
    case 'stealsPerGame': return `${s.avgMinutes} min/game · ${s.gamesPlayed} games`
    case 'blocksPerGame': return `${s.avgRebounds} reb/game · ${s.gamesPlayed} games`
    case 'fieldGoalPercentage': return `${s.avgPoints} pts/game · ${s.gamesPlayed} games`
    default: return null
  }
}

function featuredLine(athlete, value, unit, ...extras) {
  const parts = [`${value} ${unit}`]
  for (const [key, suffix] of extras) {
    if (athlete.stats?.[key]) parts.push(`${athlete.stats[key]}${suffix}`)
  }
  return parts.join(' · ')
}

function FeaturedLeader({ kicker, athlete, statline }) {
  return (
    <div className="featured-leader">
      {athlete.headshot && <img src={athlete.headshot} alt="" loading="lazy" />}
      <div>
        <div className="featured-kicker">{kicker}</div>
        <div className="featured-name">{athlete.name}</div>
        <div className="featured-meta">
          {athlete.position}{athlete.jersey && ` #${athlete.jersey}`} · {statline}
        </div>
      </div>
    </div>
  )
}
