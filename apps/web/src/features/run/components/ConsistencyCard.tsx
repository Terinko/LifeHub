import { heatDays } from "../lib/consistency";
import { formatMiles } from "../lib/units";
import card from "./card.module.css";
import styles from "./ConsistencyCard.module.css";

type Props = {
  days: Map<string, number>;
  today: string;
  streak: number;
  weeksAtGoal: number;
  longest: number;
};

const GRID_WEEKS = 26;
const ROW_LABELS = ["M", "", "W", "", "F", "", "S"];

/** Streak numbers over a grid of the last 26 weeks, one square per day. */
export function ConsistencyCard({
  days,
  today,
  streak,
  weeksAtGoal,
  longest,
}: Props) {
  const grid = heatDays(days, today, GRID_WEEKS);
  const stats = [
    { value: streak, label: "day run streak" },
    { value: weeksAtGoal, label: "weeks at goal" },
    { value: longest, label: "longest streak" },
  ];
  return (
    <section className={`${card.card} ${card.narrow}`}>
      <h2 className={card.title}>Consistency</h2>
      <div className={styles.stats}>
        {stats.map((s) => (
          <div key={s.label} className={styles.stat}>
            <span className={`${card.num} ${styles.statValue}`}>{s.value}</span>
            <span className={styles.statLabel}>{s.label}</span>
          </div>
        ))}
      </div>
      <div className={styles.scroll}>
        <div className={styles.gridWrap}>
          <div className={styles.rows} aria-hidden>
            {ROW_LABELS.map((l, i) => (
              <span key={i}>{l}</span>
            ))}
          </div>
          <div
            className={styles.grid}
            role="img"
            aria-label={`Run days over the last ${GRID_WEEKS} weeks`}
          >
            {grid.map((d) => (
              <div
                key={d.date}
                className={styles.day}
                data-level={d.level ?? "future"}
                title={
                  d.level === undefined
                    ? undefined
                    : `${d.date}: ${d.miles ? `${formatMiles(d.miles)} mi` : "rest"}`
                }
              />
            ))}
          </div>
        </div>
      </div>
      <div className={styles.legend} aria-hidden>
        <span>Rest</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} className={styles.day} data-level={l} />
        ))}
        <span>10+ mi</span>
      </div>
    </section>
  );
}
