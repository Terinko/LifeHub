import styles from "./WeekSkeleton.module.css";

/** Placeholder cards while the first load is in flight. */
export function WeekSkeleton() {
  return (
    <div
      className={styles.stack}
      aria-busy="true"
      aria-label="Loading this week"
    >
      <div className={styles.block} style={{ height: 212 }} />
      <div className={styles.block} style={{ height: 212 }} />
      <div className={styles.block} style={{ height: 160 }} />
    </div>
  );
}
