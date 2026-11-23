import { daysBetween, shortDate } from "../lib/dates";
import type { RotationEntry } from "../lib/rotation";
import { SLOT_LABEL, type Slot } from "../lib/sessions";
import card from "./card.module.css";
import styles from "./RotationCard.module.css";
import t from "./training.module.css";

type Props = {
  entries: RotationEntry[];
  next: Slot;
  today: string;
};

/** The last few sessions in rotation order, skipped ones marked, and what's next. */
export function RotationCard({ entries, next, today }: Props) {
  const recent = entries.slice(-5);
  const lastOfNext = [...entries]
    .reverse()
    .find((e) => e.slot === next && e.status === "done");
  const ago = lastOfNext ? daysBetween(lastOfNext.date, today) : undefined;
  return (
    <section className={card.card}>
      <div className={card.head}>
        <h2 className={card.title}>Rotation</h2>
        <span className={t.small}>Back + Bi, Chest + Tri, Run</span>
      </div>
      <ol className={styles.track}>
        {recent.map((e, i) => (
          <li
            key={`${e.date}-${i}`}
            className={styles.slot}
            data-kind={e.slot === "run" ? "run" : "lift"}
            data-status={e.status}
          >
            <span className={styles.when}>
              {e.status === "skipped" ? "Skipped" : shortDate(e.date)}
            </span>
            <span className={styles.what}>{SLOT_LABEL[e.slot]}</span>
          </li>
        ))}
        <li
          className={styles.slot}
          data-kind={next === "run" ? "run" : "lift"}
          data-status="next"
        >
          <span className={styles.when}>Next</span>
          <span className={styles.what}>{SLOT_LABEL[next]}</span>
        </li>
      </ol>
      <p className={t.callout}>
        <b>Next up: {SLOT_LABEL[next]}.</b>{" "}
        {ago === undefined
          ? "Rest days just push it back a day."
          : `Last one was ${ago === 0 ? "today" : ago === 1 ? "yesterday" : `${ago} days ago`}. Rest days just push it back.`}
      </p>
    </section>
  );
}
