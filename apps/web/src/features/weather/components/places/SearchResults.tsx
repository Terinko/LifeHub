import type { Place } from "../../types";
import glass from "../glass.module.css";
import text from "../text.module.css";
import styles from "./SearchResults.module.css";

type Props = {
  results: Place[];
  searching: boolean;
  onPick: (place: Place) => void;
};

/** Search matches; picking one adds (or jumps to) that place. */
export function SearchResults({ results, searching, onPick }: Props) {
  return (
    <div className={`${glass.glass} ${styles.results}`}>
      {searching && (
        <div className={`${text.small} ${styles.status}`}>Searching…</div>
      )}
      {!searching && results.length === 0 && (
        <div className={`${text.small} ${styles.status}`}>No US matches.</div>
      )}
      {results.map((r) => (
        <button key={r.id} className={styles.result} onClick={() => onPick(r)}>
          <span>{r.name}</span>
          <span className={text.small}>{r.region}</span>
        </button>
      ))}
    </div>
  );
}
