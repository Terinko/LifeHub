import { useState } from "react";
import { previewNet, tableOf } from "../../lib/game";
import { formatChips, parseChips } from "../../lib/money";
import { useCashOut } from "../../queries";
import type { Game } from "../../types";
import { ChipAvatar } from "../chrome/ChipAvatar";
import { Money } from "../chrome/Money";
import { Notice } from "../chrome/Notice";
import { Sheet } from "../chrome/Sheet";
import card from "../chrome/card.module.css";
import styles from "./CashOutSheet.module.css";

type Props = { game: Game; onClose: () => void };

/**
 * Someone's leaving: pick them, count what they're taking, and lock it in.
 * Settling later only needs the people still playing.
 */
export function CashOutSheet({ game, onClose }: Props) {
  const { playing } = tableOf(game);
  const [picked, setPicked] = useState<string | null>(null);
  const [chips, setChips] = useState<number | null>(null);
  const cashOut = useCashOut();
  const seat = picked ? game.players[picked] : undefined;

  const confirm = () => {
    if (!picked || chips === null) return;
    cashOut.mutate({ sk: game.sk, id: picked, chips }, { onSuccess: onClose });
  };

  return (
    <Sheet title="Cash someone out" onClose={onClose}>
      <div className={styles.section}>
        <h3 className={card.eyebrow}>Who's leaving?</h3>
        <div className={styles.pills} role="group" aria-label="Players">
          {playing.map(([id, s]) => (
            <button
              key={id}
              type="button"
              className={styles.pill}
              aria-pressed={picked === id}
              onClick={() => setPicked(id)}
            >
              <ChipAvatar id={id} name={s.name} size="sm" />
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {seat && (
        <div className={styles.count}>
          <label className={styles.field}>
            <span className={card.label}>
              Chips {seat.name} is leaving with
            </span>
            <input
              className={card.field}
              inputMode="numeric"
              autoComplete="off"
              placeholder="Chips"
              value={chips === null ? "" : formatChips(chips)}
              onChange={(e) => setChips(parseChips(e.target.value))}
            />
          </label>
          <span className={styles.net}>
            {chips === null ? (
              <span className={card.hint}>Not yet</span>
            ) : (
              <Money value={previewNet(seat, game, chips)} size={26} />
            )}
          </span>
        </div>
      )}

      {cashOut.error && (
        <Notice
          tone="error"
          title="Couldn't cash them out"
          body={cashOut.error.message}
        />
      )}

      <button
        type="button"
        className={card.primary}
        disabled={!seat || chips === null || cashOut.isPending}
        onClick={confirm}
      >
        {cashOut.isPending
          ? "Saving…"
          : seat
            ? `Cash out ${seat.name}`
            : "Pick who's leaving"}
      </button>
    </Sheet>
  );
}
