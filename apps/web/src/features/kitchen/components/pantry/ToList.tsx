import { Check, Plus } from "lucide-react";
import type { PantryItem } from "@lifehub/shared";
import styles from "./PantryTab.module.css";

type Props = {
  item: PantryItem;
  state: "list" | "cart" | null;
  onAdd: (item: PantryItem) => void;
};

/** Adds a running-low item to the list, or says it's already there. */
export function ToList({ item, state, onAdd }: Props) {
  if (state) {
    return (
      <span className={styles.onList}>
        <Check size={14} strokeWidth={3} aria-hidden />
        {state === "cart" ? "In cart" : "On list"}
      </span>
    );
  }
  return (
    <button
      type="button"
      className={styles.toList}
      aria-label={`Add ${item.name} to the list`}
      onClick={() => onAdd(item)}
    >
      <Plus size={14} strokeWidth={2.6} aria-hidden />
      List
    </button>
  );
}
