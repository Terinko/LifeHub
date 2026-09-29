import { ChipAvatar } from "../chrome/ChipAvatar";
import { Money } from "../chrome/Money";
import styles from "./RankedList.module.css";

type Row = { id: string; name: string; net: number; detail?: string };

/** Players with an amount each, like head-to-head or the leaderboard. */
export function RankedList({ rows }: { rows: Row[] }) {
  return (
    <ol className={styles.list}>
      {rows.map((r) => (
        <li key={r.id} className={styles.row}>
          <ChipAvatar id={r.id} name={r.name} size="sm" />
          <span className={styles.who}>
            <span className={styles.name}>{r.name}</span>
            {r.detail && <span className={styles.detail}>{r.detail}</span>}
          </span>
          <Money value={r.net} size={20} />
        </li>
      ))}
    </ol>
  );
}
