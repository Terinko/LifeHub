import { dayDate, fromKey } from "../lib/dates";
import { formatMiles } from "../lib/units";
import type { StripDay } from "../lib/week";
import card from "./card.module.css";
import styles from "./DaysStrip.module.css";
import t from "./training.module.css";

const letter = (date: string) => "SMTWTFS".charAt(fromKey(date).getUTCDay());

/** The last 14 days: each day's run and lift load stacked on one scale. */
export function DaysStrip({ days }: { days: StripDay[] }) {
  const max = Math.max(1, ...days.map((d) => d.runLoad + d.liftLoad));
  const pct = (n: number) => `${(n / max) * 100}%`;
  return (
    <section className={card.card}>
      <div className={card.head}>
        <h2 className={card.title}>Last 14 days</h2>
        <div className={t.legend}>
          <span>
            <i className={t.swatch} data-c="run" />
            Run
          </span>
          <span>
            <i className={t.swatch} data-c="lift" />
            Lift
          </span>
        </div>
      </div>
      <div className={styles.strip}>
        {days.map((d, i) => (
          <div
            key={d.date}
            className={styles.day}
            title={`${dayDate(d.date)}: ${d.miles ? `${formatMiles(d.miles)} mi` : ""}${d.miles && d.lifted ? " + " : ""}${d.lifted ? "lift" : ""}${!d.miles && !d.lifted ? "rest" : ""}`}
          >
            <div className={styles.bars}>
              <div className={styles.run} style={{ height: pct(d.runLoad) }} />
              <div
                className={styles.lift}
                style={{ height: pct(d.liftLoad) }}
              />
            </div>
            <span
              className={styles.letter}
              data-today={i === days.length - 1 || undefined}
            >
              {letter(d.date)}
            </span>
          </div>
        ))}
      </div>
      <p className={card.note}>
        Bar height is training load, so a long run and a heavy lift day compare
        on one scale.
      </p>
    </section>
  );
}
