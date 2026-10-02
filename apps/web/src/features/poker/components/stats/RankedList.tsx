import { ChevronRight } from "lucide-react";
import { ChipAvatar } from "../chrome/ChipAvatar";
import { Money } from "../chrome/Money";
import styles from "./RankedList.module.css";

type Row = { id: string; name: string; net: number; detail?: string };

type Props = {
  rows: Row[];
  /** When given, each row opens that player. */
  onOpen?: (id: string) => void;
};

/** Players with an amount each, like head-to-head or the leaderboard. */
export function RankedList({ rows, onOpen }: Props) {
  return (
    <ol className={styles.list}>
      {rows.map((r) => {
        const body = (
          <>
            <ChipAvatar id={r.id} name={r.name} size="sm" />
            <span className={styles.who}>
              <span className={styles.name}>{r.name}</span>
              {r.detail && <span className={styles.detail}>{r.detail}</span>}
            </span>
            <Money value={r.net} size={20} />
          </>
        );
        return (
          <li key={r.id} className={styles.row}>
            {onOpen ? (
              <button
                type="button"
                className={styles.open}
                onClick={() => onOpen(r.id)}
                aria-label={`${r.name}'s stats`}
              >
                {body}
                <ChevronRight
                  className={styles.chevron}
                  size={16}
                  aria-hidden
                />
              </button>
            ) : (
              body
            )}
          </li>
        );
      })}
    </ol>
  );
}
