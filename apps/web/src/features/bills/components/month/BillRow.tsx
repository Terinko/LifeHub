import { Check, ChevronRight, Zap } from "lucide-react";
import { detailText, statusText } from "../../lib/describe";
import { formatMoney, formatShort } from "../../lib/money";
import type { Entry } from "../../lib/status";
import { DateBlock } from "../chrome/DateBlock";
import card from "../chrome/card.module.css";
import styles from "./BillRow.module.css";

type Props = {
  entry: Entry;
  onOpen: (e: Entry) => void;
  onPay: (e: Entry) => void;
  onUnpay: (e: Entry) => void;
};

const TONE = {
  rose: styles.rose,
  amber: styles.amber,
  sky: styles.sky,
  lime: styles.lime,
  plain: "",
};

/** One due date: when, what, how much, and the one tap it needs. */
export function BillRow({ entry: e, onOpen, onPay, onUnpay }: Props) {
  const { bill } = e;
  const status = statusText(e);
  const detail = detailText(e);
  const needsAmount = !!bill.isVariable && e.amount === null && !e.paid;
  const shown = e.amount ?? e.estimate;

  let action;
  if (needsAmount) {
    action = (
      <button
        type="button"
        className={styles.addAmount}
        onClick={() => onOpen(e)}
        aria-label={`Add ${bill.name}'s amount`}
      >
        Add $
      </button>
    );
  } else if (e.state === "due" && bill.autopay) {
    action = (
      <span className={styles.autopay} title="Autopay" aria-hidden>
        <Zap size={18} strokeWidth={2} />
      </span>
    );
  } else if (e.state === "due" || e.state === "overdue") {
    action = (
      <button
        type="button"
        className={`${styles.ring} ${e.state === "overdue" ? styles.ringLate : ""}`}
        onClick={() => onPay(e)}
        aria-label={`Mark ${bill.name} paid`}
      >
        <Check size={18} strokeWidth={2.6} aria-hidden />
      </button>
    );
  } else if (e.state === "waiting") {
    action = (
      <button
        type="button"
        className={styles.chevron}
        onClick={() => onOpen(e)}
        aria-label={`Open ${bill.name}`}
      >
        <ChevronRight size={18} strokeWidth={2} aria-hidden />
      </button>
    );
  } else {
    action = (
      <button
        type="button"
        className={styles.done}
        onClick={() => onUnpay(e)}
        aria-label={`Mark ${bill.name} not paid`}
      >
        <span className={styles.doneDot}>
          <Check size={16} strokeWidth={3} aria-hidden />
        </span>
      </button>
    );
  }

  return (
    <div className={styles.row}>
      <button type="button" className={styles.main} onClick={() => onOpen(e)}>
        <DateBlock
          date={e.due}
          tone={e.state === "overdue" ? "late" : "normal"}
        />
        <span className={styles.text}>
          <span className={styles.titleLine}>
            <span className={styles.name}>{bill.name}</span>
            {bill.autopay && (
              <span className={`${card.pill} ${card.pillLime}`}>Autopay</span>
            )}
            {bill.isShared && (bill.payers?.length ?? 0) > 0 && (
              <span className={`${card.pill} ${card.pillSky}`}>Split</span>
            )}
            {bill.frequency && bill.frequency !== "monthly" && (
              <span className={card.pill}>{FREQ[bill.frequency]}</span>
            )}
          </span>
          <span className={styles.meta}>
            <span className={TONE[status.tone]}>{status.text}</span>
            {detail && ` · ${detail}`}
          </span>
        </span>
        <span
          className={`${card.money} ${styles.amount} ${e.amount === null ? styles.guess : ""}`}
        >
          {shown === null
            ? "—"
            : e.amount === null
              ? `~${formatShort(shown)}`
              : formatMoney(shown)}
        </span>
      </button>
      {action}
    </div>
  );
}

const FREQ = {
  monthly: "Monthly",
  biweekly: "2 weeks",
  quarterly: "Quarterly",
  yearly: "Yearly",
  once: "Once",
};
