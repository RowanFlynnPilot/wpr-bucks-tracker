import { useCallback, useEffect, useRef, useState } from 'react'
import { HEIGHT_MESSAGE_TYPE, TEAM_LOGO, USE_TEAM_LOGO } from './config.js'
import SponsorBand from './components/SponsorBand.jsx'
import { fetchSchedule, fetchStandings } from './api.js'
import { track } from './format.js'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import SeasonTab from './tabs/SeasonTab.jsx'
import ScheduleTab from './tabs/ScheduleTab.jsx'
import LeadersTab from './tabs/LeadersTab.jsx'
import FilmRoomTab from './tabs/FilmRoomTab.jsx'

// Tab ids are stable — they key the ?tab= deep links and Plausible events; labels can change.
const TABS = [
  { id: 'season', label: 'Season' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'leaders', label: 'Season stats' },
  { id: 'film', label: 'Film room' },
]

// Always-on refresh: 2 minutes at rest, 60s while a game is live — so a page opened before
// tip-off flips to Live on its own, without a reload.
const REFRESH_MS = 120_000
const LIVE_REFRESH_MS = 60_000

// "Updated X min ago" — re-renders every 30s so the relative label stays honest.
function UpdatedStamp({ at }) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])
  if (!at) return null
  const mins = Math.floor((Date.now() - at) / 60_000)
  const label = mins < 1 ? 'just now' : mins === 1 ? '1 min ago' : `${mins} min ago`
  return (
    <div className="updated-stamp">
      <span className="dot" aria-hidden="true" />Updated {label} · refreshes live
    </div>
  )
}

export default function App() {
  // Deep-linkable tabs: ?tab=schedule opens there (so WPR articles can link straight to a
  // section); switching rewrites the param via replaceState — no history spam inside the iframe.
  const [tab, setTab] = useState(() => {
    const t = new URLSearchParams(window.location.search).get('tab')
    return TABS.some((x) => x.id === t) ? t : 'season'
  })
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [updatedAt, setUpdatedAt] = useState(null)
  const hasData = useRef(false)

  // One loader for first paint and every refresh. The FIRST load fails loud (visible error,
  // self-retried on the next interval tick); once data is on screen, a failed refresh keeps
  // the last good numbers (console-logged) — replacing a working scoreboard with an error
  // over one transient blip mid-game is worse than briefly stale numbers.
  const load = useCallback(() => {
    Promise.all([fetchSchedule(), fetchStandings()])
      .then(([schedule, standings]) => {
        hasData.current = true
        setData({ schedule, standings })
        setUpdatedAt(Date.now())
        setError(null)
      })
      .catch((err) => {
        if (!hasData.current) setError(err.message)
        else console.error('Refresh failed:', err)
      })
  }, [])

  const live = data?.schedule.events.some((e) => e.live) ?? false

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const id = setInterval(() => { if (!document.hidden) load() }, live ? LIVE_REFRESH_MS : REFRESH_MS)
    const onVisible = () => { if (!document.hidden) load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible) }
  }, [load, live])

  // Post height to the host page so the WordPress iframe always fits the
  // active tab with no inner scroll. Fires on every layout change.
  useEffect(() => {
    const post = () => {
      window.parent.postMessage(
        { type: HEIGHT_MESSAGE_TYPE, height: document.documentElement.scrollHeight },
        '*'
      )
    }
    const observer = new ResizeObserver(post)
    observer.observe(document.documentElement)
    return () => observer.disconnect()
  }, [])

  const switchTab = (next) => {
    setTab(next)
    const url = new URL(window.location)
    if (next === 'season') url.searchParams.delete('tab')
    else url.searchParams.set('tab', next)
    history.replaceState(null, '', url)
    track('Tab', { tab: next })
  }

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    track('Bookmark')
  }

  return (
    <div>
      <header className="masthead">
        {USE_TEAM_LOGO
          ? <img className="team-logo" src={TEAM_LOGO} alt="Milwaukee Bucks logo" />
          : <div className="logo-swatch" aria-hidden="true" />}
        <div>
          <div className="kicker">Wausau Pilot &amp; Review</div>
          <h1>The Bucks, by the numbers</h1>
          <div className="season-label">
            {data ? `${data.schedule.seasonLabel} season · live from ESPN` : 'Loading…'}
          </div>
        </div>
      </header>

      <UpdatedStamp at={updatedAt} />

      <nav className="tabs" role="tablist" aria-label="Sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={t.id === tab}
            className={t.id === tab ? 'active' : ''}
            onClick={() => switchTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <SponsorBand slot="top" />

      {error && !data && (
        <div className="status-block error">
          Couldn't reach ESPN's stats service — retrying shortly. ({error})
        </div>
      )}
      {!error && !data && <div className="status-block">Warming up the scoreboard…</div>}
      {/* Keyed by tab so a crash in one tab doesn't leave the boundary tripped on another. */}
      <ErrorBoundary key={tab}>
        {data && tab === 'season' && <SeasonTab schedule={data.schedule} standings={data.standings} />}
        {data && tab === 'schedule' && <ScheduleTab schedule={data.schedule} />}
        {data && tab === 'leaders' && <LeadersTab standings={data.standings} />}
        {data && tab === 'film' && <FilmRoomTab schedule={data.schedule} />}
      </ErrorBoundary>

      <footer className="footer">
        <span>
          Data: ESPN · Not affiliated with or endorsed by the Milwaukee Bucks or the NBA.
          {' '}<a href="https://wausaupilotandreview.com/" target="_blank" rel="noopener noreferrer">Wausau Pilot &amp; Review</a>
        </span>
        <button className="copy-link" onClick={copyLink}>Copy link</button>
      </footer>
    </div>
  )
}
