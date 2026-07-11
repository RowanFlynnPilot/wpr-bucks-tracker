import { useState } from 'react'
import { SPONSOR_INQUIRY, WATCH_VENUES } from '../config.js'
import { gameDate, gameTime, track } from '../format.js'
import Section from './Section.jsx'

// The game-night guide — bar/restaurant listings sold per listing (config
// WATCH_VENUES): photos, amenity chips, game-day specials, and a tracked link
// per venue. The intro line ties the section to the next actual tip-off (the
// schedule the tab already has). With no venues sold there is no section —
// except in ?demo, where sales previews fill it with placeholders (config.js).

// One photo that quietly removes itself if the venue's URL is bad.
function Photo({ src, alt }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return null
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />
}

function VenueCard({ venue }) {
  const [heroFailed, setHeroFailed] = useState(false)
  const hero = venue.images?.[0]
  const thumbs = (venue.images ?? []).slice(1, 4)
  return (
    <div className="venue-card">
      {/* Hero photo (venue-provided) or a quiet placeholder band */}
      <div className="venue-photo">
        {hero && !heroFailed
          ? <img src={hero} alt={venue.name} loading="lazy" onError={() => setHeroFailed(true)} />
          : <span>Venue photo</span>}
      </div>
      {thumbs.length > 0 && (
        <div className="venue-thumbs">
          {thumbs.map((t, i) => <div key={i}><Photo src={t} alt="" /></div>)}
        </div>
      )}

      <div className="venue-body">
        <div className="v-kicker">Game-day partner</div>
        <div className="v-name">{venue.name}</div>
        {venue.tagline && <div className="v-tagline">{venue.tagline}</div>}
        {(venue.address || venue.phone) && (
          <div className="v-meta">{[venue.address, venue.phone].filter(Boolean).join(' · ')}</div>
        )}

        {venue.features?.length > 0 && (
          <div className="v-chips">
            {venue.features.map((f) => <span className="v-chip" key={f}>{f}</span>)}
          </div>
        )}

        {venue.specials?.length > 0 && (
          <div className="v-specials">
            <div className="v-specials-label">Game-day specials</div>
            <ul>
              {venue.specials.map((s) => <li key={s}>{s}</li>)}
            </ul>
          </div>
        )}

        {venue.url && (
          <a
            className="v-link"
            href={venue.url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={() => track('Sponsor Click', { sponsor: venue.name, slot: 'where-to-watch' })}
          >
            Menu &amp; info <span aria-hidden="true">→</span>
          </a>
        )}
      </div>
    </div>
  )
}

export default function WhereToWatch({ schedule }) {
  if (WATCH_VENUES.length === 0) return null

  // Tie the guide to the next real tip-off — live game first, else next up.
  // Between the finale and the new schedule there's no next game; the line
  // stays evergreen ("tips off this fall") until ESPN publishes October dates.
  const featured = schedule.events.find((e) => e.live) ?? schedule.events.find((e) => !e.final)
  const intro = featured
    ? `Bucks ${featured.home ? 'vs' : 'at'} the ${featured.opponent.name}, ${
        featured.live
          ? 'live right now'
          : `${gameDate(featured.date)} at ${gameTime(featured.date)} CT`
      }${featured.tv ? ` on ${featured.tv}` : ''} — here's where Wausau will be watching.`
    : 'Every Bucks game night, these are the rooms with the sound on — the new season tips off this fall.'

  return (
    <Section kicker="Where to watch" title="Catch the games this week">
      <p className="watch-intro">{intro}</p>
      <div className="venue-grid">
        {WATCH_VENUES.map((v) => <VenueCard key={v.name} venue={v} />)}
        {/* Open inventory: the guide sells by the listing, so the next slot pitches itself. */}
        <div className="listing-open">
          <div className="v-kicker">Listing available</div>
          <div className="lo-pitch">
            Your bar or restaurant, in front of every game-night reader — photos, specials,
            and what makes your room the place to watch.
          </div>
          <div className="v-meta">{SPONSOR_INQUIRY}</div>
        </div>
      </div>
      <p className="section-note" style={{ marginTop: 12 }}>Venue listings are paid placements.</p>
    </Section>
  )
}
