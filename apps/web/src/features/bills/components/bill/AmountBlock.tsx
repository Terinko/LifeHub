import { useId } from "react";
import { formatMoney, parseAmount } from "../../lib/money";
import styles from "./AmountBlock.module.css";

type Props = {
  label: string;
  text: string;
  onText: (text: string) => void;
  estimate: number | null;
  error: string | null;
  /** Monthly bills say "last month's"; others say "last time's". */
  monthly: boolean;
};

/**
 * The amount field for a bill that changes every time, with a one-tap
 * "same as last time".
 */
export function AmountBlock({
  label,
  text,
  onText,
  estimate,
  error,
  monthly,
}: Props) {
  const id = useId();
  return (
    <div className={styles.block}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={`${styles.field} ${error ? styles.bad : ""}`}>
        <span className={styles.dollar} aria-hidden>
          $
        </span>
        <input
          id={id}
          className={styles.input}
          inputMode="decimal"
          autoComplete="off"
          placeholder={estimate === null ? "0.00" : estimate.toFixed(2)}
          value={text}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => onText(e.target.value)}
        />
      </div>
      {error && (
        <span id={`${id}-error`} className={styles.error} role="alert">
          {error}
        </span>
      )}
      {estimate !== null && parseAmount(text) !== estimate && (
        <button
          type="button"
          className={styles.reuse}
          onClick={() => onText(estimate.toFixed(2))}
        >
          Use {monthly ? "last month's" : "last time's"} {formatMoney(estimate)}
        </button>
      )}
    </div>
  );
}
