import { useState } from "react";
import type { MealRow } from "../../lib/mealForm";
import form from "../chrome/form.module.css";

type Props = { onAdd: (row: MealRow) => void };

/** Something the pantry doesn't track, like hot sauce. It's a reminder and changes nothing. */
export function CustomRow({ onAdd }: Props) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("");
  return (
    <div className={form.field}>
      <div className={form.pair}>
        <label className={form.field}>
          <span className={form.fieldLabel}>Item</span>
          <input
            className={form.input}
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className={form.field}>
          <span className={form.fieldLabel}>Amount and unit</span>
          <span className={form.inline}>
            <input
              className={form.input}
              inputMode="decimal"
              aria-label="Amount"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            <input
              className={form.input}
              aria-label="Unit"
              placeholder="unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          </span>
        </label>
        <span />
      </div>
      <span className={form.help}>
        Not in your pantry, so logging the meal won't change anything for it.
      </span>
      <button
        type="button"
        className={form.secondary}
        disabled={!name.trim()}
        onClick={() =>
          onAdd({
            pantrySk: null,
            name: name.trim(),
            quantity,
            unit: unit.trim(),
          })
        }
      >
        Add to the meal
      </button>
    </div>
  );
}
