import type { Dashboard } from "../lib/dashboard";
import { dayDate } from "../lib/dates";
import { liftSlot, SLOT_LABEL } from "../lib/sessions";
import card from "./card.module.css";
import t from "./training.module.css";

type Props = { last: Dashboard["lifting"]["last"] };

/** The newest lift: each exercise's top set against the last time it was done. */
export function LastSessionCard({ last }: Props) {
  if (!last) return null;
  const { session, lines } = last;
  const slot = liftSlot(session);
  return (
    <section className={card.card}>
      <div className={card.head}>
        <h2 className={card.title}>
          Last session{slot ? `: ${SLOT_LABEL[slot]}` : ""}
        </h2>
        <span className={t.small}>
          {dayDate(session.start.slice(0, 10))} ·{" "}
          {Math.round(session.durationS / 60)} min
        </span>
      </div>
      <div className={t.rows}>
        {lines.map((l) => (
          <div key={l.exercise} className={t.row}>
            <div className={t.rowMain}>
              <span className={t.rowTitle}>{l.exercise}</span>
              <span className={`${t.num} ${t.small}`}>{l.summary}</span>
            </div>
            <span className={t.pill} data-tone={l.tone}>
              {l.change}
            </span>
          </div>
        ))}
      </div>
      <p className={card.note}>
        Top set against the last time you did each exercise. Weights in lb.
      </p>
    </section>
  );
}
