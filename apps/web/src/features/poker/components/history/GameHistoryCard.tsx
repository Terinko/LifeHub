import { ChevronDown, Trash2 } from "lucide-react";
import {
  formatMoney,
  formatShortMoney,
  formatShortSigned,
  trendOf,
} from "../../lib/money";
import { myNet, potOf, resultsOf } from "../../lib/game";
import { gameDate } from "../../lib/share";
import type { Game } from "../../types";
import { Money } from "../chrome/Money";
import { NoteEditor } from "../notes/NoteEditor";
import card from "../chrome/card.module.css";
import styles from "./GameHistoryCard.module.css";

type Props = {
  game: Game;
  myIds: string[];
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function summary(game: Game, myIds: string[]) {
  const results = resultsOf(game);
  const top = results[0];
  const stakes = `${formatShortMoney(game.buyInAmount)} buy-in · ${plural(results.length, "player")}`;
  if (!top || top.net <= 0)
    return `${stakes} · ${formatShortMoney(potOf(game).dollars)} pot`;
  const who = myIds.includes(top.id) ? "You" : top.name;
  return `${stakes} · ${who} won ${formatShortMoney(top.net)}`;
}

/** One finished game: a summary line, and everyone's result when opened. */
export function GameHistoryCard({
  game,
  myIds,
  expanded,
  onToggle,
  onDelete,
}: Props) {
  const mine = myNet(game, myIds);
  const date = gameDate(game.completedAt ?? game.date);
  const settlements = game.settlements ?? [];

  return (
    <article id={`game-${game.sk}`} className={`${card.card} ${styles.game}`}>
      <div className={styles.head}>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={expanded}
          onClick={onToggle}
        >
          <span className={styles.titles}>
            <span className={styles.date}>{date}</span>
            <span className={styles.summary}>{summary(game, myIds)}</span>
            {!expanded && game.notes && (
              <span className={styles.notePreview}>“{game.notes}”</span>
            )}
          </span>
          {mine !== null && (
            <span
              className={`${card.money} ${card[trendOf(mine)]} ${styles.mine}`}
            >
              You {formatShortSigned(mine)}
            </span>
          )}
          <ChevronDown
            className={styles.chevron}
            size={18}
            strokeWidth={2.2}
            aria-hidden
          />
        </button>
        {expanded && (
          <button
            type="button"
            className={card.round}
            onClick={onDelete}
            aria-label={`Delete the ${date} game`}
          >
            <Trash2 size={18} strokeWidth={2.2} aria-hidden />
          </button>
        )}
      </div>

      {expanded && (
        <>
          <div className={styles.results}>
            {resultsOf(game).map((r) => (
              <div key={r.id} className={styles.result}>
                <span className={styles.name}>
                  {r.name}{" "}
                  <span className={styles.buyIns}>
                    · {plural(r.buyIns, "buy-in")}
                  </span>
                </span>
                <Money value={r.net} size={19} />
              </div>
            ))}
          </div>
          {settlements.length > 0 && (
            <div className={styles.payments}>
              <span className={styles.paymentsTitle}>Payments</span>
              {settlements.map((s) => (
                <span key={`${s.fromId}-${s.toId}`}>
                  {s.from} pays {s.to} <strong>{formatMoney(s.amount)}</strong>
                </span>
              ))}
            </div>
          )}
          <NoteEditor key={game.notes ?? ""} sk={game.sk} notes={game.notes} />
        </>
      )}
    </article>
  );
}
