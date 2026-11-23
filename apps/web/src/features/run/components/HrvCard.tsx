import type { Dashboard } from "../lib/dashboard";
import { MIN_HRV_NIGHTS } from "../lib/insights";
import card from "./card.module.css";
import styles from "./HrvCard.module.css";
import t from "./training.module.css";

type Props = { hrv: Dashboard["insights"]["hrv"] };

const describe = (r: number) =>
  Math.abs(r) < 0.2
    ? "Hard training days don't seem to move your HRV much."
    : r < 0
      ? "Your HRV tends to drop the night after a heavy training day."
      : "Your HRV tends to hold up even after heavy days.";

/** Overnight HRV against the previous day's training load. */
export function HrvCard({ hrv }: Props) {
  const { nights, correlation } = hrv;
  if (nights.length === 0) return null;
  const maxLoad = Math.max(1, ...nights.map((n) => n.load));
  const lo = Math.min(...nights.map((n) => n.hrv)) - 5;
  const hi = Math.max(...nights.map((n) => n.hrv)) + 5;
  return (
    <section className={card.card}>
      <div className={card.head}>
        <h2 className={card.title}>HRV after training</h2>
        <span className={t.small}>{nights.length} nights, last 90 days</span>
      </div>
      <p className={card.note}>
        Each dot is a night you wore the watch, placed by the day before's
        training load.
      </p>
      <svg
        viewBox="0 0 356 150"
        className={t.svg}
        role="img"
        aria-label="HRV against the day before's training load"
      >
        <line x1={28} x2={356} y1={130} y2={130} className={styles.axis} />
        <line x1={28} x2={28} y1={8} y2={130} className={styles.axis} />
        <text x={0} y={14}>
          {Math.round(hi)}
        </text>
        <text x={0} y={130}>
          {Math.round(lo)}
        </text>
        {nights.map((n) => (
          <circle
            key={n.date}
            cx={32 + (n.load / maxLoad) * 316}
            cy={130 - ((n.hrv - lo) / (hi - lo)) * 120}
            r={4}
            className={styles.dot}
          />
        ))}
        <text x={356} y={146} textAnchor="end">
          higher load the day before →
        </text>
      </svg>
      <p className={t.callout}>
        {correlation === undefined
          ? `Too few nights to call a pattern yet. This says more after ${MIN_HRV_NIGHTS} nights.`
          : describe(correlation)}
      </p>
    </section>
  );
}
