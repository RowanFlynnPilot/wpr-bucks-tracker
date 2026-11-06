import { useEffect, useState } from 'react'
import { GAMES_IN_SEASON, PLAYOFF_LINE, PLAY_IN_LINE, TEAM_ABBR } from '../config.js'
import { fetchOutlook } from '../api.js'
import { ordinal } from '../standingsText.js'
import Section from './Section.jsx'

// The playoff picture, from ESPN's published projection (BPI) — labeled as
// ESPN's, never blended with anything of ours. Works from preseason on (BPI
// projects before opening night); once every team's 82 are played it gives
// way to the final result.
export default function Outlook({ standings }) {
  const east = standings.east
  const us = east.find((r) => r.abbr === TEAM_ABBR)
  const seasonOver = east.every((t) => t.played >= GAMES_IN_SEASON)
  const [outlook, setOutlook] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (seasonOver) return
    let alive = true
    fetchOutlook()
      .then((o) => { if (alive) setOutlook(o) })
      .catch((err) => { if (alive) setError(err.message) })
    return () => { alive = false }
  }, [seasonOver])

  if (seasonOver) {
    const finish = us.seed <= PLAYOFF_LINE
      ? 'a top-six playoff seed'
      : us.seed <= PLAY_IN_LINE ? 'a play-in berth' : 'outside the play-in field'
    return (
      <Section kicker="The playoff picture" title="Where it landed">
        <p className="section-note">Final: No. {us.seed} in the East — {finish}.</p>
      </Section>
    )
  }

  if (error) {
    return (
      <Section kicker="The playoff picture" title="What ESPN's model sees">
        <p className="section-note">Couldn't load ESPN's projection. ({error})</p>
      </Section>
    )
  }
  if (!outlook) return null

  const asOf = outlook.updated
    ? ` as of ${outlook.updated.toLocaleDateString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric' })}`
    : ''

  return (
    <Section kicker="The playoff picture" title="What ESPN's model sees">
      <div className="pulse odds">
        <Tile value={outlook.playoffs} label="Make the playoffs" />
        <Tile value={outlook.top6} label="Top-six seed" />
        <Tile value={outlook.playIn} label="Reach the play-in" />
        <Tile value={`${outlook.projW}–${outlook.projL}`} label="Projected record" />
        <Tile value={ordinal(outlook.projSeed)} label="Projected seed" />
      </div>
      <p className="section-note" style={{ marginTop: 12 }}>
        ESPN Basketball Power Index projection{asOf}: results so far plus ESPN's player
        ratings, simulated across the rest of the season. "Make the playoffs" counts getting
        there through the play-in.
        {/* ESPN's own figure, kept as published — but a simulated 0% isn't elimination. */}
        {[outlook.playoffs, outlook.top6, outlook.playIn].includes('0%') &&
          " A 0% means none of ESPN's simulated seasons got there — not that it's mathematically out of reach."}
      </p>
    </Section>
  )
}

function Tile({ value, label }) {
  return (
    <div className="stat">
      <div className="value">{value}</div>
      <div className="label">{label}</div>
    </div>
  )
}
