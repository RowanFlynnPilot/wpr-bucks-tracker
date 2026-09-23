import { useEffect, useState } from 'react'
import { SEASON, TEAM_ABBR } from '../config.js'
import { fetchLeaders } from '../api.js'
import Section from '../components/Section.jsx'
import TeamProfile from '../components/TeamProfile.jsx'

// ESPN end-year → "2025-26".
const seasonLabel = (endYear) => `${endYear - 1}-${String(endYear).slice(2)}`

// Loaded on first visit to the tab — the leaders call fans out into athlete +
// stat-line fetches, so it shouldn't tax the initial page load. Before the
// Bucks' first game ESPN has no leaders for the new season (it 404s), so the
// tab shows last season's final board, labeled as such.
export default function LeadersTab({ standings }) {
  const [categories, setCategories] = useState(null)
  const [error, setError] = useState(null)
  const us = standings.east.find((r) => r.abbr === TEAM_ABBR)
  const preseason = us.played === 0
  const season = preseason ? SEASON - 1 : SEASON

  useEffect(() => {
    fetchLeaders(season).then(setCategories).catch((err) => setError(err.message))
  }, [season])

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
            kicker={preseason ? 'Carried the scoring' : 'Carrying the scoring'}
            athlete={featuredScorer}
            statline={featuredLine(featuredScorer, points.leaders[0].value, 'PPG', ['fieldGoalPct', '% FG'], ['avgRebounds', ' REB'])}
          />
        )}
        {showAnchor && (
          <FeaturedLeader
            kicker={preseason ? 'Anchored the paint' : 'Anchoring the paint'}
            athlete={featuredAnchor}
            statline={featuredLine(featuredAnchor, blocks.leaders[0].value, 'BPG', ['avgRebounds', ' RPG'], ['avgMinutes', ' MIN'])}
          />
        )}
      </div>

      <Section
        kicker="The leaders"
        title={preseason ? 'Who carried it last season' : "Who's carrying it"}
        note={preseason
          ? `Final ${seasonLabel(season)} leaders — the ${seasonLabel(SEASON)} board takes over after opening night. Players who've since moved on keep the numbers they put up here.`
          : 'Regular-season team leaders. Players dealt away mid-season keep the numbers they put up here.'}
      >
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
      </Section>

      {/* League ranks of a 0–0 field are all ties — the profile starts with the season. */}
      {!preseason && <TeamProfile standings={standings} />}
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
