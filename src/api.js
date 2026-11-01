// Browser-direct fetches against ESPN's public, CORS-open APIs.
// No scraper, no cron, no committed JSON — see CLAUDE.md for why.
// Every function throws on a bad response. No fallbacks.

import { SEASON, TEAM_ID, TEAM_ABBR } from './config.js'

const SITE = 'https://site.api.espn.com/apis'
const CORE = 'https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba'

async function getJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`ESPN request failed: ${res.status} ${url}`)
  return res.json()
}

// Regular season (type 2), the Play-In Tournament (type 5 — its own season
// type, easy to miss) and the playoffs (type 3), merged and date-sorted.
// Empty play-in/playoff arrays are data (didn't qualify), not errors.
export async function fetchSchedule() {
  const schedule = (type) =>
    getJson(`${SITE}/site/v2/sports/basketball/nba/teams/${TEAM_ID}/schedule?season=${SEASON}&seasontype=${type}`)
  const [regular, playIn, playoffs] = await Promise.all([schedule(2), schedule(5), schedule(3)])
  const events = [
    // The NBA Cup championship arrives with the regular season but doesn't
    // count in the standings — its competition type is the one tell.
    ...(regular.events ?? []).map((e) =>
      normalizeEvent(e, e.competitions[0].type?.slug === 'commissioners-cup' ? 'cupFinal' : 'regular')),
    ...(playIn.events ?? []).map((e) => normalizeEvent(e, 'playIn')),
    ...(playoffs.events ?? []).map((e) => normalizeEvent(e, 'playoffs')),
  ]
    .filter((e) => !e.dead) // postponed/canceled shells aren't games
    .sort((a, b) => a.date - b.date)
  // `requestedSeason` is the season we asked for. The top-level `season` block
  // is the league's CURRENT season and flips to next year every September —
  // it mislabeled last season's data as "2026-27" until the rollover.
  return { seasonLabel: regular.requestedSeason.displayName, events: await withLiveScores(events) }
}

// ESPN's team schedule drops a game's score while the clock is running — it
// only fills it in at breaks and after the final (seen on live WNBA and MLB
// games from the same API) — so a live game's score and status come from that
// day's league scoreboard instead. The scoreboard files games under their US
// Eastern date, even late West Coast tips.
const easternDay = (date) =>
  date.toLocaleDateString('en-CA', { timeZone: 'America/New_York' }).replaceAll('-', '')

async function withLiveScores(events) {
  const live = events.filter((e) => e.live)
  if (live.length === 0) return events
  const days = [...new Set(live.map((e) => easternDay(e.date)))]
  const boards = await Promise.all(
    days.map((d) => getJson(`${SITE}/site/v2/sports/basketball/nba/scoreboard?dates=${d}`))
  )
  const byId = new Map(boards.flatMap((b) => b.events.map((ev) => [ev.id, ev.competitions[0]])))
  return events.map((e) => {
    if (!e.live) return e
    const comp = byId.get(e.id)
    if (!comp) throw new Error(`Live game ${e.id} missing from the ${easternDay(e.date)} scoreboard`)
    const us = comp.competitors.find((c) => c.team.abbreviation === TEAM_ABBR)
    const them = comp.competitors.find((c) => c.team.abbreviation !== TEAM_ABBR)
    const type = comp.status.type
    return {
      ...e,
      final: type.state === 'post' && type.completed === true,
      live: type.state === 'in',
      period: comp.status.period ?? e.period,
      clock: comp.status.displayClock ?? '',
      detail: type.shortDetail ?? '',
      won: us.winner === true,
      ourScore: us.score ?? null, // a plain string on the scoreboard
      theirScore: them.score ?? null,
    }
  })
}

// Postponed/canceled — and anything else ESPN closes out without completing it.
const DEAD_STATUSES = new Set(['STATUS_POSTPONED', 'STATUS_CANCELED'])

const STAGE_TAGS = { playIn: 'Play-In', playoffs: 'Playoffs', cupFinal: 'NBA Cup Final' }

