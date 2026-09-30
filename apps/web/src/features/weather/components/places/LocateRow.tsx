import { LocateFixed } from "lucide-react";
import glass from "../glass.module.css";
import styles from "./LocateRow.module.css";

type Props = { locating: boolean; onClick: () => void };

/** "Use my location" at the top of the places list. */
export function LocateRow({ locating, onClick }: Props) {
  return (
    <button
      className={`${glass.glass} ${styles.row}`}
      onClick={onClick}
      disabled={locating}
    >
      <span className={styles.left}>
        <LocateFixed size={18} aria-hidden="true" />
        {locating ? "Finding you…" : "Use my location"}
      </span>
    </button>
  );
}
