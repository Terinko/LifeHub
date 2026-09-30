import { Lock } from "lucide-react";
import styles from "./EmptyState.module.css";

/** Shown instead of the grid to someone with no tools yet. */
export function EmptyState() {
  return (
    <div className={styles.empty}>
      <div className={styles.icon}>
        <Lock size={32} strokeWidth={1.5} />
      </div>
      <p>You don't have access to any tools yet</p>
      <small>Ask the admin to grant you permissions.</small>
    </div>
  );
}
