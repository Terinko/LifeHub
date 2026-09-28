import type { NflGame } from "@lifehub/shared";
import styles from "./GameStatePill.module.css";

export function GameStatePill({ game }: { game: NflGame }) {
  if (game.state === "in") {
    return (
      <span className={`${styles.pill} ${styles.live}`}>
        <span className={styles.dot} aria-hidden />
        LIVE
      </span>
    );
  }
  if (game.state === "post") {
    return <span className={styles.pill}>FINAL</span>;
  }
  return null;
}
