import { useState } from "react";
import { PencilLine } from "lucide-react";
import { useSetNotes } from "../../queries";
import card from "../chrome/card.module.css";
import styles from "./NoteEditor.module.css";

const LIMIT = 280;

type Props = { sk: string; notes?: string };

/** A game's note: shown as a quote, with a small way to add or change it. */
export function NoteEditor({ sk, notes = "" }: Props) {
  const [saved, setSaved] = useState(notes);
  const [draft, setDraft] = useState<string | null>(null);
  const save = useSetNotes();
  const inputId = `note-${sk}`;

  if (draft === null) {
    return (
      <div className={styles.note}>
        {saved && <p className={styles.text}>“{saved}”</p>}
        <button
          type="button"
          className={styles.edit}
          onClick={() => {
            save.reset();
            setDraft(saved);
          }}
        >
          <PencilLine size={14} strokeWidth={2.4} aria-hidden />
          {saved ? "Edit note" : "Add a note about the night"}
        </button>
      </div>
    );
  }

  const submit = () =>
    save.mutate(
      { sk, notes: draft },
      {
        onSuccess: (res) => {
          setSaved(res.notes);
          setDraft(null);
        },
      },
    );

  return (
    <div className={styles.note}>
      <label htmlFor={inputId} className={card.label}>
        Note about the night
      </label>
      <textarea
        id={inputId}
        className={`${card.field} ${styles.input}`}
        value={draft}
        maxLength={LIMIT}
        rows={3}
        placeholder="Jordan rivered a flush for the big pot…"
        onChange={(e) => setDraft(e.target.value)}
      />
      <div className={styles.actions}>
        <span className={card.hint}>
          {draft.length}/{LIMIT}
        </span>
        <button
          type="button"
          className={styles.cancel}
          onClick={() => setDraft(null)}
        >
          Cancel
        </button>
        <button
          type="button"
          className={styles.save}
          disabled={save.isPending}
          onClick={submit}
        >
          {save.isPending ? "Saving…" : "Save note"}
        </button>
      </div>
      {save.error && (
        <p className={styles.error} role="alert">
          {save.error.message}
        </p>
      )}
    </div>
  );
}
