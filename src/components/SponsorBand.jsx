import { SPONSOR, SPONSOR_INQUIRY } from '../config.js'
import { track } from '../format.js'

// One responsibility: render the paid sponsor, or the "available" house card
// when the slot is unsold. `slot` labels the placement for per-slot click
// reporting in Plausible. `variant="dark"` adapts the OPEN card to the green
// masthead banner; a SOLD lockup is always a white card (sponsor logo art is
// drawn for white — WPR house convention, same as the Brewers/Packers).

const isApple = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || '')

// Apple Maps on Apple hardware, Google Maps everywhere else.
function directionsHref(address) {
  const q = encodeURIComponent(address)
  return isApple ? `https://maps.apple.com/?q=${q}` : `https://www.google.com/maps/search/?api=1&query=${q}`
}

export default function SponsorBand({ slot, variant = 'light' }) {
  if (!SPONSOR) {
    return (
      <div className={`sponsor-band open ${variant === 'dark' ? 'dark' : ''}`}>
        <div className="sb-kicker">Sponsorship available</div>
        <div className="sb-row">
          <div className="sb-name">Reach Wisconsin sports fans</div>
          <div className="sb-note">{SPONSOR_INQUIRY}</div>
        </div>
      </div>
    )
  }

  // The tagline splits at the em-dash: what they offer reads large, where they
  // are sits small beneath it.
  const [offer, place] = (SPONSOR.tagline ?? '').split(' — ')

  // The whole card is the link, so the Directions chip is a role="button" span
  // (nested anchors are invalid) that opens maps without following the card.
  const directions = (e) => {
    e.preventDefault()
    e.stopPropagation()
    track('Sponsor Click', { sponsor: SPONSOR.name, slot, action: 'directions' })
    window.open(directionsHref(SPONSOR.address), '_blank', 'noopener')
  }

  const Tag = SPONSOR.url ? 'a' : 'div'
  return (
    <Tag
      className="sponsor-band sold"
      {...(SPONSOR.url && {
        href: SPONSOR.url,
        target: '_blank',
        rel: 'noopener noreferrer sponsored',
        onClick: () => track('Sponsor Click', { sponsor: SPONSOR.name, slot }),
      })}
    >
      <div className="sb-kicker">Presented by</div>
      <div className="sb-row">
        {SPONSOR.logo
          ? <img src={SPONSOR.logo} alt={SPONSOR.name} />
          : <div className="sb-name">{SPONSOR.name}</div>}
        {offer && (
          <div className="sb-tagline">
            <div className="sb-offer">{offer}</div>
            {place && <div className="sb-place">{place}</div>}
          </div>
        )}
        {SPONSOR.address && (
          <span
            className="sb-directions"
            role="button"
            tabIndex={0}
            onClick={directions}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') directions(e) }}
          >
            Directions
          </span>
        )}
        {SPONSOR.url && <div className="sb-cta">Plan your visit <span aria-hidden="true">→</span></div>}
      </div>
    </Tag>
  )
}
