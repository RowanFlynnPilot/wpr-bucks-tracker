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
    opponent: {
      abbr: them.team.abbreviation,
      name: them.team.shortDisplayName ?? them.team.displayName,
      logo: them.team.logos?.[0]?.href ?? null,
    },
  }
}

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
        lastTen: played === 0 ? '0-0' : stats['Last Ten Games'].displayValue,
        pointDiff: stats.differential.displayValue,
        pointDiffValue: stats.differential.value,
        seed: stats.playoffSeed.value > 0 ? stats.playoffSeed.value : null,
        homeRecord: stats.Home.displayValue,
        roadRecord: stats.Road.displayValue,
        divRecord: stats['vs. Div.'].displayValue,
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

// ---------- Injuries ----------

let injuriesPromise = null

export function fetchInjuries() {
  if (!injuriesPromise) {
    injuriesPromise = loadInjuries()
    injuriesPromise.catch(() => { injuriesPromise = null })
  }
  return injuriesPromise
}

// An empty report is data (everyone's healthy), not an error.
async function loadInjuries() {
  const list = await getJson(`${CORE}/teams/${TEAM_ID}/injuries?limit=50`)
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
  // time axis (quarters are 12 minutes, OTs are 5). The clock arrives as
  // "M:SS" above a minute and "SS.d" under one.
  const plays = d.plays ?? []
  const periodSec = (p) => (p <= 4 ? 720 : 300)
  const elapsed = (periodNum, clock) => {
    let remaining
    if (!clock) remaining = 0
    else if (clock.includes(':')) {
      const [m, s] = clock.split(':')
      remaining = Number(m) * 60 + Number(s)
    } else remaining = parseFloat(clock)
    if (!Number.isFinite(remaining)) remaining = 0
    let base = 0
    for (let q = 1; q < periodNum; q++) base += periodSec(q)
    return base + (periodSec(periodNum) - remaining)
  }
  const maxPeriod = Math.max(4, ...plays.map((p) => p.period?.number ?? 0))
  const totalSec = Array.from({ length: maxPeriod }, (_, i) => periodSec(i + 1)).reduce((a, b) => a + b, 0)
  const flow = plays
    .filter((p) => p.scoringPlay && p.scoreValue > 0)
    .map((p) => ({
      t: elapsed(p.period?.number ?? 1, p.clock?.displayValue ?? ''),
      margin: usHome ? p.homeScore - p.awayScore : p.awayScore - p.homeScore,
    }))

  // Bucks field-goal attempts with usable coordinates. ESPN marks free throws
  // and dead plays with INT_MIN-ish sentinel coords — those aren't chartable.
  // The shooter id comes from the play's participants and matches the box score.
  const shots = plays
    .filter((p) =>
      p.shootingPlay && p.team?.id === TEAM_ID && p.coordinate &&
      p.coordinate.x >= 0 && p.coordinate.x <= 50 &&
      p.coordinate.y >= 0 && p.coordinate.y <= 45 &&
      !/free throw/i.test(p.text ?? '')
    )
    .map((p) => ({
      x: p.coordinate.x,
      y: p.coordinate.y,
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
