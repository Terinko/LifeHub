import { useEffect } from "react";
import styles from "./UndoToast.module.css";

type Props = {
  message: string;
  onUndo: () => void;
  /** Called when the toast times out on its own. */
  onDone: () => void;
  /** How long it stays up, in ms. */
  duration?: number;
};

/** A short-lived bar above the tab bar with one way back. */
export function UndoToast({ message, onUndo, onDone, duration = 6000 }: Props) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, duration);
    return () => window.clearTimeout(timer);
  }, [message, onDone, duration]);

  return (
    <div className={styles.toast} role="status">
      <span className={styles.message}>{message}</span>
      <button type="button" className={styles.undo} onClick={onUndo}>
        Undo
      </button>
    </div>
  );
}
