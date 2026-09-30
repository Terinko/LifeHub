import { Minus, Plus } from "lucide-react";
import { formatAmount } from "../../lib/format";
import { step } from "../../lib/steps";
import styles from "./Stepper.module.css";

type Props = {
  name: string;
  quantity: number;
  unit: string;
  tone?: "short" | "muted";
  onChange: (quantity: number) => void;
};

export function Stepper({ name, quantity, unit, tone, onChange }: Props) {
  return (
    <div className={styles.stepper}>
      <button
        type="button"
        className={styles.button}
        aria-label={`Less ${name}`}
        disabled={quantity <= 0}
        onClick={() => onChange(step(quantity, -1, unit))}
      >
        <Minus size={16} strokeWidth={2.6} aria-hidden />
      </button>
      <span
        className={`${styles.value} ${tone ? styles[tone] : ""}`}
        aria-live="polite"
      >
        {formatAmount(quantity, unit)}
      </span>
      <button
        type="button"
        className={styles.button}
        aria-label={`More ${name}`}
        onClick={() => onChange(step(quantity, 1, unit))}
      >
        <Plus size={16} strokeWidth={2.6} aria-hidden />
      </button>
    </div>
  );
}
