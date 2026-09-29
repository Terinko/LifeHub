import { Check } from "lucide-react";
import { parseDay, shortDate } from "../../lib/dates";
import { formatMoney, formatShort } from "../../lib/money";
import { sharesOf } from "../../lib/split";
import type { Entry } from "../../lib/status";
import type { Payer } from "../../types";
import card from "../chrome/card.module.css";
import styles from "./SplitPeople.module.css";

type Props = {
  entry: Entry;
  onRepaid: (payer: Payer, back: boolean) => void;
  onChangeShares: () => void;
};

const backOn = (payer: Payer, key: string) => {
  const v = payer.paidHistory?.[key];
  const d = typeof v === "string" ? parseDay(v) : null;
  return d ? `Paid you back ${shortDate(d)}` : "Paid you back";
};

/** Who pays what of a split bill, and who has paid you back. */
export function SplitPeople({ entry, onRepaid, onChangeShares }: Props) {
  const { bill, key } = entry;
  const amount = entry.amount ?? entry.estimate ?? 0;
  const shares = sharesOf(bill, amount);
  const paidOn = parseDay(entry.paidOn ?? undefined);
  const you = entry.autoPaid
    ? "Autopaid"
    : entry.paid
      ? `Paid${bill.payeeName ? ` ${bill.payeeName}` : ""}${paidOn ? ` ${shortDate(paidOn)}` : ""}`
      : "Not paid yet";

  return (
    <section className={styles.card} aria-label="Who pays what">
      <div className={styles.head}>
        <span className={styles.title}>
          {formatShort(amount).toUpperCase()} SPLIT {shares.payers.length + 1}{" "}
          WAYS
        </span>
        <button type="button" className={styles.link} onClick={onChangeShares}>
          Change shares
        </button>
      </div>
      <Person
        name="You"
        note={you}
        tone={entry.paid ? "sec" : "amber"}
        amount={shares.mine}
      >
        {entry.paid && (
          <span className={styles.slot} aria-hidden>
            <span className={styles.dot}>
              <Check size={16} strokeWidth={3} />
            </span>
          </span>
        )}
      </Person>
      {shares.payers.map(({ payer, share }) => {
        const back = !!payer.paidHistory?.[key];
        return (
          <Person
            key={payer.id}
            name={payer.name}
            note={back ? backOn(payer, key) : "Owes you"}
            tone={back ? "lime" : "sky"}
            amount={share}
          >
            {back ? (
              <button
                type="button"
                className={styles.slot}
                aria-pressed="true"
                aria-label={`${payer.name} paid you back. Tap to undo.`}
                onClick={() => onRepaid(payer, false)}
              >
                <span className={styles.dot}>
                  <Check size={16} strokeWidth={3} aria-hidden />
                </span>
              </button>
            ) : (
              <button
                type="button"
                className={styles.paidMe}
                aria-pressed="false"
                aria-label={`Mark that ${payer.name} paid you back`}
                onClick={() => onRepaid(payer, true)}
              >
                Paid me
              </button>
            )}
          </Person>
        );
      })}
    </section>
  );
}

type PersonProps = {
  name: string;
  note: string;
  tone: "sec" | "lime" | "sky" | "amber";
  amount: number;
  children?: React.ReactNode;
};

function Person({ name, note, tone, amount, children }: PersonProps) {
  return (
    <div className={styles.person}>
      <span className={styles.avatar} aria-hidden>
        {name.slice(0, 2).toUpperCase()}
      </span>
      <span className={styles.who}>
        <span className={styles.name}>{name}</span>
        <span className={`${styles.note} ${styles[tone]}`}>{note}</span>
      </span>
      <span className={`${card.money} ${styles.amount}`}>
        {formatMoney(amount)}
      </span>
      {children ?? <span className={styles.slot} />}
    </div>
  );
}
