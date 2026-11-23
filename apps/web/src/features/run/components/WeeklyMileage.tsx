import { useState } from "react";
import { formatMiles } from "../lib/units";
import {
  LABEL_EVERY,
  WEEK_COUNTS,
  showsLabel,
  weekAxis,
  weeklyTotals,
  type WeekRange,
} from "../lib/weeks";
import card from "./card.module.css";
import styles from "./WeeklyMileage.module.css";

type Props = {
  days: Map<string, number>;
  today: string;
  goal: number;
};

const RANGES: { key: WeekRange; label: string }[] = [
  { key: "8wk", label: "8 wk" },
  { key: "16wk", label: "16 wk" },
  { key: "1yr", label: "1 yr" },
];

/** Miles per week as bars, against the dashed weekly goal. */
export function WeeklyMileage({ days, today, goal }: Props) {
  const [range, setRange] = useState<WeekRange>("16wk");
  const weeks = weeklyTotals(days, today, WEEK_COUNTS[range]);
  const axis = weekAxis(weeks, goal);
  const pct = (miles: number) => `${(miles / axis.max) * 100}%`;

  return (
    <section className={`${card.card} ${card.wide}`}>
      <div className={card.head}>
        <h2 className={card.title}>Weekly mileage</h2>
        <div role="group" aria-label="Range" className={styles.ranges}>
          {RANGES.map((r) => (
            <button
              key={r.key}
              className={styles.range}
              aria-pressed={range === r.key}
              onClick={() => setRange(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.chart}>
        <div className={styles.grid}>
          {axis.ticks.map((t) => (
            <div key={t} className={styles.tick}>
              {t}
            </div>
          ))}
        </div>
        <div className={styles.plot}>
          <div className={styles.goal} style={{ bottom: pct(goal) }}>
            <span>goal {goal} mi</span>
          </div>
          <div
            className={styles.bars}
            data-dense={range === "1yr" || undefined}
          >
            {weeks.map((w, i) => (
              <div key={w.start} className={styles.column}>
                <div
                  className={styles.bar}
                  data-state={
                    w.current ? "current" : w.miles >= goal ? "hit" : "under"
                  }
                  style={{ height: pct(w.miles) }}
                  title={`Week of ${w.label}: ${formatMiles(w.miles)} mi`}
                />
                <span className={styles.label}>
                  {showsLabel(i, weeks.length, LABEL_EVERY[range])
                    ? w.label
                    : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.legend}>
        <span>
          <i data-state="hit" />
          Hit goal
        </span>
        <span>
          <i data-state="under" />
          Under goal
        </span>
        <span>
          <i data-state="current" />
          This week so far
        </span>
      </div>
    </section>
  );
}
