import { monthTitle } from "../../lib/dates";
import { formatMoney, formatShort } from "../../lib/money";
import type { overview } from "../../lib/overview";
import type { Bill } from "../../types";
import card from "../chrome/card.module.css";
import styles from "./OverviewTab.module.css";

type Props = {
  data: ReturnType<typeof overview>;
  onOpen: (bill: Bill, key: string) => void;
};

/** What bills cost over time, what's being paid off, and who owes you. */
export function OverviewTab({ data, onOpen }: Props) {
  const top = data.rows[0]?.perMonth ?? 0;
  const splits = data.rows.some((r) => r.note === "your share");
  const past = data.marks.filter((m) => m.mark !== "now" && m.mark !== "none");
  const clean = past.filter((m) => m.mark === "all").length;

  return (
    <>
      <section className={styles.receipt} aria-label="What your bills cost">
        <span className={styles.label}>Your bills cost about</span>
        <span className={`${card.money} ${styles.big}`}>
          {formatShort(Math.round(data.perMonth))}
          <span className={styles.per}> /month</span>
        </span>
        <div className={styles.rule} />
        <span className={`${card.money} ${styles.year}`}>
          {formatShort(Math.round(data.perYear))} A YEAR
        </span>
        <span className={styles.small}>
          {[
            data.yearly.length > 0 &&
              `Includes ${data.yearly.length} yearly ${data.yearly.length === 1 ? "bill" : "bills"}`,
            splits && "only your share of split bills",
          ]
            .filter(Boolean)
            .join(" and ")}
          {(data.yearly.length > 0 || splits) && "."}
        </span>
      </section>

      {data.rows.length > 0 && (
        <section className={styles.card} aria-label="Every month">
          <h2 className={styles.title}>EVERY MONTH</h2>
          {data.rows.map((r) => (
            <div key={r.bill.id} className={styles.costRow}>
              <div className={styles.costLine}>
                <span className={styles.costName}>
                  {r.bill.name}
                  {r.note && <span className={styles.note}> · {r.note}</span>}
                </span>
                <span className={`${card.money} ${styles.costAmount}`}>
                  {formatMoney(r.perMonth)}
                </span>
              </div>
              <div className={styles.bar}>
                <div
                  style={{
                    width: `${Math.max(2, top ? (r.perMonth / top) * 100 : 0)}%`,
                  }}
                />
              </div>
            </div>
          ))}
          {data.yearly.length > 0 && (
            <p className={styles.yearly}>
              Yearly:{" "}
              {data.yearly.map((y, i) => (
                <span key={y.bill.id}>
                  {i > 0 && ", "}
                  {y.bill.name}{" "}
                  <span className={card.money}>{formatShort(y.amount)}</span>
                  {y.month && ` in ${y.month}`}
                </span>
              ))}
              .
            </p>
          )}
        </section>
      )}

      {data.payoffs.length > 0 && (
        <section className={styles.card} aria-label="Paying off">
          <h2 className={styles.title}>PAYING OFF</h2>
          {data.payoffs.map((p) => {
            const all = p.made + p.left;
            return (
              <div key={p.bill.id} className={styles.payoff}>
                <div className={styles.costLine}>
                  <span className={styles.payName}>{p.bill.name}</span>
                  <span className={`${card.money} ${styles.costAmount}`}>
                    {formatShort(p.remaining)} to go
                  </span>
                </div>
                <div
                  className={styles.progress}
                  role="progressbar"
                  aria-label={`${p.bill.name} payments made`}
                  aria-valuemin={0}
                  aria-valuemax={all}
                  aria-valuenow={p.made}
                >
                  <div style={{ width: `${(p.made / all) * 100}%` }} />
                </div>
                <span className={styles.small2}>
                  {p.left} {p.left === 1 ? "payment" : "payments"} left · last
                  one in {monthTitle(p.last)}
                </span>
              </div>
            );
          })}
        </section>
      )}

      {data.owed.length > 0 && (
        <section className={styles.card} aria-label="Owed to you">
          <h2 className={styles.title}>OWED TO YOU</h2>
          {data.owed.map((o) => (
            <button
              key={`${o.bill.id}-${o.key}-${o.payer.id}`}
              type="button"
              className={styles.owed}
              onClick={() => onOpen(o.bill, o.key)}
            >
              <span className={styles.owedWho}>
                {o.payer.name}
                <span className={styles.note}>
                  {" "}
                  · {o.bill.name}, {o.label}
                </span>
              </span>
              <span className={`${card.money} ${styles.owedAmount}`}>
                {formatMoney(o.share)}
              </span>
            </button>
          ))}
        </section>
      )}

      <section className={styles.card} aria-label="Every bill paid">
        <h2 className={styles.title}>EVERY BILL PAID</h2>
        <div className={styles.strip}>
          {data.marks.map((m, i) => (
            <div key={i} className={styles.cell}>
              <span className={`${styles.square} ${styles[m.mark]}`} />
              <span className={styles.tick}>{m.label}</span>
            </div>
          ))}
        </div>
        <span className={styles.small2}>
          {past.length === 0
            ? "Months fill in here as you mark bills paid."
            : `${clean} of the last ${past.length} ${past.length === 1 ? "month" : "months"} had every bill marked paid.`}
        </span>
      </section>
    </>
  );
}
