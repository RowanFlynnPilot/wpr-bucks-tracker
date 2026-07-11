import { PLAYOFF_LINE, PLAY_IN_LINE, TEAM_ABBR, VENUE } from '../config.js'

// A few plain sentences generated from the same data the charts use — the
// "where things stand" a reader would otherwise assemble from three tables.

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
    lines.push(`The ${schedule.seasonLabel} season closed at ${us.wins}–${us.losses} — #${us.seed} in the East, ${finish}.`)
    const post = played.filter((e) => e.postseason)
    if (post.length > 0) {
      const w = post.filter((e) => e.won).length
      lines.push(`The postseason run went ${w}–${post.length - w}.`)
    }
    lines.push('Next season’s schedule lands here when the NBA publishes it — opening night comes late October.')
  } else if (played.length === 0) {
    lines.push(`A clean slate: the ${schedule.seasonLabel} season is ${upcoming.length} games long, and the line starts on opening night.`)
  } else {
    lines.push(
      `The Bucks are ${us.wins}–${us.losses}, #${us.seed} in the East — ${streakPhrase(us.streak)}, ${us.lastTen} over the last ten.`
    )
    if (us.seed <= PLAYOFF_LINE) {
      const seventh = east[PLAYOFF_LINE]
      lines.push(`That's a locked playoff seed today, ${fmtGb(gamesBack(seventh, us))} games clear of the play-in field.`)
    } else if (us.seed <= PLAY_IN_LINE) {
      const sixth = east[PLAYOFF_LINE - 1]
      lines.push(`That's a play-in spot today, ${fmtGb(gamesBack(us, sixth))} games back of the top six.`)
    } else {
      const tenth = east[PLAY_IN_LINE - 1]
      lines.push(`They sit ${fmtGb(gamesBack(us, tenth))} games outside the play-in field.`)
    }
    lines.push(`They're ${us.homeRecord} at ${VENUE}, ${us.roadRecord} on the road, and ${us.divRecord} against the Central.`)
  }
  if (lines.length === 0) return null

  return (
    <div className="card">
      <h2 className="section">Where the story stands</h2>
      {lines.map((line, i) => <p className="story-line" key={i}>{line}</p>)}
    </div>
  )
}
