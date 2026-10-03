import card from "../chrome/card.module.css";
import styles from "./StatTiles.module.css";

export type Tile = {
  value: string;
  label: string;
  accent?: boolean;
  onClick?: () => void;
};

/** A row of four compact stats; tappable ones jump to their tab. */
export function StatTiles({ tiles }: { tiles: Tile[] }) {
  return (
    <div className={styles.tiles}>
      {tiles.map((t) => {
        const body = (
          <>
            <span
              className={`${card.score} ${styles.value}`}
              data-accent={t.accent || undefined}
            >
              {t.value}
            </span>
            <span className={styles.label}>{t.label}</span>
          </>
        );
        return t.onClick ? (
          <button
            key={t.label}
            type="button"
            className={`${card.card} ${styles.tile}`}
            onClick={t.onClick}
          >
            {body}
          </button>
        ) : (
          <div key={t.label} className={`${card.card} ${styles.tile}`}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
