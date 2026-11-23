import { shortDate } from "../lib/dates";
import type { TimeWeek } from "../lib/insights";
import card from "./card.module.css";
import styles from "./TimeSplitCard.module.css";
import t from "./training.module.css";

/** Hours running and lifting each week. */
export function TimeSplitCard({ weeks }: { weeks: TimeWeek[] }) {
  const max = Math.max(1, ...weeks.map((w) => w.runS + w.liftS));
  const run = weeks.reduce((a, w) => a + w.runS, 0);
  const lift = weeks.reduce((a, w) => a + w.liftS, 0);
  const runPct = run + lift ? Math.round((run / (run + lift)) * 100) : 0;
  const first = weeks[0];
  return (
    <section className={card.card}>
      <div className={card.head}>
        <h2 className={card.title}>Where your time goes</h2>
        <span className={t.small}>hours per week</span>
      </div>
      <div className={styles.bars}>
        {weeks.map((w) => (
          <div
            key={w.week}
            className={styles.col}
            title={`Week of ${shortDate(w.week)}: ${(w.runS / 3600).toFixed(1)} h running, ${(w.liftS / 3600).toFixed(1)} h lifting`}
          >
            <div
              className={styles.lift}
              style={{ height: `${(w.liftS / max) * 100}%` }}
            />
            <div
              className={styles.run}
              style={{ height: `${(w.runS / max) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <div className={`${t.legend} ${t.num}`}>
        <span>{first ? shortDate(first.week) : ""}</span>
        <span style={{ marginLeft: "auto" }}>This week</span>
      </div>
      <div className={t.legend}>
        <span>
          <i className={t.swatch} data-c="run" />
          Running {runPct}%
        </span>
        <span>
          <i className={t.swatch} data-c="lift" />
          Lifting {100 - runPct}%
        </span>
      </div>
    </section>
  );
}
