import { monthName, monthShort } from "../../lib/dates";
import { formatMoney, round2 } from "../../lib/money";
import type { Entry } from "../../lib/status";
import card from "../chrome/card.module.css";
import styles from "./TrendBars.module.css";

type Props = {
  /** Oldest first, the open one last. */
  entries: Entry[];
};

/** A year of a varying bill at a glance. */
export function TrendBars({ entries }: Props) {
  const amounts = entries
    .map((e) => e.amount)
    .filter((a): a is number => a !== null);
  if (amounts.length < 2) return null;
  const top = Math.max(...amounts);
  const avg = round2(amounts.reduce((s, a) => s + a, 0) / amounts.length);
  const peak = entries.find((e) => e.amount === top);
  const current = entries[entries.length - 1];

  return (
    <section className={styles.card} aria-label="Last 12 months">
      <div className={styles.head}>
        <span className={styles.title}>LAST 12 MONTHS</span>
        <span className={`${card.money} ${styles.avg}`}>
          avg {formatMoney(avg)}
        </span>
      </div>
      <div className={styles.bars}>
        {entries.map((e) => {
          const open = e === current;
          const h =
            e.amount === null
              ? 0
              : Math.max(4, Math.round((e.amount / top) * 84));
          return (
            <div key={e.key} className={styles.col}>
              <div className={styles.slot}>
                {e.amount === null ? (
                  open && (
                    <div className={styles.pending} style={{ height: 80 }} />
                  )
                ) : (
                  <div
                    className={`${styles.bar} ${open ? styles.now : ""}`}
                    style={{ height: h }}
                    title={formatMoney(e.amount)}
                  />
                )}
              </div>
              <span className={`${styles.tick} ${open ? styles.tickNow : ""}`}>
                {monthShort(e.due.getMonth()).slice(0, 1)}
              </span>
            </div>
          );
        })}
      </div>
      {peak && (
        <span className={styles.note}>
          Highest was {formatMoney(top)} in {monthName(peak.due.getMonth())}.
        </span>
      )}
    </section>
  );
}
