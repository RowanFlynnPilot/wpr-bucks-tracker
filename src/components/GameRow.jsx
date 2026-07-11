import { gameDate, gameTime, periodLabel } from '../format.js'

// One schedule line. `detail` adds a venue/TV line (used where there's room);
// `recap` adds the generated one-liner under a final. When `onOpen` is set and
// the game is final, the whole row is a link into the film room's box score —
// a real href, so middle-click/new-tab work, with the SPA hop on plain clicks.
export default function GameRow({ game, detail = false, recap = null, onOpen = null }) {
  const clickable = onOpen && game.final

  const inner = (
    <>
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
      {(recap || clickable) && (
        <div className="recap">
          {recap && <span className="txt">{recap}</span>}
          {clickable && <span className="bs-hint">Box score <span aria-hidden="true">→</span></span>}
        </div>
      )}
    </>
  )

  if (clickable) {
    return (
      <a
        className="game-row game-row-link"
        href={`?tab=film&game=${game.id}`}
        onClick={(e) => { e.preventDefault(); onOpen(game.id) }}
        aria-label={`Box score: Bucks ${game.won ? 'beat' : 'lost to'} the ${game.opponent.name} ${game.ourScore}–${game.theirScore}`}
      >
        {inner}
      </a>
    )
  }
  return <div className="game-row">{inner}</div>
}
