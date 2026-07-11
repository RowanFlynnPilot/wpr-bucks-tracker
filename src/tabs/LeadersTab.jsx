import { useEffect, useState } from 'react'
import { fetchLeaders } from '../api.js'

// Loaded on first visit to the tab — the leaders call fans out into several
// athlete-ref fetches, so it shouldn't tax the initial page load.
export default function LeadersTab() {
  const [categories, setCategories] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchLeaders().then(setCategories).catch((err) => setError(err.message))
  }, [])

  if (error) {
    return <div className="status-block error">Couldn't load team leaders. ({error})</div>
  }
  if (!categories) {
    return <div className="status-block">Pulling the box scores…</div>
  }

  return (
    <>
      <p className="section-note">
        Regular-season team leaders. Players dealt away mid-season keep the numbers they
        put up here.
      </p>
      <div className="leader-grid">
        {categories.map((cat) => (
          <div className="leader-card" key={cat.name}>
            <h3>{cat.label}</h3>
            {cat.leaders.map((l, i) => (
              <div className={`leader-row ${i === 0 ? 'top' : ''}`} key={l.athlete.id}>
                {l.athlete.headshot
                  ? <img src={l.athlete.headshot} alt="" loading="lazy" />
                  : <div style={{ width: 36, height: 36 }} />}
                <div className="who">
                  <div className="name">{l.athlete.name}</div>
                  <div className="meta">
                    {l.athlete.position}{l.athlete.jersey && ` · #${l.athlete.jersey}`}
                  </div>
                </div>
                <div className="stat-value">{l.value}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  )
}
