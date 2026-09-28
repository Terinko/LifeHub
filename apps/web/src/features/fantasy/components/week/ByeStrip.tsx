import type { StakePlayer } from "@lifehub/shared";
import { PositionChip } from "../chrome/PositionChip";
import styles from "./ByeStrip.module.css";

/** Your starters whose NFL team isn't playing this week. */
export function ByeStrip({ players }: { players: StakePlayer[] }) {
  if (players.length === 0) return null;
  return (
    <section className={styles.strip} aria-label="On bye this week">
      <span className={styles.label}>Starting on a bye</span>
      <div className={styles.chips}>
        {players.map((p) => (
          <span
            key={`${p.team}-${p.name}`}
            className={styles.player}
            title={p.leagues.map((l) => l.league).join(", ")}
          >
            <PositionChip pos={p.pos} />
            {p.name}
          </span>
        ))}
      </div>
    </section>
  );
}
