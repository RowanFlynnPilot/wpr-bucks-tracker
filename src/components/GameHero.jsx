import { useEffect, useState } from 'react'
import { TEAM_ABBR, TEAM_LOGO, WPR_TRACKER_PAGE } from '../config.js'
import { countdown, ctDaysFromToday, gameDate, gameLabel, gameTime, liveLabel, todayWord, track } from '../format.js'
import { buildRecapContext, recapFor } from '../recaps.js'
import { pickFeatured, postseasonState } from '../scheduleFacts.js'
import LiveGame from './LiveGame.jsx'

// The featured game, picked like the mini scoreboard (see pickFeatured): live;
// then last night's final until the next game's day; then the next game; then
// the last final. The emotional center of the Season tab: score or countdown,
// venue and TV, where the opponent sits, the season series, and share /
// add-to-calendar actions.
export default function GameHero({ schedule, standings, onOpenGame }) {
  // Re-render every 30s so the "tips in" line stays honest between data refreshes.
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  const events = schedule.events
  const pick = pickFeatured(events)
  if (!pick) return null
  const featured = pick.game
  const nextGame = pick.next
  const lastGame = pick.last
  const liveGame = pick.mode === 'live' ? featured : null
  const played = events.filter((e) => e.final)
  // 'recent' (the morning after) presents as a final; it just adds the next game below.
  const mode = pick.mode === 'live' ? 'live' : pick.mode === 'next' ? 'next' : 'last'
  const gameDay = mode === 'next' && ctDaysFromToday(featured.date) === 0

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

  // Share the reader's page, not the iframe's github.io address, and say what
  // the game is: "Rockets 132, Bucks 100" / "Live: Bucks 58, Cavaliers 76 (Q3 · 5:12)" /
  // "Bucks vs Cavaliers — Sat, Oct 31, 7:00 PM CT".
  const share = async () => {
    track('Share', { mode })
    const embedded = window.self !== window.top
    const url = embedded ? WPR_TRACKER_PAGE : window.location.href
    const ot = featured.period > 4 ? ` (${featured.period === 5 ? 'OT' : `${featured.period - 4}OT`})` : ''
    const text = featured.final
      ? (featured.won
        ? `Bucks ${featured.ourScore}, ${featured.opponent.name} ${featured.theirScore}${ot}`
        : `${featured.opponent.name} ${featured.theirScore}, Bucks ${featured.ourScore}${ot}`)
      : featured.live
        ? `Live: Bucks ${featured.ourScore}, ${featured.opponent.name} ${featured.theirScore} (${liveLabel(featured)})`
        : `Bucks ${featured.home ? 'vs' : 'at'} ${featured.opponent.name} — ${gameDate(featured.date)}, ${gameTime(featured.date)} CT`
    const payload = { title: 'The Bucks, by the numbers — Wausau Pilot & Review', text, url }
    // A dismissed share sheet is a normal outcome; a blocked clipboard (an
    // embed without clipboard-write) is logged rather than thrown at the reader.
    if (navigator.share) { try { await navigator.share(payload) } catch { return } }
    else navigator.clipboard?.writeText(`${text} ${url}`).catch((err) => console.error('Copy failed:', err))
  }

  return (
    <div className={`hero ${mode}`}>
      <div className="hero-kicker">
        {mode === 'live' && <>
          <span className="live-dot" aria-hidden="true" />
          <span className="live-label">Live</span>
          <span className="soft">{liveLabel(featured)}</span>
        </>}
        {mode === 'next' && gameDay && <>
          {/* Game day: the when and the channel are the headline, not grey small print. */}
          <span className="hero-when">
            {todayWord(featured.date)} · {gameTime(featured.date)} CT{featured.tv ? ` · ${featured.tv}` : ''}
          </span>
          <span className="soft">Tips in {countdown(featured.date)}</span>
        </>}
        {mode === 'next' && !gameDay && <>
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

      {mode === 'live' && <LiveGame game={featured} />}

      <div className="hero-context">
        {mode === 'last' && (
          <div className="hero-recap">{recapFor(featured, recaps)}</div>
        )}
        {/* On game day the kicker already carries the time and channel. */}
        {mode === 'next' && (gameDay
          ? featured.venue && <div>{featured.venue}</div>
          : (
            <div>
              {gameDate(featured.date)} · {gameTime(featured.date)} CT
              {featured.venue ? ` · ${featured.venue}` : ''}{featured.tv ? ` · ${featured.tv}` : ''}
            </div>
          ))}
        {mode === 'live' && featured.venue && (
          <div>{featured.venue}{featured.tv ? ` · ${featured.tv}` : ''}</div>
        )}
        {mode !== 'last' && opp && opp.played > 0 && (
          <div>
            The {opp.name} are {opp.wins}–{opp.losses}
            {opp.seed ? ` (#${opp.seed} in the ${opp.conference})` : ''}
            {/* Before ten games, "last 10" is just the record again. */}
            {opp.played >= 10 ? ` · last 10: ${opp.lastTen}` : ''}
          </div>
        )}
        <div>{seriesText(series.length, seriesWins, playoffGame)}</div>
        {/* Game-day mornings: the next game leads, last night's result rides along. */}
        {mode === 'next' && lastGame && (
          <div className="hero-last">Last time out: {recapFor(lastGame, recaps)}</div>
        )}
        {/* The morning after: the result leads, the next game rides along. */}
        {pick.mode === 'recent' && nextGame && (
          <div className="hero-last">
            Next up{gameLabel(nextGame) ? ` (${gameLabel(nextGame)})` : ''}: {gameDate(nextGame.date)} · {gameTime(nextGame.date)} CT {nextGame.home ? 'vs' : 'at'} the {nextGame.opponent.name}
            {nextGame.tv ? ` · ${nextGame.tv}` : ''}
          </div>
        )}
        {mode === 'last' && !nextGame && (over
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
