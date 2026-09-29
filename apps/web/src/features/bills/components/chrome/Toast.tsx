import styles from "./Toast.module.css";

export type ToastMessage = {
  id: number;
  text: string;
  tone?: "info" | "error";
  undo?: () => void;
};

type Props = { toast: ToastMessage | null; onDismiss: () => void };

/** A short note over the tab bar, with Undo when a change can be taken back. */
export function Toast({ toast, onDismiss }: Props) {
  if (!toast) return null;
  return (
    <div
      className={`${styles.toast} ${toast.tone === "error" ? styles.error : ""}`}
      role={toast.tone === "error" ? "alert" : "status"}
    >
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
