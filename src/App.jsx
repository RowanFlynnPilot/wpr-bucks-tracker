import { useEffect, useRef, useState } from 'react'
import {
  HEIGHT_MESSAGE_TYPE, SPONSOR_TEXT, SPONSOR_URL,
  TEAM_LOGO, USE_TEAM_LOGO,
} from './config.js'
import { fetchSchedule, fetchStandings } from './api.js'
import { track } from './format.js'
import SeasonTab from './tabs/SeasonTab.jsx'
import ScheduleTab from './tabs/ScheduleTab.jsx'
import LeadersTab from './tabs/LeadersTab.jsx'

const TABS = ['Season', 'Schedule', 'Leaders']

export default function App() {
  const [tab, setTab] = useState('Season')
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const rootRef = useRef(null)

  useEffect(() => {
    Promise.all([fetchSchedule(), fetchStandings()])
      .then(([schedule, standings]) => setData({ schedule, standings }))
      .catch((err) => setError(err.message))
  }, [])

  // While a game is live, refetch every 60s. Each successful refetch re-runs
  // this effect, so the chain sustains itself and stops at the final buzzer.
  // A failed poll keeps the last good data on screen (console-logged) rather
  // than replacing a working page over a transient blip mid-game; the initial
  // load above still fails loud.
  useEffect(() => {
    if (!data || !data.schedule.events.some((e) => e.live)) return
    const timer = setTimeout(() => {
      Promise.all([fetchSchedule(), fetchStandings()])
        .then(([schedule, standings]) => setData({ schedule, standings }))
        .catch((err) => console.error('Live refresh failed:', err))
    }, 60_000)
    return () => clearTimeout(timer)
  }, [data])

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
    track('Tab', { tab: next })
  }

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    track('Bookmark')
  }

  return (
    <div ref={rootRef}>
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

      <nav className="tabs" aria-label="Sections">
        {TABS.map((t) => (
          <button key={t} className={t === tab ? 'active' : ''} onClick={() => switchTab(t)}>
            {t}
          </button>
        ))}
      </nav>

      {SPONSOR_TEXT && (
        <div className="sponsor">
          {SPONSOR_URL ? <a href={SPONSOR_URL}>{SPONSOR_TEXT}</a> : SPONSOR_TEXT}
        </div>
      )}

      {error && (
        <div className="status-block error">
          Couldn't reach ESPN's stats service. Refresh to try again. ({error})
        </div>
      )}
      {!error && !data && <div className="status-block">Warming up the scoreboard…</div>}
      {data && tab === 'Season' && <SeasonTab schedule={data.schedule} standings={data.standings} />}
      {data && tab === 'Schedule' && <ScheduleTab schedule={data.schedule} />}
      {tab === 'Leaders' && <LeadersTab />}

      <footer className="footer">
        <span>
          Data: ESPN · Not affiliated with or endorsed by the Milwaukee Bucks or the NBA.
        </span>
        <button className="copy-link" onClick={copyLink}>Copy link</button>
      </footer>
    </div>
  )
}
