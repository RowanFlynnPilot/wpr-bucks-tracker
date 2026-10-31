import { GAMES_IN_SEASON, PLAYOFF_LINE, PLAY_IN_LINE, TEAM_ABBR, VENUE } from '../config.js'
import { gameTime } from '../format.js'
import { postseasonState, scheduleFacts } from '../scheduleFacts.js'
import { ordinal, seedRace } from '../standingsText.js'
import Section from './Section.jsx'

// A few plain sentences generated from the same data the charts use — the
// "where things stand" a reader would otherwise assemble from three tables.
// In-season they carry what the pulse tiles can't (the seed race with ties,
// form, how the margin ranks) rather than repeating the record and splits.
// Open editorial text with hardwood markers, not a box.

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']

function streakPhrase(streak) {
  const n = parseInt(streak.slice(1), 10)
  const word = WORDS[n] ?? n
  if (streak.startsWith('W')) return n === 1 ? 'coming off a win' : `winners of ${word} straight`
  return n === 1 ? 'coming off a loss' : `losers of ${word} straight`
}

export default function Storylines({ schedule, standings }) {
  const east = standings.east
  const us = east.find((r) => r.abbr === TEAM_ABBR)
  const played = schedule.events.filter((e) => e.final)
  const upcoming = schedule.events.filter((e) => !e.final)

  const lines = []
  if (upcoming.length === 0 && played.length > 0) {
    // Nothing scheduled: either the season is over, or the next play-in game
    // or playoff round just hasn't been posted yet.
    const finish = us.seed <= PLAYOFF_LINE
      ? 'a playoff seed'
      : us.seed <= PLAY_IN_LINE ? 'a play-in berth' : 'outside the play-in field'
    const post = played.filter((e) => e.stage === 'playIn' || e.stage === 'playoffs')
    const over = postseasonState(schedule.events, us.seed) === 'over'
    lines.push(
      <>The {schedule.seasonLabel} {post.length > 0 || !over ? 'regular season' : 'season'} closed at <strong>{us.wins}–{us.losses}</strong> — <strong>#{us.seed} in the East</strong>, {finish}.</>
    )
    if (post.length > 0) {
      const w = post.filter((e) => e.won).length
      lines.push(<>The postseason run {over ? 'went' : 'stands at'} <strong>{w}–{post.length - w}</strong>.</>)
    }
    lines.push(over
      ? <>Next season's schedule lands here when the NBA publishes it — it appeared in mid-September this year.</>
      : <>The next game lands here as soon as the NBA sets it.</>)
  } else if (played.length === 0) {
    // Preseason: what the calendar says, since there are no results yet.
    const facts = scheduleFacts(schedule.events)
    const o = facts.opener
    lines.push(
      <>A clean slate: the {schedule.seasonLabel} season is <strong>{GAMES_IN_SEASON} games</strong> long, and the race line starts on opening night.</>
    )
    if (o) {
      const day = o.date.toLocaleDateString('en-US', { timeZone: 'America/Chicago', weekday: 'long', month: 'short', day: 'numeric' })
      lines.push(
        <>It tips off <strong>{day}</strong> at {gameTime(o.date)} CT {o.home && !o.neutral ? `against the ${o.opponent.name} at ${VENUE}` : o.neutral ? `against the ${o.opponent.name} at ${o.venue}` : `on the road against the ${o.opponent.name}`}{o.tv ? ` (${o.tv})` : ''}.</>
      )
    }
    lines.push(
      <>
        <strong>{facts.home}</strong> of the {facts.scheduled} dates set so far are at {VENUE}, with <strong>{facts.backToBacks} back-to-backs</strong> on the calendar.
        {facts.toBeSet > 0 && ` The last ${WORDS[facts.toBeSet] ?? facts.toBeSet} get set after NBA Cup group play.`}
      </>
    )
  } else {
    const race = seedRace(east)
    if (race) lines.push(<>{race}</>)
    lines.push(
      <>They're {streakPhrase(us.streak)}{us.played >= 10 && <>, <strong>{us.lastTen}</strong> over their last ten</>}.</>
    )
    // How the scoring margin ranks league-wide — the one context the tiles lack.
    const league = [...standings.east, ...standings.west]
    const rank = [...league].sort((a, b) => b.pointDiffValue - a.pointDiffValue).findIndex((r) => r.abbr === TEAM_ABBR) + 1
    const margin = Math.abs(us.pointDiffValue).toFixed(1)
    if (us.pointDiffValue > 0) {
      lines.push(<>They're outscoring opponents by <strong>{margin} points a night</strong>, {ordinal(rank)} in the NBA.</>)
    } else if (us.pointDiffValue < 0) {
      lines.push(<>They're being outscored by <strong>{margin} points a night</strong>, {ordinal(rank)} in the NBA.</>)
    }
  }
  if (lines.length === 0) return null

  return (
    <Section kicker="The storylines" title={played.length === 0 ? 'Where the story starts' : 'Where the story stands'}>
      <ul className="story-list">
        {lines.map((line, i) => <li key={i}>{line}</li>)}
      </ul>
    </Section>
  )
}
