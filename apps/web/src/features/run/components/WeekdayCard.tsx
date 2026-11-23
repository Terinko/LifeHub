import { REFERENCE_HR } from "../lib/settings";
import { formatPace } from "../lib/units";
import card from "./card.module.css";
import styles from "./WeekdayCard.module.css";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Easy pace at the same heart rate by weekday: darker is faster. */
export function WeekdayCard({ paces }: { paces: (number | undefined)[] }) {
  const known = paces.filter((p): p is number => p !== undefined);
  if (known.length < 3) return null;
  const fast = Math.min(...known);
  const slow = Math.max(...known);
  const level = (p: number) =>
    slow === fast ? 2 : Math.round(((slow - p) / (slow - fast)) * 4);
  return (
    <section className={card.card}>
      <h2 className={card.title}>Best day of the week</h2>
      <p className={card.note}>
        Easy pace at {REFERENCE_HR} bpm by weekday, last 6 months. Darker is
        faster.
      </p>
      <div className={styles.days}>
        {DAYS.map((day, i) => {
          const p = paces[i];
          return (
            <div key={day} className={styles.day}>
              <span
                className={styles.cell}
                data-level={p === undefined ? "none" : level(p)}
              >
                {p === undefined ? "—" : formatPace(p)}
              </span>
              <span className={styles.name}>{day}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