// Wisconsin readers get the Bucks-market feed; a national window trumps it.
// National exclusives on streaming (Prime Video, Peacock — 11 Bucks games in
// 2025-26) arrive as type "Streaming", not "TV", and carry no local feed at
// all, so they count as national windows too — TV first when a game has both.
function pickBroadcast(broadcasts, ourSide) {
  const list = broadcasts ?? []
  const national = list.filter((b) => b.market?.type === 'National')
  const pick =
    national.find((b) => b.type?.shortName === 'TV') ??
    national.find((b) => b.type?.shortName === 'Streaming') ??
    list.find((b) => b.type?.shortName === 'TV' && b.market?.type?.toLowerCase() === ourSide)
  return pick?.media?.shortName ?? null
}

// `stage` comes from which endpoint the event was fetched from (plus the Cup
// final's competition type) — the thing we know for certain — not from
// sniffing notes. Only 'regular' games count toward the record: the race
// chart, recap records, season series and calendar facts all key off it.
function normalizeEvent(event, stage) {
  const comp = event.competitions[0]
  const us = comp.competitors.find((c) => c.team.abbreviation === TEAM_ABBR)
  const them = comp.competitors.find((c) => c.team.abbreviation !== TEAM_ABBR)
  const type = comp.status.type // state: pre | in | post (halftime/period breaks are state "in")
  return {
    id: event.id,
    date: new Date(comp.date),
    final: type.state === 'post' && type.completed === true,
    live: type.state === 'in',
    dead: DEAD_STATUSES.has(type.name) || (type.state === 'post' && type.completed !== true),
    period: comp.status.period ?? 0,
    clock: comp.status.displayClock ?? '',
    detail: type.shortDetail ?? '', // "Halftime", "End of 3rd" — names the breaks
    home: us.homeAway === 'home',
    // Cup semis/finals in Las Vegas list a designated "home" team — not a Fiserv Forum date.
    neutral: comp.neutralSite === true,
    stage,
    tag: STAGE_TAGS[stage] ?? null,
    won: us.winner === true,
    ourScore: us.score?.displayValue ?? null,
    theirScore: them.score?.displayValue ?? null,
    venue: comp.venue?.fullName ?? null,
    tv: pickBroadcast(comp.broadcasts, us.homeAway),
    // Group play and knockouts; the final carries its own tag instead.
    cup: stage === 'regular' && (comp.notes ?? []).some((n) => (n.headline ?? '').includes('NBA Cup')),
    // "Group Play" / "Quarterfinals" / "Semifinals" — from ESPN's note headline.
    cupRound: (comp.notes ?? []).map((n) => n.headline ?? '').find((h) => h.startsWith('NBA Cup - '))?.slice(10) ?? null,
    opponent: {
      id: them.team.id,
      abbr: them.team.abbreviation,
      name: them.team.shortDisplayName ?? them.team.displayName,
      logo: them.team.logos?.[0]?.href ?? null,
    },
  }
}

const dashed = (record) => record.replace('-', '–')

// Both conferences, each sorted by playoff seed. The Season tab renders the East;
// the West rows feed opponent context in the hero and league-wide scoring ranks.
// Before opening night ESPN publishes every team at 0–0 with playoffSeed 0 and
// no "Last Ten Games" stat at all — a real data state, normalized here: seed 0
// becomes null (unseeded, sorted alphabetically after any seeded teams) and a
// team that hasn't played gets a 0-0 last ten. Once a team HAS played, a
// missing last-ten still throws.
export async function fetchStandings() {
  const data = await getJson(`${SITE}/v2/sports/basketball/nba/standings?season=${SEASON}`)
  const conference = (name, label) => {
    const conf = data.children.find((c) => c.name === name)
    if (!conf) throw new Error(`${name} missing from standings response`)
    const rows = conf.standings.entries.map((entry) => {
      const stats = Object.fromEntries(entry.stats.map((s) => [s.name, s]))
      const played = stats.wins.value + stats.losses.value
      return {
        teamId: entry.team.id,
        abbr: entry.team.abbreviation,
        name: entry.team.shortDisplayName ?? entry.team.displayName,
        logo: entry.team.logos?.[0]?.href ?? null,
        conference: label,
        wins: stats.wins.value,
        losses: stats.losses.value,
        played,
        winPct: stats.winPercent.displayValue,
        winPctValue: stats.winPercent.value,
        gamesBehind: stats.gamesBehind.displayValue,
        streak: stats.streak.displayValue,
        // ESPN writes split records with hyphens ("3-2"); the tracker's records
        // use en dashes ("3–2") — normalized once, here.
        lastTen: played === 0 ? '0–0' : dashed(stats['Last Ten Games'].displayValue),
        pointDiff: stats.differential.displayValue,
        pointDiffValue: stats.differential.value,
        seed: stats.playoffSeed.value > 0 ? stats.playoffSeed.value : null,
        homeRecord: dashed(stats.Home.displayValue),
        roadRecord: dashed(stats.Road.displayValue),
        divRecord: dashed(stats['vs. Div.'].displayValue),
        ppg: stats.avgPointsFor.value,
        ppgDisplay: stats.avgPointsFor.displayValue,
        oppg: stats.avgPointsAgainst.value,
        oppgDisplay: stats.avgPointsAgainst.displayValue,
      }
    })
    rows.sort((a, b) => (a.seed ?? 99) - (b.seed ?? 99) || a.name.localeCompare(b.name))
    return rows
  }
  const east = conference('Eastern Conference', 'East')
  const west = conference('Western Conference', 'West')
  if (!east.some((r) => r.abbr === TEAM_ABBR)) {
    throw new Error(`${TEAM_ABBR} missing from standings response`)
  }
  return { east, west }
}

