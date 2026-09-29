import { monthShort } from "../../lib/dates";
import styles from "./DateBlock.module.css";

type Props = { date: Date; tone?: "late" | "normal" };

/** A little tear-off calendar page: "SEP / 5". */
export function DateBlock({ date, tone = "normal" }: Props) {
  return (
    <span
      className={`${styles.block} ${tone === "late" ? styles.late : ""}`}
      aria-hidden
    >
      <span className={styles.month}>
        {monthShort(date.getMonth()).toUpperCase()}
      </span>
      <span className={styles.day}>{date.getDate()}</span>
    </span>
  );
}
