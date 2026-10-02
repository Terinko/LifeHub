import { Play } from "lucide-react";
import styles from "./WrappedCard.module.css";

type Props = {
  years: number[];
  onOpen: (year: number) => void;
};

/** The way into Poker Wrapped, one button per year worth recapping. */
export function WrappedCard({ years, onOpen }: Props) {
  const [latest, ...older] = years;
  if (latest === undefined) return null;
  return (
    <section className={styles.card} aria-label="Poker Wrapped">
      <span className={styles.eyebrow}>Poker Wrapped</span>
      <button
        type="button"
        className={styles.play}
        onClick={() => onOpen(latest)}
      >
        <span className={styles.year}>{latest}</span>
        <span className={styles.cta}>
          <Play size={16} strokeWidth={2.6} aria-hidden />
          Play the year
        </span>
      </button>
      {older.length > 0 && (
        <div className={styles.older}>
          {older.map((y) => (
            <button
              key={y}
              type="button"
              className={styles.past}
              onClick={() => onOpen(y)}
            >
              {y}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
