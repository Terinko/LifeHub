import { Sheet } from "./Sheet";
import card from "./card.module.css";
import styles from "./ConfirmSheet.module.css";

type Props = {
  title: string;
  body: string;
  confirmLabel: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
};

/** An in-app "are you sure?" for anything that can't be undone. */
export function ConfirmSheet({
  title,
  body,
  confirmLabel,
  busy,
  error,
  onConfirm,
  onClose,
}: Props) {
  return (
    <Sheet title={title} onClose={onClose}>
      <p className={styles.body}>{body}</p>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        className={styles.confirm}
        onClick={onConfirm}
        disabled={busy}
      >
        {busy ? "Working…" : confirmLabel}
      </button>
      <button type="button" className={card.quiet} onClick={onClose}>
        Keep it
      </button>
    </Sheet>
  );
}
