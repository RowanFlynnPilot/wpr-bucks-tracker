import { useEffect, useState } from 'react'
import { fetchInjuries } from '../api.js'
import Section from './Section.jsx'

// The trainer's room. Loads on the Schedule tab; an empty report is good news, not an error.
export default function InjuryReport() {
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchInjuries().then(setItems).catch((err) => setError(err.message))
  }, [])

  if (error) {
    return (
      <Section kicker="The trainer's room" title="Injury report">
        <p className="section-note">Couldn't load the injury report. ({error})</p>
      </Section>
    )
  }
  if (!items) return null

  return (
    <Section kicker="The trainer's room" title="Injury report">
      <div className="card">
        {items.length === 0 && <p className="section-note">Nobody on the report — full strength.</p>}
        {items.map((it) => (
          <div className="injury-row" key={it.id}>
            {it.headshot
              ? <img src={it.headshot} alt="" loading="lazy" />
              : <div className="injury-gap" aria-hidden="true" />}
            <div className="who">
              <div className="name">
                {it.name} <span className="pos">{it.position}</span>
              </div>
              {it.comment && <div className="comment">{it.comment}</div>}
            </div>
            <span className={`status-chip ${it.status === 'Out' ? 'out' : ''}`}>{it.status}</span>
          </div>
        ))}
        {items.length > 0 && (
          <p className="section-note" style={{ marginTop: 8 }}>Most serious first · via ESPN.</p>
        )}
      </div>
    </Section>
  )
}
