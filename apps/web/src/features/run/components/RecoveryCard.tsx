import type { Dashboard } from "../lib/dashboard";
import { shortDate } from "../lib/dates";
import card from "./card.module.css";
import t from "./training.module.css";

/** Overnight HRV, only from nights the watch was worn. */
export function RecoveryCard({ hrv }: { hrv: Dashboard["week"]["hrv"] }) {
  if (!hrv.last) return null;
  return (
    <section className={card.card}>
      <h2 className={card.title}>Recovery</h2>
      <div className={t.grid2}>
        <div className={t.inset}>
          <span className={t.small}>HRV, last 7 nights</span>
          <span className={t.tileValue}>
            {hrv.average === undefined ? "—" : Math.round(hrv.average)}
            <span className={t.tileUnit}>ms</span>
          </span>
          <span className={t.small}>{hrv.nights} of 7 nights recorded</span>
        </div>
        <div className={t.inset}>
          <span className={t.small}>Last recorded night</span>
          <span className={t.tileValue}>
            {hrv.last.value}
            <span className={t.tileUnit}>ms</span>
          </span>
          <span className={t.small}>{shortDate(hrv.last.date)}</span>
        </div>
      </div>
      <p className={card.note}>
        Only nights you wore the watch count. Missing nights stay blank and are
        never guessed.
      </p>
    </section>
  );
}
