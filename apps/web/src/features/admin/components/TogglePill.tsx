import type { MouseEvent } from "react";
import styles from "./TogglePill.module.css";

type Props = {
  label: string;
  icon: string;
  isActive: boolean;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
};

/** An iOS-style on/off pill for one tool permission. */
export function TogglePill({ label, icon, isActive, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={isActive ? `${styles.pill} ${styles.active}` : styles.pill}
    >
      <span>{icon}</span>
      {label}
    </button>
  );
}
