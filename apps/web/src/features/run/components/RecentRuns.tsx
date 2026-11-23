import type { RunActivity } from "@lifehub/shared";
import { dayDate } from "../lib/dates";
import {
  formatMiles,
  formatPace,
  paceSecondsPerMile,
  toMiles,
} from "../lib/units";
import card from "./card.module.css";
import styles from "./RecentRuns.module.css";

/** The last few runs as a table. */
export function RecentRuns({ runs }: { runs: RunActivity[] }) {
  return (
    <section className={card.card}>
      <div>
        <h2 className={card.title}>Recent runs</h2>
        <p className={card.note}>
          HR drift is how much heart rate rose in the second half at the same
          pace. Under 5% means the run stayed aerobic.
        </p>
      </div>
      {runs.length === 0 ? (
        <p className={card.note}>
          No runs yet. They show up here after your watch syncs.
        </p>
      ) : (
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Run</th>
                <th className={styles.right}>Distance</th>
                <th className={styles.right}>Pace</th>
                <th className={styles.right}>Avg HR</th>
                <th className={styles.right}>HR drift</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td className={styles.date}>
                    {dayDate(r.start.slice(0, 10))}
                  </td>
                  <td className={styles.name}>{r.name}</td>
                  <td className={`${styles.right} ${card.num}`}>
                    {formatMiles(toMiles(r.distanceM))} mi
                  </td>
                  <td className={`${styles.right} ${card.num}`}>
                    {formatPace(paceSecondsPerMile(r.distanceM, r.durationS))}
                    /mi
                  </td>
                  <td className={`${styles.right} ${card.num}`}>
                    {r.avgHr ?? "—"}
                  </td>
                  <td className={`${styles.right} ${card.num}`}>
                    {r.driftPct === undefined ? "—" : `${r.driftPct}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
