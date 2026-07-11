import { TEAM_ABBR, VENUE } from '../config.js'
import Section from '../components/Section.jsx'
import GameHero from '../components/GameHero.jsx'
import Storylines from '../components/Storylines.jsx'
import RaceChart from '../components/RaceChart.jsx'
import StandingsTable from '../components/StandingsTable.jsx'
import VsCentral from '../components/VsCentral.jsx'
import PlayInOdds from '../components/PlayInOdds.jsx'
import RoadAhead from '../components/RoadAhead.jsx'
import SponsorBand from '../components/SponsorBand.jsx'

export default function SeasonTab({ schedule, standings, onOpenGame }) {
  // Presence guaranteed by fetchStandings — it throws before render otherwise.
  const us = standings.east.find((row) => row.abbr === TEAM_ABBR)

  const played = schedule.events.filter((e) => e.final)

  return (
    <>
      <GameHero schedule={schedule} standings={standings} onOpenGame={onOpenGame} />

      <Storylines schedule={schedule} standings={standings} />

      <Section kicker="Season pulse" title="Where things stand">
        <div className="pulse">
          <Stat value={`${us.wins}–${us.losses}`} label="Record" />
          <Stat value={`#${us.seed}`} label="East seed" />
          <Stat value={us.streak} label="Streak" />
          <Stat value={us.lastTen} label="Last 10" />
          <Stat value={us.pointDiff} label="Point diff / game" />
          <Stat value={us.homeRecord} label={`At ${VENUE.split(' ')[0]}`} />
          <Stat value={us.roadRecord} label="On the road" />
        </div>
      </Section>

      <Section
        kicker="The race"
        title="The season, game by game"
        note="Games above or below .500 after each regular-season game."
      >
        <RaceChart games={played.filter((g) => !g.postseason)} />
      </Section>

      <SponsorBand slot="season" />

      <PlayInOdds standings={standings} />

      <Section kicker="Eastern Conference" title="The standings">
        <div className="card">
          <StandingsTable rows={standings.east} />
          <VsCentral schedule={schedule} />
        </div>
      </Section>

      <RoadAhead schedule={schedule} standings={standings} />
    </>
  )
}

function Stat({ value, label }) {
  return (
    <div className="stat">
      <div className="value">{value}</div>
      <div className="label">{label}</div>
    </div>
  )
}