// Team statistical leaders for the season, with athlete refs resolved to
// names/headshots. Refs are the correct source: the current roster does not
// contain players who left mid-season, but their season leads still stand.
const LEADER_CATEGORIES = [
  'pointsPerGame',
  'reboundsPerGame',
  'assistsPerGame',
  'stealsPerGame',
  'blocksPerGame',
  'fieldGoalPercentage',
]

// The Leaders tab unmounts on every tab switch, so results are cached at
// module scope, per season. A rejected load clears its entry so a retry is
// possible. Before opening night ESPN 404s the new season's leaders, so the
// tab asks for last season's board instead (it knows the team is 0–0).
const leadersBySeason = new Map()

export function fetchLeaders(season = SEASON) {
  if (!leadersBySeason.has(season)) {
    const p = loadLeaders(season)
    p.catch(() => leadersBySeason.delete(season))
    leadersBySeason.set(season, p)
  }
  return leadersBySeason.get(season)
}

async function loadLeaders(season) {
  const data = await getJson(`${CORE}/seasons/${season}/types/2/teams/${TEAM_ID}/leaders?limit=50`)
  const categories = data.categories
    .filter((c) => LEADER_CATEGORIES.includes(c.name))
    .sort((a, b) => LEADER_CATEGORIES.indexOf(a.name) - LEADER_CATEGORIES.indexOf(b.name))
  if (categories.length === 0) throw new Error('No leader categories in ESPN response')

  const refs = new Map()
  for (const cat of categories) {
    for (const leader of cat.leaders.slice(0, 3)) {
      refs.set(leader.athlete.$ref, null)
    }
  }
  await Promise.all(
    [...refs.keys()].map(async (ref) => {
      const a = await getJson(ref.replace(/^http:/, 'https:'))
      // Season stat line for the sub-text under each leader row. The ref hangs
      // off the season-athlete object; a player with none simply gets no sub-line.
      let stats = null
      if (a.statistics?.$ref) {
        const st = await getJson(a.statistics.$ref.replace(/^http:/, 'https:'))
        stats = {}
        for (const cat of st.splits?.categories ?? []) {
          for (const s of cat.stats) stats[s.name] = s.displayValue
        }
      }
      refs.set(ref, {
        id: a.id,
        name: a.displayName,
        headshot: a.headshot?.href ?? null,
        position: a.position?.abbreviation ?? '',
        jersey: a.jersey ?? '',
        stats,
      })
    })
  )

  return categories.map((cat) => ({
    name: cat.name,
    label: cat.displayName,
    leaders: cat.leaders.slice(0, 3).map((l) => ({
      value: l.displayValue,
      athlete: refs.get(l.athlete.$ref),
    })),
  }))
}

// ---------- ESPN's season projection (BPI) ----------
// The playoff picture comes from ESPN's Basketball Power Index, published and
// labeled as ESPN's: results to date plus ESPN's player ratings, re-run daily.
// It replaced a house Monte Carlo that, five games in, printed 5% for the
// play-in against BPI's 0.2% and moved on every refresh. Cached per page —
// BPI only updates once a day.
let outlookPromise = null

export function fetchOutlook() {
  if (!outlookPromise) {
    outlookPromise = loadOutlook()
    outlookPromise.catch(() => { outlookPromise = null })
  }
  return outlookPromise
}

