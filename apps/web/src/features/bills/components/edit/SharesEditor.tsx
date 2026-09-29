import { Plus, X } from "lucide-react";
import { newId, type PersonDraft } from "../../lib/form";
import { formatMoney, parseAmount } from "../../lib/money";
import { sharesOf } from "../../lib/split";
import styles from "./SharesEditor.module.css";

type Props = {
  people: PersonDraft[];
  amount: number | null;
  onChange: (people: PersonDraft[]) => void;
};

/** Who you split with and what each owes; a blank share splits evenly. */
export function SharesEditor({ people, amount, onChange }: Props) {
  const update = (id: string, fields: Partial<PersonDraft>) =>
    onChange(people.map((p) => (p.id === id ? { ...p, ...fields } : p)));

  const preview =
    amount !== null && people.length > 0
      ? sharesOf(
          {
            id: "preview",
            name: "",
            amount,
            isShared: true,
            payers: people.map((p) => ({
              id: p.id,
              name: p.name || "Someone",
              share: p.share.trim() === "" ? null : parseAmount(p.share),
            })),
          },
          amount,
        )
      : null;

  return (
    <div className={styles.wrap}>
      {people.map((p, i) => (
        <div key={p.id} className={styles.person}>
          <input
            className={styles.name}
            aria-label={`Person ${i + 1} name`}
            placeholder="Name"
            value={p.name}
            onChange={(e) => update(p.id, { name: e.target.value })}
          />
          <span className={styles.share}>
            <span aria-hidden>$</span>
            <input
              aria-label={`${p.name || `Person ${i + 1}`}'s share`}
              inputMode="decimal"
              placeholder="even"
              value={p.share}
              onChange={(e) => update(p.id, { share: e.target.value })}
            />
          </span>
          <button
            type="button"
            className={styles.remove}
            aria-label={`Remove ${p.name || `person ${i + 1}`}`}
            onClick={() => onChange(people.filter((x) => x.id !== p.id))}
          >
            <X size={16} strokeWidth={2.4} aria-hidden />
          </button>
        </div>
      ))}
      <button
        type="button"
        className={styles.add}
        onClick={() =>
          onChange([...people, { id: newId(), name: "", share: "" }])
        }
      >
        <Plus size={16} strokeWidth={2.6} aria-hidden />
        Add person
      </button>
      {preview && (
        <span className={styles.preview}>
          You pay {formatMoney(preview.mine)}
          {preview.mine < 0 && ". The shares add up to more than the bill."}
        </span>
      )}
    </div>
  );
}
