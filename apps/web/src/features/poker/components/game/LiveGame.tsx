import { useState } from "react";
import { seatsOf } from "../../lib/game";
import { useBuyIn, useDeleteItem } from "../../queries";
import type { Game } from "../../types";
import { ConfirmSheet } from "../chrome/ConfirmSheet";
import { Notice } from "../chrome/Notice";
import card from "../chrome/card.module.css";
import { BuyInRow } from "./BuyInRow";
import { PotCard } from "./PotCard";
import styles from "./LiveGame.module.css";

type Props = { game: Game; onSettle: () => void };

/** A running game: the pot, everyone's buy-ins and the way to settle up. */
export function LiveGame({ game, onSettle }: Props) {
  const buyIn = useBuyIn();
  const cancel = useDeleteItem();
  const [confirming, setConfirming] = useState(false);

  return (
    <div className={styles.game}>
      <PotCard game={game} onMenu={() => setConfirming(true)} />

      {buyIn.isError && (
        <Notice
          tone="error"
          title="That buy-in didn't save"
          body={`${buyIn.error.message} The numbers above are what's saved.`}
        />
      )}

      <section className={`${card.card} ${styles.seats}`} aria-label="Players">
        {seatsOf(game).map(([id, seat]) => (
          <BuyInRow
            key={id}
            id={id}
            seat={seat}
            buyInAmount={game.buyInAmount}
            onChange={(delta) => buyIn.mutate({ game, playerId: id, delta })}
          />
        ))}
      </section>

      <button type="button" className={card.secondary} onClick={onSettle}>
        Settle up
      </button>

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
