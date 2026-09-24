import { useEffect, useState } from 'react'
import { TEAM_ABBR, TEAM_LOGO } from '../config.js'
import { countdown, gameDate, gameTime, liveLabel, track } from '../format.js'
import { buildRecapContext, recapFor } from '../recaps.js'
import { postseasonState } from '../scheduleFacts.js'

// The featured game — live > next > last final, the same pick as the mini scoreboard.
// The emotional center of the Season tab: score or countdown, venue and TV, where the
// opponent sits, the season series, and share / add-to-calendar actions.
export default function GameHero({ schedule, standings, onOpenGame }) {
  // Re-render every 30s so the "tips in" line stays honest between data refreshes.
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  const events = schedule.events
  const liveGame = events.find((e) => e.live)
  const nextGame = events.find((e) => !e.final && !e.live)
  const played = events.filter((e) => e.final)
  const lastGame = played[played.length - 1] ?? null
  const featured = liveGame ?? nextGame ?? lastGame
  if (!featured) return null
  const mode = liveGame ? 'live' : featured === nextGame ? 'next' : 'last'

  // Opponent can be a West team, so context comes from the league-wide rows.
  const league = [...standings.east, ...standings.west]
  const us = league.find((r) => r.abbr === TEAM_ABBR)
  const opp = league.find((r) => r.abbr === featured.opponent.abbr) ?? null

  // In the playoffs it's the best-of-seven; otherwise the regular-season
  // meetings only (a play-in, Cup final or playoff game isn't part of it).
  const playoffGame = featured.stage === 'playoffs'
  const series = played.filter((e) =>
    e.opponent.abbr === featured.opponent.abbr && e.stage === (playoffGame ? 'playoffs' : 'regular'))
  const seriesWins = series.filter((e) => e.won).length
  const recaps = buildRecapContext(events)
  const over = !nextGame && !liveGame && postseasonState(events, us.seed) === 'over'

  // A 0–0 record says nothing; before a team's first game it's left off.
  const record = (row) => (row && row.played > 0 ? `${row.wins}–${row.losses}` : null)
  const bucks = {
    name: 'Bucks', logo: TEAM_LOGO, pts: featured.ourScore,
    won: featured.final && featured.won, record: record(us),
  }
  const other = {
    name: featured.opponent.name, logo: featured.opponent.logo, pts: featured.theirScore,
    won: featured.final && !featured.won, record: record(opp),
  }
  const [top, bottom] = featured.home ? [other, bucks] : [bucks, other]

  const share = async () => {
    track('Share', { mode })
    const payload = { title: 'The Bucks, by the numbers — Wausau Pilot & Review', url: window.location.href }
    // A dismissed share sheet is a normal outcome, not an error.
    if (navigator.share) { try { await navigator.share(payload) } catch { return } }
    else await navigator.clipboard.writeText(payload.url)
  }

  return (
    <div className={`hero ${mode}`}>
      <div className="hero-kicker">
        {mode === 'live' && <>
          <span className="live-dot" aria-hidden="true" />
          <span className="live-label">Live</span>
          <span className="soft">{liveLabel(featured)}</span>
        </>}
        {mode === 'next' && <>
          <span>{played.length === 0 && featured.stage === 'regular' ? 'Opening night' : 'Next up'}</span>
          <span className="soft">Tips in {countdown(featured.date)}</span>
        </>}
        {mode === 'last' && <>
          <span>Final</span>
          <span className="soft">{gameDate(featured.date)}</span>
        </>}
        {featured.tag && <span className="postseason-tag">{featured.tag}</span>}
        {featured.cup && <span className="cup-tag">NBA Cup</span>}
      </div>

      {mode === 'next' ? (
        // Pre-game: a centered matchup lockup — logos, serif names, records.
        <div className="hero-lockup">
          <LockupTeam team={bucks} />
          <div className="lock-at">{featured.home ? 'VS' : 'AT'}</div>
          <LockupTeam team={other} />
        </div>
      ) : (
        <>
          <TeamLine team={top} />
          <TeamLine team={bottom} />
        </>
      )}

      <div className="hero-context">
        {mode === 'last' && (
          <div className="hero-recap">{recapFor(featured, recaps)}</div>
        )}
        {mode === 'next' && (
          <div>
            {gameDate(featured.date)} · {gameTime(featured.date)} CT
            {featured.venue ? ` · ${featured.venue}` : ''}{featured.tv ? ` · ${featured.tv}` : ''}
          </div>
        )}
        {mode === 'live' && featured.venue && (
          <div>{featured.venue}{featured.tv ? ` · ${featured.tv}` : ''}</div>
        )}
        {mode !== 'last' && opp && opp.played > 0 && (
          <div>
            The {opp.name} are {opp.wins}–{opp.losses}
            {opp.seed ? ` (#${opp.seed} in the ${opp.conference})` : ''} · last 10: {opp.lastTen}
          </div>
        )}
        <div>{seriesText(series.length, seriesWins, playoffGame)}</div>
        {/* Game-day mornings: the next game leads, last night's result rides along. */}
        {mode === 'next' && lastGame && (
          <div className="hero-last">Last time out: {recapFor(lastGame, recaps)}</div>
        )}
        {mode === 'last' && (over
          ? <div>Season complete — next season's schedule lands here when the NBA publishes it.</div>
          : <div>The next game lands here as soon as the NBA sets it.</div>)}
      </div>

      <div className="hero-actions">
        {mode === 'last' && onOpenGame && (
          <button className="copy-link" onClick={() => onOpenGame(featured.id)}>
            Box score <span aria-hidden="true">→</span>
          </button>
        )}
        {mode === 'next' && lastGame && onOpenGame && (
          <button className="copy-link" onClick={() => onOpenGame(lastGame.id)}>
            Last game's box score <span aria-hidden="true">→</span>
          </button>
        )}
        <button className="copy-link" onClick={share}>Share this game</button>
        {mode === 'next' && (
          <a
            className="copy-link"
            download={`bucks-${featured.opponent.abbr.toLowerCase()}-${gameDate(featured.date).replaceAll(' ', '-').replaceAll(',', '')}.ics`}
            href={icsHref(featured)}
            onClick={() => track('Calendar', { opponent: featured.opponent.abbr })}
          >
            Add to calendar
          </a>
        )}
      </div>
    </div>
  )
}

