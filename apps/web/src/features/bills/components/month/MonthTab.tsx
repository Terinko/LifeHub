import type { ReactNode } from "react";
import {
  addMonths,
  monthIndex,
  monthName,
  monthOf,
  type Month,
} from "../../lib/dates";
import type { MonthView } from "../../lib/month";
import type { Entry } from "../../lib/status";
import { Notice } from "../chrome/Notice";
import card from "../chrome/card.module.css";
import { BillRow } from "./BillRow";
import rows from "./BillRow.module.css";
import { PaidGroup } from "./PaidGroup";
import { ReceiptCard } from "./ReceiptCard";
import styles from "./MonthTab.module.css";

type Props = {
  month: Month;
  view: MonthView;
  /** Unpaid bills left over from last month, when looking at this one. */
  lastMonthUnpaid: number;
  today: Date;
  onMonth: (step: number) => void;
  onOpen: (e: Entry) => void;
  onPay: (e: Entry) => void;
  onUnpay: (e: Entry) => void;
};

export function MonthTab({
  month,
  view,
  lastMonthUnpaid,
  today,
  onMonth,
  onOpen,
  onPay,
  onUnpay,
}: Props) {
  const current = monthIndex(month) === monthIndex(monthOf(today));
  const future = monthIndex(month) > monthIndex(monthOf(today));
  const handlers = { onOpen, onPay, onUnpay };
  const last = addMonths(month, -1);

  return (
    <>
      <ReceiptCard month={month} view={view} onMonth={onMonth} />
      {current && lastMonthUnpaid > 0 && (
        <Notice
          tone="warning"
          title={`${monthName(last.m)} has ${lastMonthUnpaid} unpaid ${lastMonthUnpaid === 1 ? "bill" : "bills"}`}
          body="Mark them paid if you already paid them."
          action={{ label: "Open", onClick: () => onMonth(-1) }}
        />
      )}
      <Section
        title={`Overdue · ${view.overdue.length}`}
        tone="rose"
        entries={view.overdue}
        {...handlers}
      />
      <Section title="This week" entries={view.thisWeek} {...handlers} />
      <Section
        title={
          current
            ? "Later this month"
            : future
              ? `Due in ${monthName(month.m)}`
              : "Coming up"
        }
        entries={view.later}
        {...handlers}
      />
      <Section
        title="Waiting on others"
        tone="sky"
        entries={view.waiting}
        {...handlers}
      />
      <PaidGroup entries={view.paid} {...handlers} />
      {view.entries.length === 0 && (
        <p className={styles.empty}>No bills due in {monthName(month.m)}.</p>
      )}
    </>
  );
}

type SectionProps = {
  title: ReactNode;
  tone?: "rose" | "sky";
  entries: Entry[];
  onOpen: (e: Entry) => void;
  onPay: (e: Entry) => void;
  onUnpay: (e: Entry) => void;
};

function Section({ title, tone, entries, ...handlers }: SectionProps) {
  if (entries.length === 0) return null;
  return (
    <section
      className={styles.section}
      aria-label={typeof title === "string" ? title : undefined}
    >
      <h2 className={`${card.eyebrow} ${tone ? styles[tone] : ""}`}>{title}</h2>
      <div className={rows.group}>
        {entries.map((e) => (
          <BillRow key={`${e.bill.id}-${e.key}`} entry={e} {...handlers} />
        ))}
      </div>
    </section>
  );
}