async function loadOutlook() {
  const d = await getJson(`${CORE}/seasons/${SEASON}/powerindex/${TEAM_ID}`)
  const stats = Object.fromEntries(d.stats.map((s) => [s.name, s]))
  const stat = (name) => {
    if (!stats[name]) throw new Error(`ESPN BPI response missing ${name}`)
    return stats[name]
  }
  const projW = Math.round(stat('projectedw').value)
  return {
    playoffs: stat('probmakeplayoffs').displayValue, // includes reaching it through the play-in
    top6: stat('top6seed').displayValue,
    playIn: stat('playinchance').displayValue,
    projW,
    projL: Math.round(stat('projectedw').value + stat('projectedl').value) - projW,
    projSeed: Math.round(stat('playoffseed').value),
    updated: d.lastUpdated ? new Date(d.lastUpdated) : null,
  }
}

// ---------- NBA Cup group table ----------
// ESPN publishes no Cup group standings, so the table is built from the group's
// own schedules: the Bucks' "NBA Cup - Group Play" opponents ARE the group, and
// each one's schedule supplies the games the Bucks aren't in. Tiebreakers per
// the NBA's Cup rules: head-to-head among the tied teams, then point
// differential in group games with OVERTIME EXCLUDED (the schedule feed has no
// quarter scores, so an overtime game's regulation margin comes from its box
// score), then points scored. Cached per `key` — pass something that changes
// when results do (the Bucks' finals count), so a Cup night refreshes it.
const cupCache = new Map()

export function fetchCupGroup(opponentIds, key) {
  const cacheKey = `${opponentIds.join(',')}|${key}`
  if (!cupCache.has(cacheKey)) {
    const p = loadCupGroup(opponentIds)
    p.catch(() => cupCache.delete(cacheKey))
    cupCache.set(cacheKey, p)
  }
  return cupCache.get(cacheKey)
}

async function loadCupGroup(opponentIds) {
  const teamIds = [TEAM_ID, ...opponentIds]
  const schedules = await Promise.all(teamIds.map((id) =>
    getJson(`${SITE}/site/v2/sports/basketball/nba/teams/${id}/schedule?season=${SEASON}&seasontype=2`)))

  const teams = new Map()
  const games = new Map()
  for (const s of schedules) {
    for (const e of s.events ?? []) {
      const comp = e.competitions[0]
      if (!(comp.notes ?? []).some((n) => n.headline === 'NBA Cup - Group Play')) continue
      if (!comp.competitors.every((c) => teamIds.includes(c.team.id))) continue
      for (const c of comp.competitors) {
        teams.set(c.team.id, { id: c.team.id, abbr: c.team.abbreviation, name: c.team.shortDisplayName ?? c.team.displayName, logo: c.team.logos?.[0]?.href ?? null })
      }
      const type = comp.status.type
      games.set(e.id, {
        id: e.id,
        final: type.state === 'post' && type.completed === true,
        period: comp.status.period ?? 0,
        sides: comp.competitors.map((c) => ({ id: c.team.id, score: Number(c.score?.displayValue ?? c.score?.value ?? 0) })),
      })
    }
  }

  // Regulation-only scores for overtime finals (the tiebreaker margin).
  const finals = [...games.values()].filter((g) => g.final)
  await Promise.all(finals.filter((g) => g.period > 4).map(async (g) => {
    const d = await fetchGameDetail(g.id)
    const regulation = (side) => side.quarters.slice(0, 4).reduce((sum, q) => sum + Number(q), 0)
    const byAbbr = { [d.home.abbr]: regulation(d.home), [d.away.abbr]: regulation(d.away) }
    g.regulation = g.sides.map((s) => byAbbr[teams.get(s.id).abbr])
  }))

  const rows = [...teams.values()].map((t) => ({ ...t, wins: 0, losses: 0, diff: 0, pointsFor: 0 }))
  const row = (id) => rows.find((r) => r.id === id)
  for (const g of finals) {
    const [a, b] = g.sides
    const winner = a.score > b.score ? a : b
    const loser = winner === a ? b : a
    row(winner.id).wins++
    row(loser.id).losses++
    const [ra, rb] = g.regulation ?? [a.score, b.score]
    row(a.id).diff += ra - rb
    row(b.id).diff += rb - ra
    row(a.id).pointsFor += ra
    row(b.id).pointsFor += rb
  }

  // Head-to-head winning percentage among a set of tied teams — a percentage,
  // not a win count, so a team that hasn't met the others yet isn't ranked as
  // if it lost to them (mid-group it sits at an even .500).
  const h2hPct = (id, ids) => {
    const meetings = finals.filter((g) => g.sides.every((s) => ids.includes(s.id)) && g.sides.some((s) => s.id === id))
    if (meetings.length === 0) return 0.5
    const wins = meetings.filter((g) => { const [a, b] = g.sides; return (a.score > b.score ? a : b).id === id }).length
    return wins / meetings.length
  }
  const criteria = [
    (r, ids) => h2hPct(r.id, ids),
    (r) => r.diff,
    (r) => r.pointsFor,
  ]
  // Apply the criteria in order; when one splits the group, every subset that
  // is still tied starts over from head-to-head among just those teams.
  const breakTie = (tied) => {
    if (tied.length < 2) return tied
    const ids = tied.map((r) => r.id)
    for (const value of criteria) {
      const scored = tied.map((r) => ({ r, v: value(r, ids) }))
      const levels = [...new Set(scored.map((s) => s.v))].sort((a, b) => b - a)
      if (levels.length === 1) continue
      return levels.flatMap((v) => breakTie(scored.filter((s) => s.v === v).map((s) => s.r)))
    }
    return [...tied].sort((x, y) => x.name.localeCompare(y.name)) // the NBA draws lots; we go alphabetical
  }
  rows.sort((x, y) => (y.wins - x.wins) || (x.losses - y.losses))
  const sorted = []
  for (let i = 0; i < rows.length;) {
    const tied = rows.filter((r) => r.wins === rows[i].wins && r.losses === rows[i].losses)
    sorted.push(...breakTie(tied))
    i += tied.length
  }
  return { rows: sorted, played: finals.length, total: games.size }
}

