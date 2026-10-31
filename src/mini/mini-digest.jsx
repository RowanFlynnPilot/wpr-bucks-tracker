import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { PLAYOFF_LINE, PLAY_IN_LINE, SPONSOR, TEAM_ABBR, TEAM_LOGO, VENUE, WATCH_VENUES } from '../config.js'
import { fetchGameDetail, fetchSchedule, fetchStandings } from '../api.js'
import { gameDate, gameTime, liveLabel } from '../format.js'
import { buildRecapContext, recapFor } from '../recaps.js'
import { destination, trackMiniClick } from './mini-shared.js'
import './mini.css'

// The newsletter digest: last game (score, the recap line, the Bucks' points /
// rebounds / assists leaders with their box-score lines), next up (tip, venue,
// TV), the East around the Bucks' seed, any sold game-day partner, and the
// title sponsor's sign-off. Same grammar as the Brewers and Packers digests so
// the morning newsletter's sports slot reads as one family.
//
// Rendered to digest.png by scripts/render-digest.mjs (email can't run the
// live widget). `?image=1` is the screenshot pass: no tap-through CTA (dead
// pixels in an email — the newsletter puts a real text link under the image),
// and the partner block prints. The card sets data-ready once every section's
// data is in, or data-error if a feed failed — the renderer refuses to bake an
// error card into a send (it falls back to the last good image and alerts).

const imageMode = new URLSearchParams(window.location.search).get('image') === '1'

// Dates only, never "Tonight": the image is baked before the 7:02 AM send by a
// GitHub cron that can drift, and a late render means subscribers get the
// previous bake — an explicit "Sat, Oct 31" stays true; "Tonight" wouldn't.

// The Bucks' top performers from the box score: one line per category, the
// category stat first, then context.
const PERFORMER_LINES = {
  points: (s) => `${s('PTS')} PTS · ${s('FG')} FG`,
  rebounds: (s) => `${s('REB')} REB · ${s('PTS')} PTS`,
  assists: (s) => `${s('AST')} AST · ${s('PTS')} PTS`,
}

const PERFORMER_ORDER = Object.keys(PERFORMER_LINES)

function performers(detail) {
  const ours = detail.leaders.find((t) => t.abbr === TEAM_ABBR)
  if (!ours) return []
  const { names, rows } = detail.boxScore
  return ours.cats
    .filter((c) => PERFORMER_LINES[c.name] && c.athleteId)
    .sort((a, b) => PERFORMER_ORDER.indexOf(a.name) - PERFORMER_ORDER.indexOf(b.name))
    .map((c) => {
      const row = rows.find((r) => r.id === c.athleteId)
      const stat = (col) => row?.stats[names.indexOf(col)] ?? '–'
      return { key: c.name, label: c.label, name: c.athlete, headshot: c.headshot, line: row ? PERFORMER_LINES[c.name](stat) : c.value }
    })
}

// Five rows of the East centered on the Bucks — the seed race is the NBA's real
// standings story, and a window keeps the image compact.
function eastWindow(east) {
  const i = east.findIndex((r) => r.abbr === TEAM_ABBR)
  const start = Math.min(Math.max(0, i - 2), Math.max(0, east.length - 5))
  return east.slice(start, start + 5)
}

// Games `a` trails `b`, as a sports desk writes it: "a half-game", "1 game",
// "2.5 games". Zero when level.
function gb(a, b) {
  const g = Math.max(0, ((b.wins - a.wins) + (a.losses - b.losses)) / 2)
  if (g === 0.5) return 'a half-game'
  if (g === 1) return '1 game'
  return `${Number.isInteger(g) ? g : g.toFixed(1)} games`
}

// One line that places the Bucks against the lines the window may not show.
function seedRace(east) {
  const us = east.find((r) => r.abbr === TEAM_ABBR)
  if (!us.seed) return null
  if (us.seed <= PLAYOFF_LINE) {
    return `In playoff position — ${gb(east[PLAYOFF_LINE], us)} clear of the play-in.`
  }
  if (us.seed <= PLAY_IN_LINE) {
    return `In the play-in field — ${gb(us, east[PLAYOFF_LINE - 1])} back of the top six.`
  }
  const tenth = east[PLAY_IN_LINE - 1]
  const line = `${gb(us, tenth)} back of the play-in (10th: ${tenth.name}, ${tenth.wins}–${tenth.losses}).`
  return line[0].toUpperCase() + line.slice(1) // "a half-game back…" opens the sentence
}

