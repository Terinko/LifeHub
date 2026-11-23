import { shortDate } from "../lib/dates";
import type { LiftRecord } from "../lib/lifting";
import card from "./card.module.css";
import t from "./training.module.css";

/** Each tracked lift's best set by estimated max. */
export function LiftRecordsCard({ records }: { records: LiftRecord[] }) {
  return (
    <section className={card.card}>
      <h2 className={card.title}>Lift records</h2>
      <div className={t.rows}>
        {records.map((r) => (
          <div key={r.exercise} className={t.row}>
            <span>{r.exercise}</span>
            <span className={t.num}>
              <b>{r.best ?? "—"}</b>{" "}
              <span className={t.small}>{r.date ? shortDate(r.date) : ""}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