// ---------- Injuries ----------

// Per team: the Bucks' report, plus the next opponent's on the Schedule tab.
const injuriesByTeam = new Map()

export function fetchInjuries(teamId = TEAM_ID) {
  if (!injuriesByTeam.has(teamId)) {
    const p = loadInjuries(teamId)
    p.catch(() => injuriesByTeam.delete(teamId))
    injuriesByTeam.set(teamId, p)
  }
  return injuriesByTeam.get(teamId)
}

// An empty report is data (everyone's healthy), not an error.
async function loadInjuries(teamId) {
  const list = await getJson(`${CORE}/teams/${teamId}/injuries?limit=50`)
  const items = await Promise.all(
    (list.items ?? []).map(async (item) => {
      const injury = await getJson(item.$ref.replace(/^http:/, 'https:'))
      const athlete = await getJson(injury.athlete.$ref.replace(/^http:/, 'https:'))
      return {
        id: injury.id,
        status: injury.status, // "Out" | "Day-To-Day" | ...
        comment: injury.shortComment ?? '',
        date: injury.date ? new Date(injury.date) : null,
        name: athlete.displayName,
        position: athlete.position?.abbreviation ?? '',
        headshot: athlete.headshot?.href ?? null,
      }
    })
  )
  const severity = (s) => (s === 'Out' ? 0 : 1)
  items.sort((a, b) => severity(a.status) - severity(b.status) || (b.date ?? 0) - (a.date ?? 0))
  return items
}

// ---------- Roster season stats (Season stats tab) ----------

// Every player's season line for the Bucks in one call. Players dealt away
// mid-season stay in it with their Milwaukee numbers (verified: 2025-26 still
// lists Giannis, 36 games), so it never drops a departed player the way a
// roster join would.
let rosterStatsPromise = null

export function fetchRosterStats() {
  if (!rosterStatsPromise) {
    rosterStatsPromise = loadRosterStats()
    rosterStatsPromise.catch(() => { rosterStatsPromise = null })
  }
  return rosterStatsPromise
}

