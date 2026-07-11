import { gameDate, gameTime, periodLabel } from '../format.js'

// One schedule line. `detail` adds a second row with venue / TV — used on the
// Schedule tab where there's room; compact contexts leave it off.
export default function GameRow({ game, detail = false }) {
  return (
    <div className={`game-row ${detail ? 'with-detail' : ''}`}>
      <div className="when">{gameDate(game.date)}</div>
      <div className="matchup">
        <span className="vsat">{game.home ? 'vs' : 'at'}</span>
        {game.opponent.logo && <img src={game.opponent.logo} alt="" loading="lazy" />}
        {game.opponent.name}
        {game.postseason && <span className="postseason-tag">Playoffs</span>}
        {game.cup && <span className="cup-tag">NBA Cup</span>}
      </div>
      {game.final ? (
        <div className={`score ${game.won ? 'won' : 'lost'}`}>
          <span className="result">{game.won ? 'W' : 'L'}</span>
          {game.ourScore}–{game.theirScore}
        </div>
      ) : (
        <div className="time">
          {game.live ? `Live · ${periodLabel(game.period, game.clock)}` : gameTime(game.date)}
        </div>
      )}
      {detail && (game.venue || game.tv) && (
        <div className="detail">{[game.venue, game.tv].filter(Boolean).join(' · ')}</div>
      )}
    </div>
  )
}
