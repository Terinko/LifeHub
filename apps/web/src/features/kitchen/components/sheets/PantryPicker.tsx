import { useState } from "react";
import type { PantryItem } from "@lifehub/shared";
import { formatAll } from "../../lib/format";
import { matches } from "../../lib/pantry";
import card from "../chrome/card.module.css";
import form from "../chrome/form.module.css";
import styles from "./PantryPicker.module.css";

type Props = { pantry: PantryItem[]; onPick: (item: PantryItem) => void };

/** A searchable list of pantry items to add to a meal. */
export function PantryPicker({ pantry, onPick }: Props) {
  const [query, setQuery] = useState("");
  const shown = pantry
    .filter((p) => !query.trim() || matches(p, query))
    .sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className={styles.picker}>
      <input
        className={form.input}
        type="search"
        placeholder="Search the pantry"
        aria-label="Search the pantry"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className={`${card.card} ${styles.list}`}>
        {shown.length === 0 && (
          <p className={styles.none}>No pantry items match.</p>
        )}
        {shown.map((p) => (
          <button
            key={p.sk}
            type="button"
            className={`${card.row} ${styles.pick}`}
            onClick={() => onPick(p)}
          >
            <span className={card.nameText}>{p.name}</span>
            <span className={card.chip}>{formatAll(p.currentQuantity, p)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
