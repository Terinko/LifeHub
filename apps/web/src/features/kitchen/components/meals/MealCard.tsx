import { useState } from "react";
import type { MealItem, PantryItem, QuickMeal } from "@lifehub/shared";
import { mealLineState } from "../../lib/pantry";
import card from "../chrome/card.module.css";
import { Stepper } from "./Stepper";
import styles from "./MealCard.module.css";

type Props = {
  meal: QuickMeal;
  pantry: PantryItem[];
  onLog: (meal: QuickMeal, items: MealItem[], reset: () => void) => void;
  onEdit: (meal: QuickMeal) => void;
};

const SUB: Record<string, string> = { untracked: "Not tracked" };

/** A saved meal. Amounts can be nudged for today before tapping Ate it. */
export function MealCard({ meal, pantry, onLog, onEdit }: Props) {
  const [items, setItems] = useState<MealItem[] | null>(null);
  const shown = items ?? meal.items;
  const setQty = (i: number, quantity: number) =>
    setItems(shown.map((it, j) => (j === i ? { ...it, quantity } : it)));

  return (
    <article className={`${card.card} ${styles.meal}`} aria-label={meal.name}>
      <div className={styles.head}>
        <h2 className={styles.title}>{meal.name}</h2>
        <button
          type="button"
          className={styles.edit}
          onClick={() => onEdit(meal)}
        >
          Edit
        </button>
      </div>
      {shown.map((item, i) => {
        const state = mealLineState(item, pantry);
        const sub = state.kind === "untracked" ? SUB.untracked : state.text;
        const warn =
          state.kind === "short" ||
          state.kind === "out" ||
          state.kind === "mismatch";
        return (
          <div key={`${item.name}-${i}`} className={card.row}>
            <div className={card.name}>
              <span className={card.nameText}>{item.name}</span>
              <span className={`${card.sub} ${warn ? styles.warn : ""}`}>
                {sub}
              </span>
            </div>
            <Stepper
              name={item.name}
              quantity={item.quantity}
              unit={item.unit}
              tone={
                item.quantity <= 0
                  ? "muted"
                  : state.kind === "short"
                    ? "short"
                    : undefined
              }
              onChange={(q) => setQty(i, q)}
            />
          </div>
        );
      })}
      <button
        type="button"
        className={styles.ate}
        onClick={() => onLog(meal, shown, () => setItems(null))}
      >
        Ate it
      </button>
      <span className={styles.caption}>
        {items
          ? "Today's amounts. Saved amounts come back after."
          : "Takes these amounts out of the pantry"}
      </span>
    </article>
  );
}
