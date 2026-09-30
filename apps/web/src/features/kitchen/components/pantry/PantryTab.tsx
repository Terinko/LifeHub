import { useState } from "react";
import { Search } from "lucide-react";
import {
  PANTRY_LOCATIONS,
  type GroceryItem,
  type PantryItem,
} from "@lifehub/shared";
import { isLow, listState, matches } from "../../lib/pantry";
import { guessLocation, LOCATION_LABELS } from "../../lib/places";
import card from "../chrome/card.module.css";
import { Notice } from "../chrome/Notice";
import { PantryRow } from "./PantryRow";
import { ToList } from "./ToList";
import styles from "./PantryTab.module.css";

type Props = {
  pantry: PantryItem[];
  groceries: GroceryItem[];
  onOpen: (item: PantryItem) => void;
  onAddToList: (item: PantryItem) => void;
  onNew: () => void;
};

const byName = (a: PantryItem, b: PantryItem) => a.name.localeCompare(b.name);
const whereIs = (p: PantryItem) => p.location ?? guessLocation(p.name);

/** What's in the kitchen: running low first, then the fridge, freezer and shelf. */
export function PantryTab({
  pantry,
  groceries,
  onOpen,
  onAddToList,
  onNew,
}: Props) {
  const [query, setQuery] = useState("");
  const shown = query.trim() ? pantry.filter((p) => matches(p, query)) : pantry;
  const low = query.trim() ? [] : pantry.filter(isLow).sort(byName);

  return (
    <div className={styles.tab}>
      <label className={styles.search}>
        <Search size={18} strokeWidth={2} aria-hidden />
        <input
          className={styles.searchInput}
          type="search"
          placeholder="Search the pantry"
          aria-label="Search the pantry"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      {!pantry.length && (
        <Notice
          title="The pantry is empty"
          body="Things you check off on the list land here when you put them away. You can also add what you already have."
          action={{ label: "Add to the pantry", onClick: onNew }}
        />
      )}
      {pantry.length > 0 && !shown.length && (
        <p className={styles.none}>
          Nothing in the pantry matches “{query.trim()}”.
        </p>
      )}

      {low.length > 0 && (
        <section className={card.group} aria-label="Running low">
          <h2 className={card.label}>
            Running low <span className={card.count}>{low.length}</span>
          </h2>
          <div className={card.card}>
            {low.map((p) => (
              <PantryRow
                key={p.sk}
                item={p}
                low
                sub={LOCATION_LABELS[whereIs(p)]}
                onOpen={onOpen}
              >
                <ToList
                  item={p}
                  state={listState(p, groceries)}
                  onAdd={onAddToList}
                />
              </PantryRow>
            ))}
          </div>
        </section>
      )}

      {PANTRY_LOCATIONS.map((loc) => {
        const items = shown.filter((p) => whereIs(p) === loc).sort(byName);
        if (!items.length) return null;
        return (
          <section
            key={loc}
            className={card.group}
            aria-label={LOCATION_LABELS[loc]}
          >
            <h2 className={card.label}>
              {LOCATION_LABELS[loc]}{" "}
              <span className={card.count}>{items.length}</span>
            </h2>
            <div className={card.card}>
              {items.map((p) => (
                <PantryRow key={p.sk} item={p} low={isLow(p)} onOpen={onOpen} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
