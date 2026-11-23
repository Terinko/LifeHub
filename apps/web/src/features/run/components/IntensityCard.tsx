import { shortDate } from "../lib/dates";
import type { MixWeek } from "../lib/running";
import card from "./card.module.css";
import styles from "./IntensityCard.module.css";
import t from "./training.module.css";

/** Share of running time easy, moderate and hard, per week. */
export function IntensityCard({ weeks }: { weeks: MixWeek[] }) {
  return (
    <section className={card.card}>
      <div className={card.head}>
        <h2 className={card.title}>Intensity mix</h2>
        <span className={t.small}>80/20 guideline</span>
      </div>
      <p className={card.note}>
        Time in heart-rate zones per week. Too much moderate running is the
        usual reason easy pace stalls.
      </p>
      {weeks.length === 0 ? (
        <p className={t.empty}>Garmin hasn't sent heart-rate zones yet.</p>
      ) : (
        <div className={styles.rows}>
          {weeks.map((w) => (
            <div key={w.week} className={styles.row}>
              <span className={`${t.num} ${t.small} ${styles.week}`}>
                {shortDate(w.week)}
              </span>
              <div className={styles.bar}>
                <div
                  className={t.swatch}
                  data-c="run"
                  style={{ width: `${w.easy}%` }}
                />
                <div
                  className={t.swatch}
                  data-c="mid"
                  style={{ width: `${w.moderate}%` }}
                />
                <div
                  className={t.swatch}
                  data-c="hard"
                  style={{ width: `${w.hard}%` }}
                />
              </div>
              <span className={`${t.num} ${styles.pct}`}>{w.easy}%</span>
            </div>
          ))}
        </div>
      )}
      <div className={t.legend}>
        <span>
          <i className={t.swatch} data-c="run" />
          Easy, zones 1–2
        </span>
        <span>
          <i className={t.swatch} data-c="mid" />
          Moderate, zone 3
        </span>
        <span>
          <i className={t.swatch} data-c="hard" />
          Hard, zones 4–5
        </span>
      </div>
    </section>
  );
}
