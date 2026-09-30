import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { parseQuickAdd, type QuickAdd } from "../../lib/quickAdd";
import styles from "./AddBar.module.css";

type Props = { onAdd: (item: QuickAdd) => void };

/** Type "2 lb ground beef" and press enter. */
export function AddBar({ onAdd }: Props) {
  const [text, setText] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const item = parseQuickAdd(text);
    if (!item) return;
    onAdd(item);
    setText("");
  };
  return (
    <form className={styles.bar} onSubmit={submit}>
      <label htmlFor="kitchen-add" className={styles.hidden}>
        Add to the list
      </label>
      <input
        id="kitchen-add"
        className={styles.input}
        placeholder="Add “2 lb ground beef”"
        autoComplete="off"
        enterKeyHint="done"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        type="submit"
        className={styles.add}
        aria-label="Add to the list"
        disabled={!text.trim()}
      >
        <Plus size={22} strokeWidth={2.5} aria-hidden />
      </button>
    </form>
  );
}
