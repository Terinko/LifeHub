import type { StakePlayer } from "@lifehub/shared";
import { stakePoints } from "../../lib/points";
import { PositionChip } from "../chrome/PositionChip";
import card from "../chrome/card.module.css";
import styles from "./StakeRow.module.css";

export function StakeRow({ player }: { player: StakePlayer }) {
  const { points, leagues } = stakePoints(player);
  return (
    <div className={styles.row}>
      <PositionChip pos={player.pos} />
      <div className={styles.who}>
        <span className={styles.name}>{player.name}</span>
        <span className={styles.leagues}>{leagues}</span>
      </div>
      {points && (
        <span className={`${card.score} ${styles.points}`}>{points}</span>
      )}
    </div>
  );
}
