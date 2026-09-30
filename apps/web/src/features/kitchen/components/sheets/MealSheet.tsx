import { useState } from "react";
import { X } from "lucide-react";
import type { PantryItem, QuickMeal, SaveKitchenItem } from "@lifehub/shared";
import { parseIngredients } from "../../api";
import {
  mealFrom,
  rowFrom,
  rowFromPantry,
  rowsFromParsed,
  type MealRow,
} from "../../lib/mealForm";
import form from "../chrome/form.module.css";
import { Sheet } from "../chrome/Sheet";
import { CustomRow } from "./CustomRow";
import { PantryPicker } from "./PantryPicker";
import styles from "./MealSheet.module.css";

type Props = {
  /** null builds a new meal. */
  meal: QuickMeal | null;
  pantry: PantryItem[];
  onSave: (meal: SaveKitchenItem) => void;
  onDelete: (meal: QuickMeal) => void;
  onClose: () => void;
};

type Adding = "pantry" | "custom" | "paste" | null;

/** Build or edit a meal from pantry items, other items, or a pasted list. */
export function MealSheet({ meal, pantry, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState(meal?.name ?? "");
  const [rows, setRows] = useState<MealRow[]>(() =>
    (meal?.items ?? []).map(rowFrom),
  );
  const [adding, setAdding] = useState<Adding>(null);
  const [paste, setPaste] = useState("");
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = (more: MealRow[]) => {
    setRows([...rows, ...more]);
    setAdding(null);
  };
  const setQty = (i: number, quantity: string) =>
    setRows(rows.map((r, j) => (j === i ? { ...r, quantity } : r)));

  const read = async () => {
    setReading(true);
    setError(null);
    try {
      const parsed = await parseIngredients(paste);
      if (!parsed.length)
        setError("Couldn't find any ingredients in that. Try one per line.");
      else {
        add(rowsFromParsed(parsed, pantry));
        setPaste("");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that list.");
    } finally {
      setReading(false);
    }
  };

  const save = () => {
    const result = mealFrom(name, rows, meal?.sk);
    if (typeof result === "string") return setError(result);
    onSave(result);
  };

  return (
    <Sheet
      title={meal ? meal.name : "New meal"}
      subtitle="Meals"
      onClose={onClose}
    >
      <label className={form.field}>
        <span className={form.fieldLabel}>Name</span>
        <input
          className={form.input}
          placeholder="Breakfast"
          value={name}
          autoFocus={!meal}
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      {rows.length > 0 && (
        <ul className={styles.rows} aria-label="Items">
          {rows.map((r, i) => (
            <li key={i} className={styles.row}>
              <span className={styles.name}>
                {r.name}
                {!r.pantrySk && (
                  <span className={styles.badge}>Not tracked</span>
                )}
              </span>
              <input
                className={`${form.input} ${styles.qty}`}
                aria-label={`Amount of ${r.name}`}
                inputMode="decimal"
                value={r.quantity}
                onChange={(e) => setQty(i, e.target.value)}
              />
              <span className={styles.unit}>{r.unit}</span>
              <button
                type="button"
                className={form.iconButton}
                aria-label={`Remove ${r.name}`}
                onClick={() => setRows(rows.filter((_, j) => j !== i))}
              >
                <X size={18} strokeWidth={2.4} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding === "pantry" && (
        <PantryPicker pantry={pantry} onPick={(p) => add([rowFromPantry(p)])} />
      )}
      {adding === "custom" && <CustomRow onAdd={(r) => add([r])} />}
      {adding === "paste" && (
        <div className={form.field}>
          <label className={form.fieldLabel} htmlFor="meal-paste">
            Paste a list
          </label>
          <textarea
            id="meal-paste"
            className={form.input}
            placeholder={"2 eggs\n4 sausage links\n2 slices toast"}
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
          />
          <button
            type="button"
            className={form.secondary}
            disabled={reading || !paste.trim()}
            onClick={() => void read()}
          >
            {reading ? "Reading…" : "Read list"}
          </button>
        </div>
      )}
      {adding === null && (
        <div className={styles.adders}>
          <button
            type="button"
            className={form.secondary}
            onClick={() => setAdding("pantry")}
          >
            + From the pantry
          </button>
          <button
            type="button"
            className={form.secondary}
            onClick={() => setAdding("custom")}
          >
            + Something else
          </button>
          <button
            type="button"
            className={form.secondary}
            onClick={() => setAdding("paste")}
          >
            + Paste a list
          </button>
        </div>
      )}

      {error && (
        <p className={form.error} role="alert">
          {error}
        </p>
      )}
      <button type="button" className={form.primary} onClick={save}>
        {meal ? "Save" : "Save meal"}
      </button>
      {meal && (
        <button
          type="button"
          className={form.danger}
          onClick={() => onDelete(meal)}
        >
          Delete meal
        </button>
      )}
    </Sheet>
  );
}
