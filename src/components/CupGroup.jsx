import { useEffect, useState } from 'react'
import { CUP_GROUP, CUP_SPONSOR, TEAM_ABBR } from '../config.js'
import { fetchCupGroup } from '../api.js'
import { gameDate, gameTime, track } from '../format.js'
import Section from './Section.jsx'

// The NBA Cup group race — on the Season tab only while group play is live
// (from the season's start through a week after the Bucks' last group game).
// The group is whoever the Bucks' "Group Play" games are against; the table
// is built in api.js (ESPN publishes no Cup standings).
const SHOW_DAYS_AFTER = 7

export default function CupGroup({ schedule }) {
  const groupGames = schedule.events.filter((e) => e.cupRound === 'Group Play')
  const lastGroupGame = groupGames[groupGames.length - 1]
  const visible = groupGames.length > 0 &&
    Date.now() < lastGroupGame.date.getTime() + SHOW_DAYS_AFTER * 86_400_000
  const opponentIds = groupGames.map((g) => g.opponent.id)
  const key = schedule.events.filter((e) => e.final).length // refetch after each Bucks final
  const [group, setGroup] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!visible) return
    let alive = true
    fetchCupGroup(opponentIds, key)
      .then((g) => { if (alive) setGroup(g) })
      .catch((err) => { if (alive) setError(err.message) })
    return () => { alive = false }
    // opponentIds is derived from the schedule; `key` covers result changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, key])

  if (!visible) return null
  if (error) {
    return (
      <Section kicker={`NBA Cup · ${CUP_GROUP}`} title="The Cup race">
        <p className="section-note">Couldn't build the Cup group table. ({error})</p>
      </Section>
    )
  }
  if (!group) return null

  return (
    <Section kicker={`NBA Cup · ${CUP_GROUP}`} title="The Cup race">
      <div className="card">
        <table className="standings cup-table">
          <thead>
            <tr>
              <th className="team-col">Team</th>
              <th>W</th>
              <th>L</th>
              <th title="Point differential in group games, overtime excluded">Diff</th>
            </tr>
          </thead>
          <tbody>
            {group.rows.map((r, i) => (
              // The solid rule under the leader: the group winner's quarterfinal spot.
              <tr key={r.id} className={[r.abbr === TEAM_ABBR ? 'us' : '', i === 0 ? 'playoff-line' : ''].filter(Boolean).join(' ')}>
                <td className="team-col">
                  <span className="seed">{i + 1}</span>
                  {r.logo && <img src={r.logo} alt="" loading="lazy" />}
                  {r.name}
                </td>
                <td>{r.wins}</td>
                <td>{r.losses}</td>
                <td>{r.diff > 0 ? `+${r.diff}` : r.diff}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="vs-central">
          <div className="vs-central-title">Bucks' Cup nights</div>
          <div className="road-chips">
            {groupGames.map((g) => (
              <span className="road-chip" key={g.id}>
                <span className="vsat">{gameDate(g.date)} · {g.home ? 'vs' : 'at'}</span>
                {g.opponent.logo && <img src={g.opponent.logo} alt={g.opponent.name} loading="lazy" />}
                <span className="rec">
                  {g.final
                    ? `${g.won ? 'W' : 'L'} ${g.ourScore}–${g.theirScore}`
                    : g.live ? 'Live' : gameTime(g.date)}
                </span>
              </span>
            ))}
          </div>
        </div>

        <p className="section-note" style={{ margin: '12px 0 0' }}>
          {group.played} of {group.total} group games played. The group winner, plus the best
          second-place team across the East's three groups, reaches the quarterfinals.
          Ties break on head-to-head, then point differential (overtime excluded), then points scored.
        </p>

        {CUP_SPONSOR && <CupCredit sponsor={CUP_SPONSOR} />}
      </div>
    </Section>
  )
}

// A compact "Presented by" line — the Cup race is its own sellable placement.
function CupCredit({ sponsor }) {
  const Tag = sponsor.url ? 'a' : 'span'
  return (
    <div className="cup-credit">
      <Tag
        {...(sponsor.url && {
          href: sponsor.url,
          target: '_blank',
          rel: 'noopener noreferrer sponsored',
          onClick: () => track('Sponsor Click', { sponsor: sponsor.name, slot: 'cup' }),
        })}
      >
        <span className="cc-kicker">The Cup race, presented by</span>
        {sponsor.logo ? <img src={sponsor.logo} alt={sponsor.name} /> : <span className="cc-name">{sponsor.name}</span>}
      </Tag>
    </div>
  )
}
