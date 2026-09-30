import { useState } from "react";
import { X } from "lucide-react";
import {
  PANTRY_LOCATIONS,
  type GroceryItem,
  type PantryItem,
  type SaveKitchenItem,
} from "@lifehub/shared";
import { formFrom, itemFrom, type AmountRow } from "../../lib/itemForm";
import { LOCATION_LABELS } from "../../lib/places";
import form from "../chrome/form.module.css";
import { Segmented } from "../chrome/Segmented";
import { Sheet } from "../chrome/Sheet";

type Props = {
  kind: "GROCERY" | "INVENTORY";
  /** null adds a new item. */
  item: GroceryItem | PantryItem | null;
  onSave: (item: SaveKitchenItem) => void;
  onDelete: (item: GroceryItem | PantryItem) => void;
  onClose: () => void;
};

const LOCATIONS = PANTRY_LOCATIONS.map((value) => ({
  value,
  label: LOCATION_LABELS[value],
}));

/** Add or edit one list or pantry item: name, amounts, and for the pantry where it lives. */
export function ItemSheet({ kind, item, onSave, onDelete, onClose }: Props) {
  const [f, setF] = useState(() => formFrom(item, kind));
  const [error, setError] = useState<string | null>(null);
  const pantry = kind === "INVENTORY";
  const setExtra = (i: number, row: Partial<AmountRow>) =>
    setF({
      ...f,
      extra: f.extra.map((e, j) => (j === i ? { ...e, ...row } : e)),
    });

  const save = () => {
    const result = itemFrom(f, kind, item);
    if (typeof result === "string") return setError(result);
    onSave(result);
  };

  const title = item
    ? item.name
    : pantry
      ? "Add to the pantry"
      : "Add to the list";
  return (
    <Sheet
      title={title}
      subtitle={pantry ? "Pantry" : "Shopping list"}
      onClose={onClose}
    >
      <label className={form.field}>
        <span className={form.fieldLabel}>Name</span>
        <input
          className={form.input}
          value={f.name}
          autoFocus={!item}
          onChange={(e) => setF({ ...f, name: e.target.value })}
        />
      </label>

      <div className={form.pair}>
        <label className={form.field}>
          <span className={form.fieldLabel}>
            {pantry ? "How much" : "Amount"}
          </span>
          <input
            className={form.input}
            inputMode="decimal"
            value={f.amount.quantity}
            onChange={(e) =>
              setF({ ...f, amount: { ...f.amount, quantity: e.target.value } })
            }
          />
        </label>
        <label className={form.field}>
          <span className={form.fieldLabel}>Unit</span>
          <input
            className={form.input}
            placeholder="lb, bag, cup…"
            value={f.amount.unit}
            onChange={(e) =>
              setF({ ...f, amount: { ...f.amount, unit: e.target.value } })
            }
          />
        </label>
        <span />
      </div>

      {f.extra.map((row, i) => (
        <div key={i} className={form.pair}>
          <input
            className={form.input}
            aria-label={`Extra amount ${i + 1}`}
            inputMode="decimal"
            value={row.quantity}
            onChange={(e) => setExtra(i, { quantity: e.target.value })}
          />
          <input
            className={form.input}
            aria-label={`Extra unit ${i + 1}`}
            value={row.unit}
            onChange={(e) => setExtra(i, { unit: e.target.value })}
          />
          <button
            type="button"
            className={form.iconButton}
            aria-label={`Remove extra amount ${i + 1}`}
            onClick={() =>
              setF({ ...f, extra: f.extra.filter((_, j) => j !== i) })
            }
          >
            <X size={18} strokeWidth={2.4} aria-hidden />
          </button>
        </div>
      ))}
      <button
        type="button"
        className={form.secondary}
        onClick={() =>
          setF({ ...f, extra: [...f.extra, { quantity: "", unit: "" }] })
        }
      >
        + Another amount in a different unit
      </button>

      {pantry && (
        <>
          <Segmented
            label="Where it lives"
            value={f.location}
            options={LOCATIONS}
            onChange={(location) => setF({ ...f, location })}
          />
          <label className={form.field}>
            <span className={form.fieldLabel}>Running low at</span>
            <input
              className={form.input}
              inputMode="decimal"
              placeholder="Only when it's out"
              value={f.lowAt}
              onChange={(e) => setF({ ...f, lowAt: e.target.value })}
            />
            <span className={form.help}>
              It shows under Running low at or below this amount.
            </span>
          </label>
        </>
      )}

      {error && (
        <p className={form.error} role="alert">
          {error}
        </p>
      )}
      <button type="button" className={form.primary} onClick={save}>
        {item ? "Save" : pantry ? "Add to the pantry" : "Add to the list"}
      </button>
      {item && (
        <button
          type="button"
          className={form.danger}
          onClick={() => onDelete(item)}
        >
          Delete
        </button>
      )}
    </Sheet>
  );
}
