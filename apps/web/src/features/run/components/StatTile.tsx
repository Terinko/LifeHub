import styles from "./training.module.css";
import card from "./card.module.css";

type Props = {
  label: string;
  value: string;
  unit?: string;
  note?: string;
  tone?: "good" | "warn";
};

/** One headline number with a line of context. */
export function StatTile({ label, value, unit, note, tone }: Props) {
  return (
    <div className={styles.tile}>
      <span className={card.kicker}>{label}</span>
      <span className={styles.tileValue}>
        {value}
        {unit && <span className={styles.tileUnit}>{unit}</span>}
      </span>
      {note && (
        <span className={`${styles.small} ${tone ? styles[tone] : ""}`}>
          {note}
        </span>
      )}
    </div>
  );
}
