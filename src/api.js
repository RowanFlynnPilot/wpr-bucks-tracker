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

// Regular season (type 2) + postseason (type 3), merged and date-sorted.
// An empty postseason events array is data (missed the playoffs), not an error.
export async function fetchSchedule() {
  const [regular, post] = await Promise.all([
    getJson(`${SITE}/site/v2/sports/basketball/nba/teams/${TEAM_ID}/schedule?season=${SEASON}&seasontype=2`),
    getJson(`${SITE}/site/v2/sports/basketball/nba/teams/${TEAM_ID}/schedule?season=${SEASON}&seasontype=3`),
  ])
  const events = [
    ...(regular.events ?? []).map((e) => normalizeEvent(e, false)),
    ...(post.events ?? []).map((e) => normalizeEvent(e, true)),
  ]
    .filter((e) => !e.dead) // postponed/canceled shells aren't games
    .sort((a, b) => a.date - b.date)
  return { seasonLabel: regular.season.displayName, events }
}

const DEAD_STATUSES = new Set(['STATUS_POSTPONED', 'STATUS_CANCELED'])

// Wisconsin readers get the Bucks-market feed; a national window trumps it.
function pickBroadcast(broadcasts, ourSide) {
  const tv = (broadcasts ?? []).filter((b) => b.type?.shortName === 'TV')
  const national = tv.find((b) => b.market?.type === 'National')
  const ours = tv.find((b) => b.market?.type?.toLowerCase() === ourSide)
  return (national ?? ours)?.media?.shortName ?? null
}

// postseason comes from which endpoint the event was fetched from — the one
// thing we know for certain — not from sniffing event fields.
function normalizeEvent(event, postseason) {
  const comp = event.competitions[0]
  const us = comp.competitors.find((c) => c.team.abbreviation === TEAM_ABBR)
  const them = comp.competitors.find((c) => c.team.abbreviation !== TEAM_ABBR)
  const type = comp.status.type // state: pre | in | post (halftime/period breaks are state "in")
  return {
    id: event.id,
    date: new Date(comp.date),
    final: type.state === 'post' && type.completed === true,
    live: type.state === 'in',
    dead: DEAD_STATUSES.has(type.name),
    period: comp.status.period ?? 0,
    clock: comp.status.displayClock ?? '',
    home: us.homeAway === 'home',
    postseason,
    won: us.winner === true,
    ourScore: us.score?.displayValue ?? null,
    theirScore: them.score?.displayValue ?? null,
    venue: comp.venue?.fullName ?? null,
    tv: pickBroadcast(comp.broadcasts, us.homeAway),
    cup: (comp.notes ?? []).some((n) => (n.headline ?? '').includes('NBA Cup')),
    opponent: {
      abbr: them.team.abbreviation,
      name: them.team.shortDisplayName ?? them.team.displayName,
      logo: them.team.logos?.[0]?.href ?? null,
    },
  }
}

// Both conferences, each sorted by playoff seed. The Season tab renders the East;
// the West rows feed opponent context in the hero and league-wide scoring ranks.
export async function fetchStandings() {
  const data = await getJson(`${SITE}/v2/sports/basketball/nba/standings?season=${SEASON}`)
  const conference = (name, label) => {
    const conf = data.children.find((c) => c.name === name)
    if (!conf) throw new Error(`${name} missing from standings response`)
    const rows = conf.standings.entries.map((entry) => {
      const stats = Object.fromEntries(entry.stats.map((s) => [s.name, s]))
      return {
        teamId: entry.team.id,
        abbr: entry.team.abbreviation,
        name: entry.team.shortDisplayName ?? entry.team.displayName,
        logo: entry.team.logos?.[0]?.href ?? null,
        conference: label,
        wins: stats.wins.value,
        losses: stats.losses.value,
        winPct: stats.winPercent.displayValue,
        winPctValue: stats.winPercent.value,
        gamesBehind: stats.gamesBehind.displayValue,
        streak: stats.streak.displayValue,
        lastTen: stats['Last Ten Games'].displayValue,
        pointDiff: stats.differential.displayValue,
        pointDiffValue: stats.differential.value,
        seed: stats.playoffSeed.value,
        homeRecord: stats.Home.displayValue,
        roadRecord: stats.Road.displayValue,
        divRecord: stats['vs. Div.'].displayValue,
        ppg: stats.avgPointsFor.value,
        ppgDisplay: stats.avgPointsFor.displayValue,
        oppg: stats.avgPointsAgainst.value,
        oppgDisplay: stats.avgPointsAgainst.displayValue,
      }
    })
    rows.sort((a, b) => a.seed - b.seed)
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

// The Leaders tab unmounts on every tab switch, so the result is cached at
// module scope. A rejected load clears the cache so a retry is possible.
let leadersPromise = null

export function fetchLeaders() {
  if (!leadersPromise) {
    leadersPromise = loadLeaders()
    leadersPromise.catch(() => { leadersPromise = null })
  }
  return leadersPromise
}

async function loadLeaders() {
  const data = await getJson(`${CORE}/seasons/${SEASON}/types/2/teams/${TEAM_ID}/leaders?limit=50`)
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

  // Win probability, in Bucks terms (ESPN publishes the home side's).
  const wpRaw = d.winprobability ?? []
  const winProb = wpRaw.map((w) => (usHome ? w.homeWinPercentage : 1 - w.homeWinPercentage))

  // The turning point: the single largest win-probability swing.
  const plays = d.plays ?? []
  const playById = new Map(plays.map((p) => [p.id, p]))
  let turning = null
  for (let i = 1; i < wpRaw.length; i++) {
    const delta = Math.abs(wpRaw[i].homeWinPercentage - wpRaw[i - 1].homeWinPercentage)
    if (turning && delta <= turning.delta) continue
    const play = playById.get(wpRaw[i].playId)
    if (!play) continue
    turning = {
      delta,
      index: i,
      text: play.text,
      period: play.period?.number ?? 0,
      clock: play.clock?.displayValue ?? '',
      ourSwing: (usHome ? 1 : -1) * (wpRaw[i].homeWinPercentage - wpRaw[i - 1].homeWinPercentage),
    }
  }

  // Bucks field-goal attempts with usable coordinates. ESPN marks free throws
  // and dead plays with INT_MIN-ish sentinel coords — those aren't chartable.
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

  // Top performer per stat, per team.
  const leaders = (d.leaders ?? []).map((t) => ({
    abbr: t.team?.abbreviation,
    cats: (t.leaders ?? []).map((c) => {
      const top = c.leaders?.[0]
      return {
        name: c.name,
        label: c.displayName,
        athlete: top?.athlete?.displayName ?? null,
        headshot: top?.athlete?.headshot ?? null,
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

  return { usHome, home: side(home), away: side(away), winProb, turning, shots, scoring, leaders, teamStats }
}
