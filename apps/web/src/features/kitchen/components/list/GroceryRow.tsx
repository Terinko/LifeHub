import { Check } from "lucide-react";
import type { GroceryItem } from "@lifehub/shared";
import { formatAll } from "../../lib/format";
import card from "../chrome/card.module.css";
import styles from "./GroceryRow.module.css";

type Props = {
  item: GroceryItem;
  onToggle: (item: GroceryItem) => void;
  onOpen: (item: GroceryItem) => void;
};

/** One thing to buy: the box checks it off, the name opens it for editing. */
export function GroceryRow({ item, onToggle, onOpen }: Props) {
  const done = !!item.inCart;
  return (
    <div className={`${card.row} ${done ? styles.done : ""}`}>
      <button
        type="button"
        className={styles.box}
        aria-pressed={done}
        aria-label={
          done ? `Put ${item.name} back on the list` : `Check off ${item.name}`
        }
        onClick={() => onToggle(item)}
      >
        {done && <Check size={16} strokeWidth={3} aria-hidden />}
      </button>
      <button
        type="button"
        className={`${card.name} ${styles.open}`}
        onClick={() => onOpen(item)}
      >
        <span className={`${card.nameText} ${styles.label}`}>{item.name}</span>
      </button>
      <span className={card.chip}>{formatAll(item.quantity, item)}</span>
    </div>
  );
}
