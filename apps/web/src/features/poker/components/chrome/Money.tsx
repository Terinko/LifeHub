import { formatSigned, trendOf } from "../../lib/money";
import card from "./card.module.css";

type Props = { value: number; size?: number; className?: string };

/** A signed amount, "+$20.00" in cyan or "−$25.00" in amber. */
export function Money({ value, size = 20, className = "" }: Props) {
  return (
    <span
      className={`${card.money} ${card[trendOf(value)]} ${className}`}
      style={{ fontSize: size }}
    >
      {formatSigned(value)}
    </span>
  );
}
