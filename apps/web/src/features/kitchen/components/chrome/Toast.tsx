import { Check } from "lucide-react";
import styles from "./Toast.module.css";

export type ToastMessage = {
  id: number;
  text: string;
  tone?: "info" | "error";
  undo?: () => void;
};

type Props = {
  toast: ToastMessage | null;
  onDismiss: () => void;
  /** Sits higher when the add bar is showing. */
  raised?: boolean;
};

/** A short note over the tab bar, with Undo when a change can be taken back. */
export function Toast({ toast, onDismiss, raised }: Props) {
  if (!toast) return null;
  const error = toast.tone === "error";
  return (
    <div
      key={toast.id}
      className={[styles.toast, error && styles.error, raised && styles.raised]
        .filter(Boolean)
        .join(" ")}
      role={error ? "alert" : "status"}
    >
      {!error && <Check size={18} strokeWidth={3} aria-hidden />}
      <span className={styles.text}>{toast.text}</span>
      {toast.undo && (
        <button
          type="button"
          className={styles.undo}
          onClick={() => {
            toast.undo?.();
            onDismiss();
          }}
        >
          Undo
        </button>
      )}
    </div>
  );
}
