import type { Position } from "@lifehub/shared";
import styles from "./PositionChip.module.css";

const LABEL: Record<Position, string> = {
  QB: "QB",
  RB: "RB",
  WR: "WR",
  TE: "TE",
  K: "K",
  DEF: "DEF",
  OTHER: "FLX",
};

export function PositionChip({ pos }: { pos: Position }) {
  return (
    <span className={`${styles.chip} ${styles[pos.toLowerCase()]}`}>
      {LABEL[pos]}
    </span>
  );
}