async function loadRosterStats() {
  const d = await getJson(`${SITE}/site/v2/sports/basketball/nba/teams/${TEAM_ID}/athletes/statistics?season=${SEASON}&seasontype=2`)
  const block = d.results.find((r) => r.name === 'game')
  if (!block) throw new Error('ESPN roster stats response missing the game block')
  return block.leaders.map((l) => {
    const stats = {}
    for (const cat of l.statistics) for (const s of cat.stats) stats[s.name] = s
    const stat = (name) => {
      if (!stats[name]) throw new Error(`ESPN roster stats missing ${name} for ${l.athlete.displayName}`)
      return { value: stats[name].value, display: stats[name].displayValue }
    }
    return {
      id: l.athlete.id,
      name: l.athlete.shortName,
      position: l.athlete.position?.abbreviation ?? '',
      gp: stat('gamesPlayed'),
      min: stat('avgMinutes'),
      pts: stat('avgPoints'),
      reb: stat('avgRebounds'),
      ast: stat('avgAssists'),
      stl: stat('avgSteals'),
      blk: stat('avgBlocks'),
      fg: stat('fieldGoalPct'),
      three: stat('threePointPct'),
    }
  })
}

// ---------- Player season stat sheets (box-score cards) ----------

const playerSeasons = new Map()

export function fetchPlayerSeason(athleteId) {
  if (!playerSeasons.has(athleteId)) {
    const p = loadPlayerSeason(athleteId)
    p.catch(() => playerSeasons.delete(athleteId))
    playerSeasons.set(athleteId, p)
  }
  return playerSeasons.get(athleteId)
}

async function loadPlayerSeason(athleteId) {
  const a = await getJson(`${CORE}/seasons/${SEASON}/athletes/${athleteId}?lang=en&region=us`)
  let stats = null
  if (a.statistics?.$ref) {
    const st = await getJson(a.statistics.$ref.replace(/^http:/, 'https:'))
    stats = {}
    for (const cat of st.splits?.categories ?? []) {
      for (const s of cat.stats) stats[s.name] = s.displayValue
    }
  }
  return {
    name: a.displayName,
    headshot: a.headshot?.href ?? null,
    position: a.position?.abbreviation ?? '',
    jersey: a.jersey ?? '',
    stats,
  }
}

// ---------- Per-game detail (Film room) ----------

const gameDetails = new Map()

export function fetchGameDetail(eventId) {
  if (!gameDetails.has(eventId)) {
    const p = loadGameDetail(eventId)
    p.catch(() => gameDetails.delete(eventId))
    gameDetails.set(eventId, p)
  }
  return gameDetails.get(eventId)
}

// A game in progress changes every possession, so its summary is never cached
// (and never lands in the finals cache above).
export function fetchLiveGameDetail(eventId) {
  return loadGameDetail(eventId)
}

// NBA game time: quarters are 12 minutes, overtimes 5. The clock arrives as
// "M:SS" above a minute and "SS.d" under one; a break ("0.0") is the period's end.
const periodSec = (p) => (p <= 4 ? 720 : 300)

export function elapsedSec(period, clock) {
  let remaining
  if (!clock) remaining = 0
  else if (clock.includes(':')) {
    const [m, s] = clock.split(':')
    remaining = Number(m) * 60 + Number(s)
  } else remaining = parseFloat(clock)
  if (!Number.isFinite(remaining)) remaining = 0
  let base = 0
  for (let q = 1; q < period; q++) base += periodSec(q)
  return base + (periodSec(period) - remaining)
}

export function gameLengthSec(periods) {
  let total = 0
  for (let q = 1; q <= periods; q++) total += periodSec(q)
  return total
}

