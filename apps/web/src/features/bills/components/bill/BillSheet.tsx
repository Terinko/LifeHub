import { useState } from "react";
import { Check, Pencil, Users } from "lucide-react";
import { markPaid, markUnpaid, setAmount, setRepaid } from "../../lib/actions";
import { monthName, monthTitle, ordinal, shortDate } from "../../lib/dates";
import { statusText } from "../../lib/describe";
import { pastEntries } from "../../lib/history";
import { formatShort, parseAmount } from "../../lib/money";
import { payoffOf } from "../../lib/payoff";
import { frequencyOf, scheduleText } from "../../lib/schedule";
import { isSplit } from "../../lib/split";
import type { Entry } from "../../lib/status";
import type { Bill, Payer } from "../../types";
import { Sheet } from "../chrome/Sheet";
import card from "../chrome/card.module.css";
import { AmountBlock } from "./AmountBlock";
import { PastList } from "./PastList";
import { SplitPeople } from "./SplitPeople";
import { TrendBars } from "./TrendBars";
import styles from "./BillSheet.module.css";

type Props = {
  entry: Entry;
  today: Date;
  onClose: () => void;
  onEdit: () => void;
  /** Saves a change; the message shows with an Undo. */
  onChange: (next: Bill, message: string) => void;
};

const CHIP = {
  rose: styles.rose,
  amber: styles.amber,
  sky: styles.sky,
  lime: styles.lime,
  plain: "",
};

/** One due date of a bill: pay it, add its amount, track who paid you back. */
export function BillSheet({ entry, today, onClose, onEdit, onChange }: Props) {
  const { bill, key } = entry;
  const monthly = frequencyOf(bill) === "monthly";
  const when = monthly ? monthName(entry.due.getMonth()) : shortDate(entry.due);
  const [text, setText] = useState(
    entry.amount === null ? "" : entry.amount.toFixed(2),
  );
  const [error, setError] = useState<string | null>(null);

  const status = statusText(entry);
  const past = pastEntries(bill, today, key, 11);
  const payoff = payoffOf(bill, today);
  const split = isSplit(bill);
  const subtitle = [
    bill.payeeName?.trim(),
    scheduleText(bill, ordinal).toLowerCase(),
  ]
    .filter(Boolean)
    .join(" · ");

  /** The typed amount, or the reason it can't be used. */
  const typed = (): number | null => {
    const n = parseAmount(text);
    if (n === null) {
      setError(
        text.trim() === ""
          ? `Enter ${when}'s amount first.`
          : "Enter dollars, like 142.18.",
      );
      return null;
    }
    return n;
  };

  const saveAmount = (andPay: boolean) => {
    const n = typed();
    if (n === null) return;
    const next = setAmount(bill, key, n);
    if (andPay) {
      onChange(markPaid(next, key, today), `${bill.name} marked paid`);
      onClose();
    } else {
      onChange(next, `${bill.name}: ${when} amount saved`);
    }
  };

  const pay = () => {
    onChange(markPaid(bill, key, today), `${bill.name} marked paid`);
    onClose();
  };

  const unpay = () =>
    onChange(markUnpaid(bill, key), `${bill.name} marked not paid`);

  const repaid = (payer: Payer, back: boolean) =>
    onChange(
      setRepaid(bill, key, payer.id, back, today, entry.paid),
      back
        ? `${payer.name} paid you back`
        : `${payer.name} marked as still owing`,
    );

  const owedTotal = entry.owed.reduce((s, o) => s + o.share, 0);
  const owedNames = entry.owed.map((o) => o.payer.name);

  return (
    <Sheet
      title={bill.name}
      subtitle={subtitle}
      onClose={onClose}
      actions={
        <button type="button" className={styles.edit} onClick={onEdit}>
          <Pencil size={16} aria-hidden />
          Edit
        </button>
      }
    >
      {entry.state === "waiting" ? (
        <div className={styles.waiting}>
          <Users size={22} className={styles.waitIcon} aria-hidden />
          <span className={styles.waitText}>
            <strong>
              Waiting on{" "}
              {owedNames.length <= 2
                ? owedNames.join(" and ")
                : `${owedNames.length} people`}
            </strong>
            <span>
              {bill.name} moves to Paid once{" "}
              {owedNames.length === 1 ? `${owedNames[0]} pays` : "they pay"} you
              back.
            </span>
          </span>
          <span className={`${card.money} ${styles.waitAmount}`}>
            {formatShort(owedTotal)}
          </span>
        </div>
      ) : (
        <span className={`${styles.chip} ${CHIP[status.tone]}`}>
          {monthly
            ? `${monthTitle({ y: entry.due.getFullYear(), m: entry.due.getMonth() })} · `
            : ""}
          {status.text}
        </span>
      )}

      {bill.isVariable && (
        <AmountBlock
          label={`${when} amount`}
          text={text}
          onText={(t) => {
            setText(t);
            setError(null);
          }}
          estimate={entry.amount === null ? entry.estimate : null}
          error={error}
          monthly={monthly}
        />
      )}

      {bill.isVariable && (
        <TrendBars entries={[...past].reverse().concat(entry)} />
      )}

      {split && (
        <SplitPeople entry={entry} onRepaid={repaid} onChangeShares={onEdit} />
      )}

      {payoff && (
        <div className={styles.payoff}>
          <span>
            <strong>
              {payoff.left} {payoff.left === 1 ? "payment" : "payments"} left
            </strong>{" "}
            · last one in {monthTitle(payoff.last)}
          </span>
          <span className={card.money}>
            {formatShort(payoff.remaining)} to go
          </span>
        </div>
      )}

      {bill.notes?.trim() && <p className={styles.notes}>{bill.notes}</p>}

      <PastList entries={past.slice(0, 6)} />

      <div className={styles.actions}>
        {bill.isVariable && !entry.paid ? (
          <>
            <button
              type="button"
              className={card.quiet}
              onClick={() => saveAmount(false)}
            >
              Save amount
            </button>
            <button
              type="button"
              className={card.primary}
              onClick={() => saveAmount(true)}
            >
              <Check size={18} strokeWidth={2.8} aria-hidden />
              Save &amp; paid
            </button>
          </>
        ) : entry.paid ? (
          <>
            {bill.isVariable && (
              <button
                type="button"
                className={card.quiet}
                onClick={() => saveAmount(false)}
              >
                Save amount
              </button>
            )}
            <button type="button" className={card.quiet} onClick={unpay}>
              Mark not paid
            </button>
          </>
        ) : (
          <button
            type="button"
            className={`${card.primary} ${styles.wide}`}
            onClick={pay}
          >
            <Check size={18} strokeWidth={2.8} aria-hidden />
            Mark paid
          </button>
        )}
      </div>
    </Sheet>
  );
}
