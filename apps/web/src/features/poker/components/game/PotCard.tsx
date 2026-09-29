import { Ellipsis } from "lucide-react";
import { formatChips, formatShortMoney } from "../../lib/money";
import { gameAge, isStale, potOf } from "../../lib/game";
import type { Game } from "../../types";
import card from "../chrome/card.module.css";
import styles from "./PotCard.module.css";

type Props = { game: Game; onMenu: () => void };

/** The top of a running game: the pot, the stakes and how long it's run. */
export function PotCard({ game, onMenu }: Props) {
  const pot = potOf(game);
  const stale = isStale(game.date);
  return (
    <section className={`${card.card} ${styles.pot}`} aria-label="Pot">
      <div className={styles.main}>
        <span className={card.eyebrow}>Pot</span>
        <span className={`${card.money} ${styles.amount}`}>
          {formatShortMoney(pot.dollars)}
        </span>
      </div>
      <div className={styles.facts}>
        <span>
          <strong>{pot.buyIns}</strong> buy-ins at{" "}
          {formatShortMoney(game.buyInAmount)}
        </span>
        <span>
          <strong>{formatChips(pot.chips)}</strong> chips in play
        </span>
        <span className={stale ? styles.stale : styles.age}>
          {stale
            ? `Started ${gameAge(game.date)} ago. Still going?`
            : `Started ${gameAge(game.date)} ago`}
        </span>
      </div>
      <button
        type="button"
        className={`${card.round} ${styles.menu}`}
        onClick={onMenu}
        aria-label="Cancel this game"
      >
        <Ellipsis size={20} aria-hidden />
      </button>
    </section>
  );
}
