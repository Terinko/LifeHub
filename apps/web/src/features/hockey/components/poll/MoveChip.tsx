import type { Movement } from "../../lib/poll";
import styles from "./MoveChip.module.css";

const TEXT = {
  new: () => "NEW",
  same: () => "–",
  up: (by: number) => `▲ ${by}`,
  down: (by: number) => `▼ ${by}`,
};

const LABEL = {
  new: () => "Newly ranked",
  same: () => "No change",
  up: (by: number) => `Up ${by}`,
  down: (by: number) => `Down ${by}`,
};

/** ▲ 2 / ▼ 1 / NEW: a team's move since last week's poll. */
export function MoveChip({ move }: { move: Movement }) {
  const by = "by" in move ? move.by : 0;
  return (
    <span
      className={styles.chip}
      data-kind={move.kind}
      aria-label={LABEL[move.kind](by)}
    >
      {TEXT[move.kind](by)}
    </span>
  );
}
