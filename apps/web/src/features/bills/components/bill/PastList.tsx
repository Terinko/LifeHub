import { monthName, shortDate } from "../../lib/dates";
import { statusText } from "../../lib/describe";
import { formatMoney } from "../../lib/money";
import { frequencyOf } from "../../lib/schedule";
import type { Entry } from "../../lib/status";
import card from "../chrome/card.module.css";
import styles from "./PastList.module.css";

type Props = { entries: Entry[] };

/** Earlier due dates of one bill, newest first. */
export function PastList({ entries }: Props) {
  if (entries.length === 0) return null;
  return (
    <section className={styles.list} aria-label="Earlier">
      <span className={styles.title}>EARLIER</span>
      {entries.map((e) => {
        const status = e.state === "overdue" ? "Not paid" : statusText(e).text;
        const shown = e.amount ?? e.estimate;
        return (
          <div key={e.key} className={styles.row}>
            <span className={styles.when}>
              {frequencyOf(e.bill) === "monthly"
                ? monthName(e.due.getMonth())
                : shortDate(e.due)}
              <span
                className={e.state === "overdue" ? styles.late : styles.sec}
              >
                {" "}
                · {status}
              </span>
            </span>
            <span className={`${card.money} ${styles.amount}`}>
              {shown === null
                ? "—"
                : e.amount === null
                  ? `~${formatMoney(shown)}`
                  : formatMoney(shown)}
            </span>
          </div>
        );
      })}
    </section>
  );
}
