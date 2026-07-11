import { gameDate, gameTime } from '../format.js'

export default function GameRow({ game }) {
  return (
    <div className="game-row">
      <div className="when">{gameDate(game.date)}</div>
      <div className="matchup">
        <span className="vsat">{game.home ? 'vs' : 'at'}</span>
        {game.opponent.logo && <img src={game.opponent.logo} alt="" loading="lazy" />}
        {game.opponent.name}
        {game.postseason && <span className="postseason-tag">Playoffs</span>}
      </div>
      {game.final ? (
        <div className={`score ${game.won ? 'won' : 'lost'}`}>
          <span className="result">{game.won ? 'W' : 'L'}</span>
          {game.ourScore}–{game.theirScore}
        </div>
      ) : (
        <div className="time">{game.live ? 'Live' : gameTime(game.date)}</div>
      )}
    </div>
  )
}
