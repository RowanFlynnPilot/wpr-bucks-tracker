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

// postseason comes from which endpoint the event was fetched from — the one
// thing we know for certain — not from sniffing event fields.
function normalizeEvent(event, postseason) {
  const comp = event.competitions[0]
  const us = comp.competitors.find((c) => c.team.abbreviation === TEAM_ABBR)
  const them = comp.competitors.find((c) => c.team.abbreviation !== TEAM_ABBR)
  const status = comp.status.type.name // STATUS_FINAL | STATUS_SCHEDULED | STATUS_IN_PROGRESS
  return {
    id: event.id,
    date: new Date(comp.date),
    final: status === 'STATUS_FINAL',
    live: status === 'STATUS_IN_PROGRESS',
    dead: DEAD_STATUSES.has(status),
    home: us.homeAway === 'home',
    postseason,
    won: us.winner === true,
    ourScore: us.score?.displayValue ?? null,
    theirScore: them.score?.displayValue ?? null,
    opponent: {
      abbr: them.team.abbreviation,
      name: them.team.shortDisplayName ?? them.team.displayName,
      logo: them.team.logos?.[0]?.href ?? null,
    },
  }
}

// Eastern Conference table with the stats the Season tab needs.
export async function fetchStandings() {
  const data = await getJson(`${SITE}/v2/sports/basketball/nba/standings?season=${SEASON}`)
  const east = data.children.find((c) => c.name === 'Eastern Conference')
  if (!east) throw new Error('Eastern Conference missing from standings response')
  const rows = east.standings.entries.map((entry) => {
    const stats = Object.fromEntries(entry.stats.map((s) => [s.name, s]))
    return {
      teamId: entry.team.id,
      abbr: entry.team.abbreviation,
      name: entry.team.shortDisplayName ?? entry.team.displayName,
      logo: entry.team.logos?.[0]?.href ?? null,
      wins: stats.wins.value,
      losses: stats.losses.value,
      winPct: stats.winPercent.displayValue,
      gamesBehind: stats.gamesBehind.displayValue,
      streak: stats.streak.displayValue,
      lastTen: stats['Last Ten Games'].displayValue,
      pointDiff: stats.differential.displayValue,
      seed: stats.playoffSeed.value,
    }
  })
  rows.sort((a, b) => a.seed - b.seed)
  if (!rows.some((r) => r.abbr === TEAM_ABBR)) {
    throw new Error(`${TEAM_ABBR} missing from standings response`)
  }
  return rows
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
  const categories = data.categories.filter((c) => LEADER_CATEGORIES.includes(c.name))
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
      refs.set(ref, {
        id: a.id,
        name: a.displayName,
        headshot: a.headshot?.href ?? null,
        position: a.position?.abbreviation ?? '',
        jersey: a.jersey ?? '',
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
