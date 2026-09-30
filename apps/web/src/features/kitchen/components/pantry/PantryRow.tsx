import type { ReactNode } from "react";
import type { PantryItem } from "@lifehub/shared";
import { formatAll } from "../../lib/format";
import { isOut } from "../../lib/pantry";
import card from "../chrome/card.module.css";
import styles from "./PantryRow.module.css";

type Props = {
  item: PantryItem;
  sub?: string;
  low?: boolean;
  onOpen: (item: PantryItem) => void;
  /** Extra controls on the right, like Add to list. */
  children?: ReactNode;
};

export function PantryRow({ item, sub, low, onOpen, children }: Props) {
  const amount = isOut(item) ? "Out" : formatAll(item.currentQuantity, item);
  const left = low && !isOut(item) ? `${amount} left` : amount;
  return (
    <div className={card.row}>
      <button
        type="button"
        className={`${card.name} ${styles.open}`}
        onClick={() => onOpen(item)}
      >
        <span className={card.nameText}>{item.name}</span>
        {sub && <span className={card.sub}>{sub}</span>}
      </button>
      <span className={low ? card.lowChip : card.chip}>{left}</span>
      {children}
    </div>
  );
}