async function loadGameDetail(eventId) {
  const d = await getJson(`${SITE}/site/v2/sports/basketball/nba/summary?event=${eventId}`)
  const comp = d.header.competitions[0]
  const home = comp.competitors.find((c) => c.homeAway === 'home')
  const away = comp.competitors.find((c) => c.homeAway === 'away')
  const usHome = home.team.abbreviation === TEAM_ABBR

  const side = (c) => ({
    abbr: c.team.abbreviation,
    name: c.team.shortDisplayName ?? c.team.displayName,
    score: c.score,
    quarters: (c.linescores ?? []).map((l) => l.displayValue),
  })

  // The score flow: Bucks margin after every scoring play, on a real elapsed-
  // time axis (see elapsedSec).
  const plays = d.plays ?? []
  const maxPeriod = Math.max(4, ...plays.map((p) => p.period?.number ?? 0))
  const totalSec = gameLengthSec(maxPeriod)
  const flow = plays
    .filter((p) => p.scoringPlay && p.scoreValue > 0)
    .map((p) => ({
      t: elapsedSec(p.period?.number ?? 1, p.clock?.displayValue ?? ''),
      margin: usHome ? p.homeScore - p.awayScore : p.awayScore - p.homeScore,
    }))

  // Bucks field-goal attempts with usable coordinates. ESPN's shot `y` is
  // measured from the RIM (rim = 0; the baseline sits at -5.25, halfcourt at
  // +41.75) — verified against the "N-foot" distances in the play text (0.66 ft
  // mean error with the rim at 0, 2.65 ft with it at the baseline). `y` is
  // converted to court coordinates here: feet from the baseline, the frame
  // ShotChart draws in. ESPN marks free throws and dead plays with INT_MIN-ish
  // sentinel coords — those aren't chartable. The shooter id comes from the
  // play's participants and matches the box score.
  const RIM_FROM_BASELINE = 5.25
  const shots = plays
    .filter((p) =>
      p.shootingPlay && p.team?.id === TEAM_ID && p.coordinate &&
      p.coordinate.x >= 0 && p.coordinate.x <= 50 &&
      p.coordinate.y >= -RIM_FROM_BASELINE && p.coordinate.y <= 47 - RIM_FROM_BASELINE &&
      !/free throw/i.test(p.text ?? '')
    )
    .map((p) => ({
      x: p.coordinate.x,
      y: p.coordinate.y + RIM_FROM_BASELINE,
      made: p.scoringPlay === true,
      three: (p.pointsAttempted ?? p.scoreValue) === 3 || /three point/i.test(p.text ?? ''),
      shooterId: p.participants?.[0]?.athlete?.id ?? null,
      text: p.text,
    }))

  // Scoring plays feed the biggest-runs panel.
  const scoring = plays
    .filter((p) => p.scoringPlay && p.scoreValue > 0)
    .map((p) => ({
      ours: p.team?.id === TEAM_ID,
      points: p.scoreValue,
      period: p.period?.number ?? 0,
      clock: p.clock?.displayValue ?? '',
    }))

  // Top performer per stat, per team. Headshot arrives as a string in some
  // payloads and { href } in others — normalize to a URL or null.
  const headshotUrl = (h) => (typeof h === 'string' ? h : h?.href ?? null)
  const leaders = (d.leaders ?? []).map((t) => ({
    abbr: t.team?.abbreviation,
    cats: (t.leaders ?? []).map((c) => {
      const top = c.leaders?.[0]
      return {
        name: c.name,
        label: c.displayName,
        athlete: top?.athlete?.displayName ?? null,
        athleteId: top?.athlete?.id ?? null, // matches boxScore rows (the digest's stat lines)
        headshot: headshotUrl(top?.athlete?.headshot),
        value: top?.displayValue ?? '',
      }
    }),
  }))

  const boxTeams = d.boxscore?.teams ?? []
  const ourBox = boxTeams.find((t) => t.team.abbreviation === TEAM_ABBR)
  const theirBox = boxTeams.find((t) => t.team.abbreviation !== TEAM_ABBR)
  const statMap = (t) => Object.fromEntries((t?.statistics ?? []).map((s) => [s.name, s]))
  const ours = statMap(ourBox)
  const theirs = statMap(theirBox)
  const teamStats = Object.keys(ours)
    .filter((k) => k in theirs)
    .map((k) => ({ key: k, label: ours[k].label ?? ours[k].displayName ?? k, us: ours[k].displayValue, them: theirs[k].displayValue }))

  // The Bucks player box score. Column names ride along from ESPN
  // (MIN/PTS/FG/… order varies by season); players with no stat line (DNP)
  // are filtered at this boundary.
  const ourPlayers = (d.boxscore?.players ?? []).find((p) => p.team.abbreviation === TEAM_ABBR)
  const group = ourPlayers?.statistics?.[0]
  const boxScore = {
    names: group?.names ?? [],
    rows: (group?.athletes ?? [])
      .filter((a) => (a.stats ?? []).length > 0)
      .map((a) => ({
        id: a.athlete?.id ?? null,
        name: a.athlete?.shortName ?? a.athlete?.displayName ?? '',
        jersey: a.athlete?.jersey ?? '',
        starter: a.starter === true,
        stats: a.stats,
      })),
  }

  return { usHome, home: side(home), away: side(away), flow, maxPeriod, totalSec, shots, scoring, leaders, teamStats, boxScore }
}
