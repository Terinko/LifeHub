import type { Muscle } from "@lifehub/shared";
import { MUSCLES } from "../lib/lifting";
import { SET_RANGE } from "../lib/settings";
import card from "./card.module.css";
import styles from "./SetsCard.module.css";
import t from "./training.module.css";

const SCALE = 25;

/** Working sets per muscle group this week, against the recommended band. */
export function SetsCard({ sets }: { sets: Map<Muscle, number> }) {
  const pct = (n: number) => `${(Math.min(n, SCALE) / SCALE) * 100}%`;
  return (
    <section className={card.card}>
      <div className={card.head}>
        <h2 className={card.title}>Working sets this week</h2>
        <span className={t.small}>
          guide: {SET_RANGE.low}–{SET_RANGE.high} per muscle
        </span>
      </div>
      <div className={styles.rows}>
        {MUSCLES.map(({ key, label }) => {
          const n = sets.get(key) ?? 0;
          return (
            <div key={key} className={styles.row}>
              <span className={styles.label}>{label}</span>
              <div className={styles.track}>
                <div
                  className={styles.band}
                  style={{
                    left: pct(SET_RANGE.low),
                    width: `calc(${pct(SET_RANGE.high)} - ${pct(SET_RANGE.low)})`,
                  }}
                />
                <div
                  className={styles.fill}
                  data-level={
                    n >= SET_RANGE.low ? "in" : n > 0 ? "some" : "none"
                  }
                  style={{ width: pct(n) }}
                />
              </div>
              <span className={`${t.num} ${styles.count}`}>{n}</span>
            </div>
          );
        })}
      </div>
      <p className={card.note}>
        The shaded band is a common range for building muscle. Every logged
        working set counts.
      </p>
    </section>
  );
}
