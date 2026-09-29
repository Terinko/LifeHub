import { Minus, Plus } from "lucide-react";
import { formatShortMoney } from "../../lib/money";
import type { Seat } from "../../types";
import { ChipAvatar } from "../chrome/ChipAvatar";
import card from "../chrome/card.module.css";
import styles from "./BuyInRow.module.css";

type Props = {
  id: string;
  seat: Seat;
  buyInAmount: number;
  onChange: (delta: 1 | -1) => void;
};

/**
 * One player at the table. Adding a buy-in is the big button; taking one
 * back is small so it's hard to hit by accident, and off at 1.
 */
export function BuyInRow({ id, seat, buyInAmount, onChange }: Props) {
  const plural = seat.buyIns === 1 ? "buy-in" : "buy-ins";
  return (
    <div className={styles.row}>
      <ChipAvatar id={id} name={seat.name} />
      <div className={styles.who}>
        <span className={styles.name}>{seat.name}</span>
        <span className={styles.paid}>
          {formatShortMoney(seat.buyIns * buyInAmount)} in
        </span>
      </div>
      <button
        type="button"
        className={styles.minus}
        onClick={() => onChange(-1)}
        disabled={seat.buyIns <= 1}
        aria-label={`Take a buy-in back from ${seat.name}`}
      >
        <Minus size={16} strokeWidth={2.4} aria-hidden />
      </button>
      <span
        className={`${card.money} ${styles.count}`}
        aria-label={`${seat.buyIns} ${plural}`}
      >
        {seat.buyIns}
      </span>
      <button
        type="button"
        className={styles.plus}
        onClick={() => onChange(1)}
        aria-label={`Add a buy-in for ${seat.name}`}
      >
        <Plus size={16} strokeWidth={2.6} aria-hidden />1
      </button>
    </div>
  );
}
