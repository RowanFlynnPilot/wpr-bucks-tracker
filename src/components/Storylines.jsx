import { PLAYOFF_LINE, PLAY_IN_LINE, TEAM_ABBR, VENUE } from '../config.js'
import Section from './Section.jsx'

// A few plain sentences generated from the same data the charts use — the
// "where things stand" a reader would otherwise assemble from three tables.
// Open editorial text with hardwood markers, not a box.

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']

function streakPhrase(streak) {
  const n = parseInt(streak.slice(1), 10)
  const word = WORDS[n] ?? n
  if (streak.startsWith('W')) return n === 1 ? 'coming off a win' : `winners of ${word} straight`
  return n === 1 ? 'coming off a loss' : `losers of ${word} straight`
}

// How many games `a` trails `b`.
function gamesBack(a, b) {
  const gb = ((b.wins - a.wins) + (a.losses - b.losses)) / 2
  return Math.max(0, gb)
}

function fmtGb(gb) {
  return gb === Math.floor(gb) ? `${gb}` : gb.toFixed(1)
}

export default function Storylines({ schedule, standings }) {
  const east = standings.east
  const us = east.find((r) => r.abbr === TEAM_ABBR)
  const played = schedule.events.filter((e) => e.final)
  const upcoming = schedule.events.filter((e) => !e.final)

  const lines = []
  if (upcoming.length === 0 && played.length > 0) {
    // Offseason: sum up how it ended.
    const finish = us.seed <= PLAYOFF_LINE
      ? 'a playoff seed'
      : us.seed <= PLAY_IN_LINE ? 'a play-in berth' : 'outside the play-in field'
    lines.push(
      <>The {schedule.seasonLabel} season closed at <strong>{us.wins}–{us.losses}</strong> — <strong>#{us.seed} in the East</strong>, {finish}.</>
    )
    const post = played.filter((e) => e.postseason)
    if (post.length > 0) {
      const w = post.filter((e) => e.won).length
      lines.push(<>The postseason run went <strong>{w}–{post.length - w}</strong>.</>)
    }
    lines.push(<>Next season's schedule lands here when the NBA publishes it — opening night comes late October.</>)
  } else if (played.length === 0) {
    lines.push(
      <>A clean slate: the {schedule.seasonLabel} season is <strong>{upcoming.length} games</strong> long, and the line starts on opening night.</>
    )
  } else {
    lines.push(
      <>The Bucks are <strong>{us.wins}–{us.losses}</strong>, <strong>#{us.seed} in the East</strong> — {streakPhrase(us.streak)}, <strong>{us.lastTen}</strong> over the last ten.</>
    )
    if (us.seed <= PLAYOFF_LINE) {
      const seventh = east[PLAYOFF_LINE]
      lines.push(<>That's a locked playoff seed today, <strong>{fmtGb(gamesBack(seventh, us))} games clear</strong> of the play-in field.</>)
    } else if (us.seed <= PLAY_IN_LINE) {
      const sixth = east[PLAYOFF_LINE - 1]
      lines.push(<>That's a play-in spot today, <strong>{fmtGb(gamesBack(us, sixth))} games back</strong> of the top six.</>)
    } else {
      const tenth = east[PLAY_IN_LINE - 1]
      lines.push(<>They sit <strong>{fmtGb(gamesBack(us, tenth))} games outside</strong> the play-in field.</>)
    }
    lines.push(
      <>They're <strong>{us.homeRecord}</strong> at {VENUE}, <strong>{us.roadRecord}</strong> on the road, and <strong>{us.divRecord}</strong> against the Central.</>
    )
  }
  if (lines.length === 0) return null

  return (
    <Section kicker="The storylines" title="Where the story stands">
      <ul className="story-list">
        {lines.map((line, i) => <li key={i}>{line}</li>)}
      </ul>
    </Section>
  )
}
