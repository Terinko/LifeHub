import { formatChips } from "../../lib/money";
import styles from "./ChipTotal.module.css";

type Props = { counted: number; expected: number };

/** How many of the chips bought in have been counted, and what's off. */
export function ChipTotal({ counted, expected }: Props) {
  const diff = expected - counted;
  const share = expected > 0 ? Math.min(100, (counted / expected) * 100) : 0;
  return (
    <div className={styles.total}>
      <div className={styles.line}>
        <span className={styles.count}>
          <strong className={styles.number}>{formatChips(counted)}</strong> of{" "}
          {formatChips(expected)} counted
        </span>
        <span
          className={diff === 0 ? styles.ok : styles.off}
          aria-live="polite"
        >
          {diff === 0
            ? "All counted"
            : diff > 0
              ? `${formatChips(diff)} missing`
              : `${formatChips(-diff)} extra`}
        </span>
      </div>
      <div
        className={styles.track}
        role="progressbar"
        aria-label="Chips counted"
        aria-valuemin={0}
        aria-valuemax={expected}
        aria-valuenow={counted}
      >
        <div
          className={diff < 0 ? styles.over : styles.fill}
          style={{ width: `${share}%` }}
        />
      </div>
    </div>
  );
}
