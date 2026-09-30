import type { GroceryItem } from "@lifehub/shared";
import { Package } from "lucide-react";
import { AISLES, guessAisle } from "../../lib/places";
import card from "../chrome/card.module.css";
import { Notice } from "../chrome/Notice";
import { GroceryRow } from "./GroceryRow";
import styles from "./ListTab.module.css";

type Props = {
  groceries: GroceryItem[];
  onToggle: (item: GroceryItem) => void;
  onOpen: (item: GroceryItem) => void;
  onPutAway: (items: GroceryItem[]) => void;
  busy: boolean;
};

const byName = (a: GroceryItem, b: GroceryItem) => a.name.localeCompare(b.name);

/**
 * What to buy, grouped by aisle. Checked-off items gather in the cart until
 * they're put away in the pantry together, so a mistaken tap is one tap to fix.
 */
export function ListTab({
  groceries,
  onToggle,
  onOpen,
  onPutAway,
  busy,
}: Props) {
  const toBuy = groceries.filter((g) => !g.inCart);
  const cart = groceries.filter((g) => g.inCart).sort(byName);
  const rowProps = { onToggle, onOpen };

  if (!groceries.length) {
    return (
      <Notice
        title="Your list is empty"
        body="Add things below, like “2 lb ground beef” or “milk”. Check them off as you shop, then put them away in the pantry."
      />
    );
  }

  return (
    <div className={styles.tab}>
      {AISLES.map((aisle) => {
        const items = toBuy
          .filter((g) => guessAisle(g.name) === aisle)
          .sort(byName);
        if (!items.length) return null;
        return (
          <section key={aisle} className={card.group} aria-label={aisle}>
            <h2 className={card.label}>{aisle}</h2>
            <div className={card.card}>
              {items.map((g) => (
                <GroceryRow key={g.sk} item={g} {...rowProps} />
              ))}
            </div>
          </section>
        );
      })}

      {cart.length > 0 && (
        <section className={card.group} aria-label="In the cart">
          <h2 className={card.label}>
            In the cart <span className={card.count}>{cart.length}</span>
          </h2>
          <div className={`${card.card} ${styles.cart}`}>
            {cart.map((g) => (
              <GroceryRow key={g.sk} item={g} {...rowProps} />
            ))}
            <button
              type="button"
              className={styles.putAway}
              disabled={busy}
              onClick={() => onPutAway(cart)}
            >
              <Package size={18} strokeWidth={2.2} aria-hidden />
              Put {cart.length === 1 ? "it" : `all ${cart.length}`} away in the
              pantry
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
