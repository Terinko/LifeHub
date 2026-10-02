import { useMemo, useState } from "react";
import { Check, Copy, Trophy } from "lucide-react";
import { formatMoney, formatShortMoney } from "../../lib/money";
import { potOf } from "../../lib/game";
import {
  brokenRecords,
  describeRecord,
  nightAwards,
  recapText,
} from "../../lib/recap";
import { gameDate, venmoUrl } from "../../lib/share";
import type { EndGameResult, Game } from "../../types";
import { Money } from "../chrome/Money";
import { Sheet } from "../chrome/Sheet";
import card from "../chrome/card.module.css";
import { NoteEditor } from "../notes/NoteEditor";
import { AwardList } from "./AwardList";
import styles from "./PayoutsSheet.module.css";

type Props = {
  game: Game;
  result: EndGameResult;
  /** Hall of Fame games to check for broken records, when visible. */
  history?: Game[];
  onClose: () => void;
};

/** Right after settling: the night's recap, who pays whom, and sharing. */
export function PayoutsSheet({ game, result, history, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const note = `Poker ${gameDate(game.date)}`;

  const recap = useMemo(() => {
    const settled: Game = {
      ...game,
      status: "COMPLETED",
      players: result.players ?? game.players,
      settlements: result.settlements,
      completedAt: game.completedAt ?? new Date().toISOString(),
    };
    const counts = result.saved && result.countsForStats === true;
    return {
      settled,
      awards: nightAwards(settled),
      records: counts && history ? brokenRecords(history, settled) : [],
    };
  }, [game, result, history]);

  const results = Object.entries(recap.settled.players)
    .map(([id, seat]) => ({ id, name: seat.name, net: seat.net ?? 0 }))
    .sort((a, b) => b.net - a.net);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        recapText(recap.settled, recap.awards, recap.records),
      );
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Sheet title="Tonight's recap" onClose={onClose}>
      <span className={styles.sub}>
        {result.saved
          ? `Saved to history · ${formatShortMoney(potOf(game).dollars)} on the table`
          : "Not saved to history, so this is the only place these numbers show."}
      </span>

      {recap.records.map((r) => (
        <div key={r.key} className={styles.record}>
          <Trophy size={18} strokeWidth={2.4} aria-hidden />
          <span>
            <strong>{r.title}.</strong> {describeRecord(r)}
          </span>
        </div>
      ))}

      {recap.awards.length > 0 && (
        <>
          <h3 className={card.eyebrow}>Tonight's awards</h3>
          <AwardList awards={recap.awards} />
        </>
      )}

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

      {result.saved && <NoteEditor sk={game.sk} notes={game.notes} />}

      <div className={styles.actions}>
        <button type="button" className={card.quiet} onClick={copy}>
          {copied ? (
            <Check size={18} aria-hidden />
          ) : (
            <Copy size={18} aria-hidden />
          )}
          {copied ? "Copied" : "Copy recap"}
        </button>
        <button type="button" className={card.secondary} onClick={onClose}>
          Done
        </button>
      </div>
    </Sheet>
  );
}
