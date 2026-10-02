import { useCallback, useState } from "react";
import { DoorOpen } from "lucide-react";
import { tableOf } from "../../lib/game";
import { useBuyIn, useDeleteItem, useUndoCashOut } from "../../queries";
import type { Game } from "../../types";
import { ConfirmSheet } from "../chrome/ConfirmSheet";
import { Notice } from "../chrome/Notice";
import { UndoToast } from "../chrome/UndoToast";
import card from "../chrome/card.module.css";
import { BuyInRow } from "./BuyInRow";
import { CashedOutRow } from "./CashedOutRow";
import { CashOutSheet } from "./CashOutSheet";
import { PotCard } from "./PotCard";
import styles from "./LiveGame.module.css";

type Props = { game: Game; onSettle: () => void };

type Added = { id: string; name: string; at: number };

/** A running game: the pot, everyone's buy-ins and the way to settle up. */
export function LiveGame({ game, onSettle }: Props) {
  const buyIn = useBuyIn();
  const cancel = useDeleteItem();
  const undoCashOut = useUndoCashOut();
  const [confirming, setConfirming] = useState(false);
  const [cashingOut, setCashingOut] = useState(false);
  const [added, setAdded] = useState<Added | null>(null);
  const clearAdded = useCallback(() => setAdded(null), []);
  const { playing, cashedOut } = tableOf(game);
  const error = buyIn.error ?? undoCashOut.error;

  const change = (id: string, name: string, delta: 1 | -1) => {
    buyIn.mutate({ game, playerId: id, delta });
    // `at` only has to change per tap, so the toast's timer restarts.
    setAdded((prev) =>
      delta === 1 ? { id, name, at: (prev?.at ?? 0) + 1 } : null,
    );
  };

  return (
    <div className={styles.game}>
      <PotCard game={game} onMenu={() => setConfirming(true)} />

      {error && (
        <Notice
          tone="error"
          title="That change didn't save"
          body={`${error.message} The numbers above are what's saved.`}
        />
      )}

      <section className={`${card.card} ${styles.seats}`} aria-label="Players">
        {playing.map(([id, seat]) => (
          <BuyInRow
            key={id}
            id={id}
            seat={seat}
            buyInAmount={game.buyInAmount}
            onChange={(delta) => change(id, seat.name, delta)}
          />
        ))}
        {cashedOut.map(([id, seat]) => (
          <CashedOutRow
            key={id}
            id={id}
            seat={seat}
            game={game}
            busy={undoCashOut.isPending}
            onUndo={() => undoCashOut.mutate({ sk: game.sk, id })}
          />
        ))}
      </section>

      {playing.length > 0 && (
        <button
          type="button"
          className={card.quiet}
          onClick={() => setCashingOut(true)}
        >
          <DoorOpen size={18} strokeWidth={2.2} aria-hidden />
          Cash someone out
        </button>
      )}

      <button type="button" className={card.secondary} onClick={onSettle}>
        {cashedOut.length > 0 && playing.length > 0
          ? `Settle up · ${playing.length} still playing`
          : "Settle up"}
      </button>

      {added && (
        <UndoToast
          key={added.at}
          message={`Added a buy-in for ${added.name}`}
          onUndo={() => {
            buyIn.mutate({ game, playerId: added.id, delta: -1 });
            setAdded(null);
          }}
          onDone={clearAdded}
        />
      )}

      {cashingOut && (
        <CashOutSheet game={game} onClose={() => setCashingOut(false)} />
      )}

      {confirming && (
        <ConfirmSheet
          title="Cancel this game?"
          body="Nothing from it will be saved. Use this for a game started by mistake."
          confirmLabel="Cancel game"
          busy={cancel.isPending}
          error={cancel.error?.message}
          onConfirm={() =>
            cancel.mutate(game.sk, { onSuccess: () => setConfirming(false) })
          }
          onClose={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