function MiniDigest() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    Promise.all([fetchSchedule(), fetchStandings()])
      .then(async ([schedule, standings]) => {
        const finals = schedule.events.filter((e) => e.final)
        const last = finals[finals.length - 1] ?? null
        const detail = last ? await fetchGameDetail(last.id) : null
        if (alive) setData({ schedule, standings, last, detail })
      })
      .catch((err) => { if (alive) setError(err.message) })
    return () => { alive = false }
  }, [])

  if (error) return <div className="mini-card digest" data-error="true"><div className="dg-sec">Digest unavailable. ({error})</div></div>
  if (!data) return <div className="mini-card digest"><div className="dg-sec">Loading…</div></div>

  const { schedule, standings, last, detail } = data
  const events = schedule.events
  const live = events.find((e) => e.live) ?? null
  const next = events.find((e) => !e.final && !e.live) ?? null
  const recaps = buildRecapContext(events)
  const preseason = !events.some((e) => e.final || e.live)
  const partners = imageMode ? WATCH_VENUES.filter((v) => v.url).slice(0, 2) : []

  const Card = imageMode ? 'div' : 'a'
  const linkProps = imageMode ? {} : { href: destination(), target: '_top', onClick: () => trackMiniClick('digest') }

  return (
    <Card className="mini-card digest" data-ready="true" {...linkProps}>
      <div className="dg-band">Bucks digest</div>

      {live && (
        <div className="dg-sec">
          <div className="dg-kicker">Live now · {liveLabel(live)}{live.tag ? ` · ${live.tag}` : ''}</div>
          <ScoreLockup game={live} />
        </div>
      )}

      {!live && last && (
        <div className="dg-sec">
          <div className="dg-kicker">Last game · {last.tag ? `${last.tag} · ` : ''}{gameDate(last.date)}</div>
          <ScoreLockup game={last} />
          <p className="dg-recap">{recapFor(last, recaps)}</p>
          {detail && performers(detail).map((p) => (
            <div className="dg-perf" key={p.key}>
              <span className="dg-who">
                {p.headshot
                  ? <img src={p.headshot} alt="" width="24" height="24" />
                  : <span className="dg-face-gap" aria-hidden="true" />}
                <span className="dg-name"><b>{p.label}</b> {p.name}</span>
              </span>
              <span className="dg-line">{p.line}</span>
            </div>
          ))}
        </div>
      )}

      {next && (
        <div className="dg-sec">
          <div className="dg-kicker">
            {preseason && next.stage === 'regular' ? 'Opening night' : 'Next up'} · {next.tag ? `${next.tag} · ` : ''}
            {gameDate(next.date)} · {gameTime(next.date)} CT
          </div>
          <div className="dg-lockup next">
            <img src={TEAM_LOGO} alt="" width="20" height="20" />
            <span className="dg-team us">Bucks</span>
            <span className="dg-vsat">{next.home ? 'vs' : 'at'}</span>
            <span className="dg-team">{next.opponent.name}</span>
            {next.opponent.logo && <img src={next.opponent.logo} alt="" width="20" height="20" />}
          </div>
          <div className="dg-sub">
            {[next.home && !next.neutral ? VENUE : next.venue, next.tv].filter(Boolean).join(' · ')}
          </div>
        </div>
      )}

      <div className="dg-sec">
        <div className="dg-kicker">Eastern Conference</div>
        {standings.east.every((r) => r.played === 0)
          ? <p className="dg-sub left">Everyone's 0–0 until opening night — the race starts with the first tip.</p>
          : <>
              <EastTable rows={eastWindow(standings.east)} />
              {seedRace(standings.east) && <div className="dg-caption">{seedRace(standings.east)}</div>}
            </>}
      </div>

      {partners.length > 0 && (
        <div className="dg-sec dg-partner">
          <div className="dg-kicker">{partners.length > 1 ? 'Game-day partners' : 'Game-day partner'}</div>
          {partners.map((v) => (
            <div className="dg-partner-row" key={v.name}>
              {(v.logo || v.images?.[0]) && <img src={v.logo ?? v.images[0]} alt="" width="48" height="48" />}
              <div>
                <div className="dg-partner-name">{v.name}</div>
                {v.tagline && <div className="dg-partner-tag">{v.tagline}</div>}
                {(v.address || v.phone) && <div className="dg-partner-meta">{[v.address, v.phone].filter(Boolean).join(' · ')}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {(SPONSOR || !imageMode) && (
        <div className="dg-foot">
          {SPONSOR ? (
            <span className="dg-presented">
              <span>Presented by</span>
              {SPONSOR.logo ? <img src={SPONSOR.logo} alt={SPONSOR.name} /> : <em>{SPONSOR.name}</em>}
            </span>
          ) : <span />}
          {!imageMode && <span className="dg-cta">Full tracker →</span>}
        </div>
      )}
    </Card>
  )
}

function ScoreLockup({ game }) {
  const bucksWon = game.final && game.won
  const theyWon = game.final && !game.won
  return (
    <div className="dg-lockup">
      <span className="dg-side">
        <img src={TEAM_LOGO} alt="" width="22" height="22" />
        <span className={`dg-team ${bucksWon ? 'win' : ''}`}>Bucks</span>
      </span>
      <span className="dg-score">
        <span className={bucksWon ? 'win' : ''}>{game.ourScore}</span>
        <span className="dash"> – </span>
        <span className={theyWon ? 'lose-win' : ''}>{game.theirScore}</span>
      </span>
      <span className="dg-side">
        <span className="dg-team">{game.opponent.name}</span>
        {game.opponent.logo && <img src={game.opponent.logo} alt="" width="22" height="22" />}
      </span>
    </div>
  )
}

function EastTable({ rows }) {
  return (
    <>
      <table className="dg-table">
        <thead>
          <tr><th className="left" colSpan={2}>Team</th><th>W</th><th>L</th><th>GB</th><th>Strk</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const us = r.abbr === TEAM_ABBR
            const streak = r.streak && r.streak !== '-' ? r.streak : '—'
            return (
              <tr key={r.teamId} className={[
                us ? 'us' : '',
                r.seed === PLAYOFF_LINE ? 'playoff-line' : '',
                r.seed === PLAY_IN_LINE ? 'play-in-line' : '',
              ].filter(Boolean).join(' ')}>
                <td className="seed">{r.seed ?? '–'}</td>
                <td className="left">
                  <span className="dg-tteam">
                    {r.logo && <img src={r.logo} alt="" width="17" height="17" />}
                    {r.name}
                  </span>
                </td>
                <td>{r.wins}</td>
                <td>{r.losses}</td>
                <td>{r.gamesBehind}</td>
                <td className={streak[0] === 'W' ? 'strk-w' : streak[0] === 'L' ? 'strk-l' : ''}>{streak}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MiniDigest />
  </StrictMode>
)
