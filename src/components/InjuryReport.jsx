import { useEffect, useState } from 'react'
import { fetchInjuries } from '../api.js'
import { ctDaysFromToday, gameDate, todayWord } from '../format.js'
import Section from './Section.jsx'

// The trainer's room: the Bucks' report, then the next opponent's — who's in
// and out across the floor is half of a game-day preview. Loads on the
// Schedule tab; an empty report is good news, not an error.
export default function InjuryReport({ nextGame }) {
  const opponent = nextGame?.opponent ?? null
  const [ours, setOurs] = useState(null)
  const [theirs, setTheirs] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchInjuries().then(setOurs).catch((err) => setError(err.message))
  }, [])
  useEffect(() => {
    if (!opponent) return
    let alive = true
    setTheirs(null)
    fetchInjuries(opponent.id)
      .then((items) => { if (alive) setTheirs(items) })
      .catch((err) => { if (alive) setError(err.message) })
    return () => { alive = false }
  }, [opponent?.id])

  if (error) {
    return (
      <Section kicker="The trainer's room" title="Injury report">
        <p className="section-note">Couldn't load the injury report. ({error})</p>
      </Section>
    )
  }
  if (!ours) return null

  const when = nextGame && (ctDaysFromToday(nextGame.date) === 0 ? todayWord(nextGame.date).toLowerCase() : gameDate(nextGame.date))

  return (
    <Section kicker="The trainer's room" title="Injury report">
      <div className="card">
        <h3 className="group-label">Bucks</h3>
        <Report items={ours} healthy="Nobody on the report — full strength." />
        {opponent && theirs && (
          <>
            <h3 className="group-label injury-opp">The {opponent.name}, next up ({when})</h3>
            <Report items={theirs} healthy={`The ${opponent.name} list nobody.`} />
          </>
        )}
        <p className="section-note" style={{ marginTop: 8 }}>Most serious first · via ESPN.</p>
      </div>
    </Section>
  )
}

function Report({ items, healthy }) {
  if (items.length === 0) return <p className="section-note">{healthy}</p>
  return items.map((it) => (
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
  ))
}
