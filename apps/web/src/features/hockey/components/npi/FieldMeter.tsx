import styles from "./FieldMeter.module.css";

type Props = { rank: number; total: number; field: number };

/** A bar of every ranked team, shaded up to the tournament line, with a pin for the team. */
export function FieldMeter({ rank, total, field }: Props) {
  const pct = (n: number) =>
    `${Math.min(100, Math.max(0, ((n - 0.5) / total) * 100))}%`;
  return (
    <div className={styles.meter}>
      <div className={styles.track}>
        <span
          className={styles.field}
          style={{ width: pct(Math.min(field, total) + 0.5) }}
        />
        <span className={styles.pin} style={{ left: pct(rank) }} />
      </div>
      <div className={styles.labels}>
        <span>1</span>
        {total > field && <span>{field} · field line</span>}
        <span>{total}</span>
      </div>
    </div>
  );
}
