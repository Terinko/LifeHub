import { useMemo, useState } from "react";
import {
  daysInMonth,
  monthIndex,
  monthName,
  monthOf,
  weekdayDate,
  type Month,
} from "../../lib/dates";
import type { Entry, State } from "../../lib/status";
import { BillRow } from "../month/BillRow";
import rows from "../month/BillRow.module.css";
import { MonthSwitch } from "../month/ReceiptCard";
import card from "../chrome/card.module.css";
import styles from "./CalendarTab.module.css";

type Props = {
  month: Month;
  entries: Entry[];
  today: Date;
  onMonth: (step: number) => void;
  onOpen: (e: Entry) => void;
  onPay: (e: Entry) => void;
  onUnpay: (e: Entry) => void;
};

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const LEGEND: { state: State; label: string }[] = [
  { state: "overdue", label: "Overdue" },
  { state: "due", label: "Coming up" },
  { state: "waiting", label: "Waiting on others" },
  { state: "paid", label: "Paid" },
];

export function CalendarTab({
  month,
  entries,
  today,
  onMonth,
  ...handlers
}: Props) {
  const isNow = monthIndex(month) === monthIndex(monthOf(today));
  const byDay = useMemo(() => {
    const map = new Map<number, Entry[]>();
    for (const e of entries)
      map.set(e.due.getDate(), [...(map.get(e.due.getDate()) ?? []), e]);
    return map;
  }, [entries]);
  const [picked, setPicked] = useState<{ month: number; day: number } | null>(
    null,
  );

  // Default to today, or the month's first due date.
  const day =
    picked && picked.month === monthIndex(month)
      ? picked.day
      : isNow
        ? today.getDate()
        : (entries[0]?.due.getDate() ?? 1);
  const lead = new Date(month.y, month.m, 1).getDay();
  const days = daysInMonth(month);
  const chosen = byDay.get(day) ?? [];

  return (
    <>
      <section
        className={styles.card}
        aria-label={`${monthName(month.m)} ${month.y}`}
      >
        <MonthSwitch
          month={month}
          onMonth={onMonth}
          className={styles.switch}
        />
        <div className={styles.grid}>
          {WEEKDAYS.map((w, i) => (
            <span key={i} className={styles.weekday} aria-hidden>
              {w}
            </span>
          ))}
          {Array.from({ length: lead }, (_, i) => (
            <span key={`pad${i}`} />
          ))}
          {Array.from({ length: days }, (_, i) => {
            const d = i + 1;
            const list = byDay.get(d) ?? [];
            const isToday = isNow && d === today.getDate();
            const label = `${monthName(month.m)} ${d}${isToday ? ", today" : ""}${
              list.length
                ? `, ${list.length} ${list.length === 1 ? "bill" : "bills"}`
                : ""
            }`;
            return (
              <button
                key={d}
                type="button"
                className={`${styles.day} ${isToday ? styles.today : ""}`}
                aria-pressed={d === day}
                aria-label={label}
                onClick={() => setPicked({ month: monthIndex(month), day: d })}
              >
                <span>{d}</span>
                <span className={styles.dots}>
                  {list.slice(0, 3).map((e) => (
                    <span
                      key={`${e.bill.id}-${e.key}`}
                      className={`${styles.dot} ${styles[e.state]}`}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </section>
      <div className={styles.legend}>
        {LEGEND.map((l) => (
          <span key={l.state} className={styles.key}>
            <span className={`${styles.dot} ${styles[l.state]}`} />
            {l.label}
          </span>
        ))}
      </div>
      <h2 className={card.eyebrow}>
        {weekdayDate(new Date(month.y, month.m, day))}
      </h2>
      {chosen.length > 0 ? (
        <div className={rows.group}>
          {chosen.map((e) => (
            <BillRow key={`${e.bill.id}-${e.key}`} entry={e} {...handlers} />
          ))}
        </div>
      ) : (
        <p className={styles.empty}>Nothing due this day.</p>
      )}
    </>
  );
}
