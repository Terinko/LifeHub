import type { RunRecord } from "../lib/records";
import { shortDate } from "../lib/dates";
import { formatDuration } from "../lib/units";
import card from "./card.module.css";
import styles from "./RecordsCard.module.css";

/** Fastest time at each race distance. */
export function RecordsCard({ records }: { records: RunRecord[] }) {
  return (
    <section className={`${card.card} ${card.narrow}`}>
      <div>
        <h2 className={card.title}>Personal records</h2>
        <p className={card.note}>Fastest whole run at each distance</p>
      </div>
      <div className={styles.list}>
        {records.map((r) => (
          <div key={r.label} className={styles.row}>
            <span className={styles.distance}>{r.label}</span>
            <span className={`${card.num} ${styles.time}`}>
              {r.seconds === undefined ? "—" : formatDuration(r.seconds)}
            </span>
            <span className={styles.date}>
              {r.date ? shortDate(r.date) : ""}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
