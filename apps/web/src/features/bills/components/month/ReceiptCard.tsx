import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthName, monthTitle, type Month } from "../../lib/dates";
import { formatMoney, formatShort } from "../../lib/money";
import type { MonthView } from "../../lib/month";
import card from "../chrome/card.module.css";
import styles from "./ReceiptCard.module.css";

type Props = {
  month: Month;
  view: MonthView;
  onMonth: (step: number) => void;
};

/** The month on a paper receipt: what's left, what's paid, what's late. */
export function ReceiptCard({ month, view, onMonth }: Props) {
  const share = view.total > 0 ? Math.min(1, view.paidTotal / view.total) : 0;
  return (
    <section
      className={styles.receipt}
      aria-label={`${monthName(month.m)} summary`}
    >
      <MonthSwitch month={month} onMonth={onMonth} className={styles.switch} />
      <div className={styles.body}>
        <div className={styles.lead}>
          <span className={styles.label}>
            {view.entries.length === 0
              ? "Nothing due"
              : view.left > 0
                ? "Left to pay"
                : "All paid"}
          </span>
          <span className={`${card.money} ${styles.big}`}>
            {view.estimated && view.left > 0 ? "~" : ""}
            {formatMoney(view.left)}
          </span>
        </div>
        {view.total > 0 && (
          <>
            <div
              className={styles.track}
              role="progressbar"
              aria-label="Paid so far"
              aria-valuemin={0}
              aria-valuemax={view.total}
              aria-valuenow={view.paidTotal}
            >
              <div
                className={styles.fill}
                style={{ width: `${share * 100}%` }}
              />
            </div>
            <div className={`${card.money} ${styles.totals}`}>
              <span>PAID {formatMoney(view.paidTotal)}</span>
              <span>OF {formatMoney(view.total)}</span>
            </div>
          </>
        )}
        {(view.overdue.length > 0 || view.owed > 0 || view.estimated) && (
          <>
            <div className={styles.rule} />
            <div className={styles.chips}>
              {view.overdue.length > 0 && (
                <span className={`${styles.chip} ${styles.late}`}>
                  {view.overdue.length} overdue
                </span>
              )}
              {view.owed > 0 && (
                <span className={`${styles.chip} ${styles.owed}`}>
                  Owed to you {formatShort(view.owed)}
                </span>
              )}
              {view.estimated && (
                <span className={styles.chip}>Some amounts are estimates</span>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

type SwitchProps = {
  month: Month;
  onMonth: (step: number) => void;
  className?: string;
};

/** "‹ SEPTEMBER 2026 ›" */
export function MonthSwitch({ month, onMonth, className }: SwitchProps) {
  return (
    <div className={`${styles.monthRow} ${className ?? ""}`}>
      <button
        type="button"
        className={styles.arrow}
        onClick={() => onMonth(-1)}
        aria-label="Previous month"
      >
        <ChevronLeft size={20} strokeWidth={2.4} aria-hidden />
      </button>
      <span className={styles.monthName} aria-live="polite">
        {monthTitle(month).toUpperCase()}
      </span>
      <button
        type="button"
        className={styles.arrow}
        onClick={() => onMonth(1)}
        aria-label="Next month"
      >
        <ChevronRight size={20} strokeWidth={2.4} aria-hidden />
      </button>
    </div>
  );
}
