import { ChevronRight } from "lucide-react";
import type { GroupRecord, RecordBook, RecordKey } from "../../lib/records";
import { formatShortMoney, formatShortSigned } from "../../lib/money";
import { gameDate } from "../../lib/share";
import { ChartCard } from "./ChartCard";
import styles from "./RecordBookCard.module.css";

type Props = {
  book: RecordBook;
  /** Opens the game a record was set in. */
  onOpenGame: (sk: string) => void;
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const at = (r: GroupRecord) => `at ${formatShortMoney(r.buyIn)}`;

const RECORDS: {
  key: RecordKey;
  title: string;
  show: (r: GroupRecord) => string;
}[] = [
  {
    key: "biggestGame",
    title: "Biggest game",
    show: (r) => `${formatShortMoney(r.value)} on the table`,
  },
  {
    key: "biggestWin",
    title: "Biggest win",
    show: (r) => `${r.name} ${formatShortSigned(r.value)} ${at(r)}`,
  },
  {
    key: "biggestLoss",
    title: "Biggest loss",
    show: (r) => `${r.name} ${formatShortSigned(r.value)} ${at(r)}`,
  },
  {
    key: "mostBuyIns",
    title: "Most buy-ins",
    show: (r) => `${r.name} · ${plural(r.value, "buy-in")}`,
  },
  {
    key: "longestStreak",
    title: "Longest win streak",
    show: (r) => `${r.name} · ${plural(r.value, "win")}`,
  },
  {
    key: "biggestTable",
    title: "Biggest table",
    show: (r) => plural(r.value, "player"),
  },
];

/** The group's records. Each one opens the game it was set in. */
export function RecordBookCard({ book, onOpenGame }: Props) {
  const rows = RECORDS.flatMap((r) => {
    const record = book[r.key];
    return record ? [{ ...r, record }] : [];
  });
  if (rows.length === 0) return null;
  return (
    <ChartCard title="Record book">
      <ul className={styles.list}>
        {rows.map(({ key, title, show, record }) => (
          <li key={key}>
            <button
              type="button"
              className={styles.row}
              onClick={() => onOpenGame(record.gameSk)}
            >
              <span className={styles.what}>{title}</span>
              <span className={styles.who}>
                <span className={styles.holder}>{show(record)}</span>
                <span className={styles.date}>{gameDate(record.date)}</span>
              </span>
              <ChevronRight className={styles.chevron} size={16} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </ChartCard>
  );
}
