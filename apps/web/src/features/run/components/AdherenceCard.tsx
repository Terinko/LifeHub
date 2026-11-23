import { shortDate } from "../lib/dates";
import type { AdherenceWeek } from "../lib/insights";
import { SLOT_LABEL } from "../lib/sessions";
import card from "./card.module.css";
import styles from "./AdherenceCard.module.css";
import t from "./training.module.css";

/** Each week's rotation sessions in order, skipped ones marked. */
export function AdherenceCard({ weeks }: { weeks: AdherenceWeek[] }) {
  const cells = weeks.flatMap((w) => w.cells);
  const done = cells.filter((c) => c.status === "done").length;
  const share = cells.length ? Math.round((done / cells.length) * 100) : 0;
  return (
    <section className={card.card}>
      <div className={card.head}>
        <h2 className={card.title}>Rotation adherence</h2>
        <span className={`${t.num} ${t.rowTitle}`}>{share}%</span>
      </div>
      <p className={card.note}>
        Each square is the session that was due, in order. Rest days never count
        against you. Doing a different session than the one due marks that one
        skipped.
      </p>
      <div className={styles.weeks}>
        {weeks.map((w) => (
          <div key={w.week} className={styles.week}>
            <span className={`${t.num} ${t.small} ${styles.label}`}>
              {shortDate(w.week)}
            </span>
            <div className={styles.cells}>
              {w.cells.map((c, i) => (
                <span
                  key={i}
                  className={styles.cell}
                  data-kind={c.slot === "run" ? "run" : "lift"}
                  data-status={c.status}
                  title={`${SLOT_LABEL[c.slot]}: ${c.status}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className={t.legend}>
        <span>
          <i className={t.swatch} data-c="lift" />
          Lift
        </span>
        <span>
          <i className={t.swatch} data-c="run" />
          Run
        </span>
        <span>
          <i className={t.swatch} data-c="skip" />
          Skipped
        </span>
      </div>
    </section>
  );
}
