import { ChevronLeft, ChevronRight } from "lucide-react";
import { dayLabel, shiftDay, todayKey } from "../../lib/dates";
import styles from "./DayStepper.module.css";

type Props = { date: string; onChange: (date: string) => void };

/** ‹ Today › : steps through game days; tapping the label jumps back to today. */
export function DayStepper({ date, onChange }: Props) {
  const today = todayKey();
  return (
    <div className={styles.stepper}>
      <button
        type="button"
        className={styles.arrow}
        aria-label="Previous day"
        onClick={() => onChange(shiftDay(date, -1))}
      >
        <ChevronLeft size={20} strokeWidth={2.4} aria-hidden />
      </button>
      <button
        type="button"
        className={styles.day}
        onClick={() => onChange(today)}
        disabled={date === today}
        aria-label={
          date === today ? "Today" : `${dayLabel(date)}, jump to today`
        }
      >
        {dayLabel(date, today)}
      </button>
      <button
        type="button"
        className={styles.arrow}
        aria-label="Next day"
        onClick={() => onChange(shiftDay(date, 1))}
      >
        <ChevronRight size={20} strokeWidth={2.4} aria-hidden />
      </button>
    </div>
  );
}