function TeamLine({ team }) {
  return (
    <div className={`hero-team ${team.won ? 'won' : ''}`}>
      {team.logo && <img src={team.logo} alt="" />}
      <span className="name">{team.name}</span>
      <span className="score">{team.pts}</span>
    </div>
  )
}

function LockupTeam({ team }) {
  return (
    <div className="lock-team">
      {team.logo && <img src={team.logo} alt="" />}
      <div className="lock-name">{team.name}</div>
      {team.record && <div className="lock-rec">{team.record}</div>}
    </div>
  )
}

function seriesText(playedCount, wins, playoffs) {
  const kind = playoffs ? 'series' : 'season series'
  if (playedCount === 0) return playoffs ? 'Game 1 of the series' : 'First meeting of the season'
  const losses = playedCount - wins
  const score = `${wins}–${losses}`
  if (playoffs && (wins === 4 || losses === 4)) return `Bucks ${wins === 4 ? 'won' : 'lost'} the series ${score}`
  if (wins === losses) return `${playoffs ? 'Series' : 'Season series'} tied ${score}`
  return wins > losses ? `Bucks lead the ${kind} ${score}` : `Bucks trail the ${kind} ${score}`
}

// Client-generated calendar file; the reminder happens in the reader's own calendar app.
function icsHref(game) {
  const stamp = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Wausau Pilot & Review//Bucks Tracker//EN',
    'BEGIN:VEVENT',
    `UID:wpr-bucks-${game.id}@rowanflynnpilot.github.io`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(game.date)}`,
    `DTEND:${stamp(new Date(game.date.getTime() + 2.5 * 3_600_000))}`,
    `SUMMARY:Bucks ${game.home ? 'vs' : 'at'} ${game.opponent.name}`,
    game.venue ? `LOCATION:${game.venue}` : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean)
  return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(lines.join('\r\n'))
}
