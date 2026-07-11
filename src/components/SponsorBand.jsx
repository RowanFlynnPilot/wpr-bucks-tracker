import { SPONSOR, SPONSOR_INQUIRY } from '../config.js'
import { track } from '../format.js'

// One responsibility: render the paid sponsor, or the "available" house card
// when the slot is unsold. `slot` labels the placement for per-slot click
// reporting in Plausible.
export default function SponsorBand({ slot }) {
  if (!SPONSOR) {
    return (
      <div className="sponsor-band open">
        <div className="sb-kicker">Sponsorship available</div>
        <div className="sb-row">
          <div className="sb-name">Reach Wisconsin sports fans</div>
          <div className="sb-note">{SPONSOR_INQUIRY}</div>
        </div>
      </div>
    )
  }

  const Tag = SPONSOR.url ? 'a' : 'div'
  return (
    <Tag
      className="sponsor-band"
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
        {SPONSOR.tagline && <div className="sb-tagline">{SPONSOR.tagline}</div>}
        {SPONSOR.url && <div className="sb-cta">Visit <span aria-hidden="true">→</span></div>}
      </div>
    </Tag>
  )
}
