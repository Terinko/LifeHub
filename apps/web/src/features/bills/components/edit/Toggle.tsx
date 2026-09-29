import { useId, type ReactNode } from "react";
import styles from "./Toggle.module.css";

type Props = {
  title: string;
  hint: string;
  icon: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

/** A labelled on/off switch row. */
export function Toggle({ title, hint, icon, checked, onChange }: Props) {
  const id = useId();
  return (
    <label htmlFor={id} className={styles.row}>
      <span className={styles.icon} aria-hidden>
        {icon}
      </span>
      <span className={styles.text}>
        <span className={styles.title}>{title}</span>
        <span className={styles.hint}>{hint}</span>
      </span>
      <input
        id={id}
        type="checkbox"
        role="switch"
        className={styles.input}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={styles.track} aria-hidden>
        <span className={styles.knob} />
      </span>
    </label>
  );
}
