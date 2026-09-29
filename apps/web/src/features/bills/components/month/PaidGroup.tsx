import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { formatMoney } from "../../lib/money";
import { countedAmount, type Entry } from "../../lib/status";
import card from "../chrome/card.module.css";
import { BillRow } from "./BillRow";
import rows from "./BillRow.module.css";
import styles from "./PaidGroup.module.css";

type Props = {
  entries: Entry[];
  onOpen: (e: Entry) => void;
  onPay: (e: Entry) => void;
  onUnpay: (e: Entry) => void;
};

/** Paid bills, folded into one line until you want them. */
export function PaidGroup({ entries, onOpen, onPay, onUnpay }: Props) {
  const [open, setOpen] = useState(false);
  if (entries.length === 0) return null;
  const total = entries.reduce((s, e) => s + countedAmount(e), 0);
  const names = entries.map((e) => e.bill.name).join(", ");

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={styles.dot} aria-hidden>
          <Check size={16} strokeWidth={3} />
        </span>
        <span className={styles.label}>
          Paid <span className={styles.names}>· {names}</span>
        </span>
        <span className={`${card.money} ${styles.total}`}>
          {formatMoney(total)}
        </span>
        <ChevronDown
          size={18}
          className={`${styles.chev} ${open ? styles.up : ""}`}
          aria-hidden
        />
      </button>
      {open && (
        <div className={rows.group}>
          {entries.map((e) => (
            <BillRow
              key={`${e.bill.id}-${e.key}`}
              entry={e}
              onOpen={onOpen}
              onPay={onPay}
              onUnpay={onUnpay}
            />
          ))}
        </div>
      )}
    </div>
  );
}
