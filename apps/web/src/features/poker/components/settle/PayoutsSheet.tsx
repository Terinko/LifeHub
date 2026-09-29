import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { formatMoney, formatShortMoney } from "../../lib/money";
import { potOf } from "../../lib/game";
import { gameDate, payoutText, venmoUrl } from "../../lib/share";
import type { EndGameResult, Game } from "../../types";
import { Money } from "../chrome/Money";
import { Sheet } from "../chrome/Sheet";
import card from "../chrome/card.module.css";
import styles from "./PayoutsSheet.module.css";

type Props = { game: Game; result: EndGameResult; onClose: () => void };

/** Right after settling: who pays whom, everyone's result, and sharing. */
export function PayoutsSheet({ game, result, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const note = `Poker ${gameDate(game.date)}`;
  const results = Object.entries(result.players ?? {})
    .map(([id, seat]) => ({ id, name: seat.name, net: seat.net ?? 0 }))
    .sort((a, b) => b.net - a.net);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        payoutText(game.date, result.settlements),
      );
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Sheet title="Settled" onClose={onClose}>
      <span className={styles.sub}>
        {result.saved
          ? `Saved to history · ${formatShortMoney(potOf(game).dollars)} pot`
          : "Not saved to history, so this is the only place these numbers show."}
      </span>

      <h3 className={card.eyebrow}>Who pays whom</h3>
      {result.settlements.length === 0 ? (
        <p className={styles.even}>
          Everyone broke even. Nobody owes anything.
        </p>
      ) : (
        <div className={styles.payments}>
          {result.settlements.map((s) => (
            <div key={`${s.fromId}-${s.toId}`} className={styles.payment}>
              <span className={styles.who}>
                {s.from} <span className={styles.pays}>pays</span> {s.to}
              </span>
              <span className={`${card.money} ${styles.amount}`}>
                {formatMoney(s.amount)}
              </span>
              <a
                className={styles.venmo}
                href={venmoUrl(s.amount, note)}
                target="_blank"
                rel="noreferrer"
                aria-label={`Pay ${formatMoney(s.amount)} in Venmo`}
              >
                Venmo
              </a>
            </div>
          ))}
        </div>
      )}

      {results.length > 0 && (
        <>
          <h3 className={card.eyebrow}>Results</h3>
          <div className={`${card.card} ${styles.results}`}>
            {results.map((r) => (
              <div key={r.id} className={styles.result}>
                <span>{r.name}</span>
                <Money value={r.net} />
              </div>
            ))}
          </div>
        </>
      )}

      <div className={styles.actions}>
        <button type="button" className={card.quiet} onClick={copy}>
          {copied ? (
            <Check size={18} aria-hidden />
          ) : (
            <Copy size={18} aria-hidden />
          )}
          {copied ? "Copied" : "Copy for group chat"}
        </button>
        <button type="button" className={card.secondary} onClick={onClose}>
          Done
        </button>
      </div>
    </Sheet>
  );
}
