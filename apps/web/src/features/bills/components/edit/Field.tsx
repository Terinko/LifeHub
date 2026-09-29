import { useId, type InputHTMLAttributes } from "react";
import card from "../chrome/card.module.css";
import styles from "./Field.module.css";

type Props = {
  label: string;
  hint?: string;
  prefix?: string;
  mono?: boolean;
  value: string;
  onValue: (value: string) => void;
} & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "prefix"
>;

/** A labelled text input in the Bills style. */
export function Field({
  label,
  hint,
  prefix,
  mono,
  value,
  onValue,
  ...input
}: Props) {
  const id = useId();
  return (
    <div className={styles.wrap}>
      <label htmlFor={id} className={card.label}>
        {label}
      </label>
      <div className={`${card.field} ${styles.box}`}>
        {prefix && (
          <span className={styles.prefix} aria-hidden>
            {prefix}
          </span>
        )}
        <input
          id={id}
          className={`${styles.input} ${mono ? styles.mono : ""}`}
          value={value}
          onChange={(e) => onValue(e.target.value)}
          aria-describedby={hint ? `${id}-hint` : undefined}
          {...input}
        />
      </div>
      {hint && (
        <span id={`${id}-hint`} className={card.hint}>
          {hint}
        </span>
      )}
    </div>
  );
}
