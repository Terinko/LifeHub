import type { ReactNode } from "react";
import styles from "./RoundButton.module.css";

type Props = { label: string; onClick: () => void; children: ReactNode };

/** The cobalt 44px button in the header and add bar. */
export function RoundButton({ label, onClick, children }: Props) {
  return (
    <button
      type="button"
      className={styles.button}
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
