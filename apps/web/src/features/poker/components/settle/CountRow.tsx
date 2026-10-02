import { formatChips, parseChips } from "../../lib/money";
import type { Seat } from "../../types";
import { Money } from "../chrome/Money";
import styles from "./CountRow.module.css";

type Props = {
  id: string;
  seat: Seat;
  value: number | null;
  /** What this count is worth against what they paid in. */
  net: number;
  onChange: (chips: number | null) => void;
  onDone: () => void;
};

/** One player's chip count, with their result updating as you type. */
export function CountRow({ id, seat, value, net, onChange, onDone }: Props) {
  const inputId = `chips-${id}`;
  const plural = seat.buyIns === 1 ? "buy-in" : "buy-ins";
  return (
    <div className={styles.row}>
      <div className={styles.who}>
        <label htmlFor={inputId} className={styles.name}>
          {seat.name}
        </label>
        <span className={styles.paid}>
          {seat.buyIns} {plural}
          {seat.cashedOutAt ? " · cashed out" : ""}
        </span>
      </div>
      <input
        id={inputId}
        className={styles.input}
        inputMode="numeric"
        autoComplete="off"
        placeholder="Chips"
        value={value === null ? "" : formatChips(value)}
        onChange={(e) => onChange(parseChips(e.target.value))}
        onBlur={onDone}
      />
      <span className={styles.net}>
        {value === null ? (
          <span className={styles.pending}>Not yet</span>
        ) : (
          <Money value={net} size={22} />
        )}
      </span>
    </div>
  );
}
