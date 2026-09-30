import { CloudSun, LocateFixed, Search } from "lucide-react";
import glass from "./glass.module.css";
import styles from "./EmptyState.module.css";

type Props = {
  locating: boolean;
  onLocate: () => void;
  onSearch: () => void;
};

/** First run, or every place removed: offer location or search. */
export function EmptyState({ locating, onLocate, onSearch }: Props) {
  return (
    <div className={styles.empty}>
      <CloudSun size={56} strokeWidth={1.4} aria-hidden="true" />
      <h1 className={styles.title}>Add your first place</h1>
      <p className={styles.text}>
        Use your location or search for a US city or zip code.
      </p>
      <button
        className={`${glass.glass} ${styles.cta}`}
        onClick={onLocate}
        disabled={locating}
      >
        <LocateFixed size={18} aria-hidden="true" />
        {locating ? "Finding you…" : "Use my location"}
      </button>
      <button className={`${glass.glass} ${styles.cta}`} onClick={onSearch}>
        <Search size={18} aria-hidden="true" />
        Search places
      </button>
    </div>
  );
}
