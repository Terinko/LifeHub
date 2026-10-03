import type { HockeyGame, HockeyGameSide } from "@lifehub/shared";
import { timeLabel } from "../../lib/dates";
import card from "../chrome/card.module.css";
import styles from "./GameCard.module.css";

type Props = {
  game: HockeyGame;
  /** The followed team, highlighted when it plays. */
  teamId: string;
  onOpen: (game: HockeyGame) => void;
};

function Row({
  side,
  game,
  mine,
}: {
  side: HockeyGameSide;
  game: HockeyGame;
  mine: boolean;
}) {
  const lost = game.state === "post" && side.winner === false;
  return (
    <div
      className={styles.row}
      data-lost={lost || undefined}
      data-mine={mine || undefined}
    >
      <span className={styles.team}>
        {side.rank && <span className={card.rank}>{side.rank}</span>}
        <span className={styles.name}>{side.name}</span>
      </span>
      <span className={`${card.score} ${styles.score}`}>
        {side.score ?? ""}
      </span>
    </div>
  );
}

/** One game: two team rows and its status; opens the box score. */
export function GameCard({ game, teamId, onOpen }: Props) {
  const status =
    game.state === "pre"
      ? [timeLabel(game.start), ...game.tv].join(" · ")
      : game.detail;
  return (
    <button
      type="button"
      className={`${card.card} ${styles.game}`}
      data-state={game.state}
      onClick={() => onOpen(game)}
      aria-label={`${game.away.name} at ${game.home.name}, ${status}`}
    >
      <Row side={game.away} game={game} mine={game.away.id === teamId} />
      <Row side={game.home} game={game} mine={game.home.id === teamId} />
      <span className={styles.status}>{status}</span>
    </button>
  );
}
