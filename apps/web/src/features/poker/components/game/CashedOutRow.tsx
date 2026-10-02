import { Undo2 } from "lucide-react";
import { previewNet } from "../../lib/game";
import { formatChips } from "../../lib/money";
import type { Game, Seat } from "../../types";
import { ChipAvatar } from "../chrome/ChipAvatar";
import { Money } from "../chrome/Money";
import styles from "./CashedOutRow.module.css";

type Props = {
  id: string;
  seat: Seat;
  game: Game;
  busy: boolean;
  onUndo: () => void;
};

const leftAt = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

/** Someone who left early: their count and result, locked in. */
export function CashedOutRow({ id, seat, game, busy, onUndo }: Props) {
  const chips = seat.finalChips ?? 0;
  return (
    <div className={styles.row}>
      <ChipAvatar id={id} name={seat.name} />
      <div className={styles.who}>
        <span className={styles.name}>
          {seat.name} <span className={styles.badge}>Cashed out</span>
        </span>
        <span className={styles.detail}>
          {formatChips(chips)} chips
          {seat.cashedOutAt ? ` · left ${leftAt(seat.cashedOutAt)}` : ""}
        </span>
      </div>
      <Money value={previewNet(seat, game, chips)} size={22} />
      <button
        type="button"
        className={styles.undo}
        onClick={onUndo}
        disabled={busy}
        aria-label={`Put ${seat.name} back in the game`}
      >
        <Undo2 size={16} strokeWidth={2.4} aria-hidden />
      </button>
    </div>
  );
}
