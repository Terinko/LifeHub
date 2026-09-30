import { useState } from "react";
import { Search, X } from "lucide-react";
import { usePlacePreviews, usePlaceSearch } from "../../queries";
import type { Place } from "../../types";
import { useDebouncedValue } from "../../useDebouncedValue";
import buttons from "../buttons.module.css";
import glass from "../glass.module.css";
import { LocateRow } from "./LocateRow";
import { PlaceCard } from "./PlaceCard";
import { SearchResults } from "./SearchResults";
import styles from "./PlacesSheet.module.css";

type Props = {
  places: Place[];
  selected: number;
  locating: boolean;
  onSelect: (index: number) => void;
  onAdd: (place: Place) => void;
  onRemove: (id: string) => void;
  onUseLocation: () => void;
  onClose: () => void;
};

/** Full-screen list of saved places, with search to add more. */
export function PlacesSheet({
  places,
  selected,
  locating,
  onSelect,
  onAdd,
  onRemove,
  onUseLocation,
  onClose,
}: Props) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(false);
  const previews = usePlacePreviews(places).data ?? {};
  // Results only show for 2+ characters; the search waits for a pause.
  const showResults = query.trim().length >= 2;
  const search = usePlaceSearch(useDebouncedValue(query.trim(), 300));

  return (
    <div className={styles.sheet}>
      <div className={`${styles.blob} ${styles.blobA}`} />
      <div className={`${styles.blob} ${styles.blobB}`} />
      <div className={`${styles.blob} ${styles.blobC}`} />
      <div className={styles.inner}>
        <div className={styles.head}>
          <h2 className={styles.title}>Places</h2>
          <div className={styles.actions}>
            {places.length > 0 && (
              <button
                className={buttons.link}
                onClick={() => setEditing(!editing)}
              >
                {editing ? "Done editing" : "Edit"}
              </button>
            )}
            <button
              className={buttons.iconBtn}
              onClick={onClose}
              aria-label="Close"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        <label className={`${glass.glass} ${styles.search}`}>
          <Search size={16} aria-hidden="true" />
          <input
            placeholder="Search city or zip code"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        {showResults ? (
          <SearchResults
            results={search.data ?? []}
            searching={search.isFetching}
            onPick={onAdd}
          />
        ) : (
          <>
            <LocateRow locating={locating} onClick={onUseLocation} />
            {places.map((p, i) => (
              <PlaceCard
                key={p.id}
                place={p}
                preview={previews[p.id]}
                current={i === selected}
                editing={editing}
                onSelect={() => onSelect(i)}
                onRemove={() => onRemove(p.id)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
