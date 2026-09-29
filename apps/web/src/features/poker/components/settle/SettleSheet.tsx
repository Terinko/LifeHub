import { useState } from "react";
import { chipCheck, previewNet, seatsOf } from "../../lib/game";
import { useEndGame, useSaveChips } from "../../queries";
import type { EndGameResult, Game } from "../../types";
import { Notice } from "../chrome/Notice";
import { Sheet } from "../chrome/Sheet";
import card from "../chrome/card.module.css";
import { ChipTotal } from "./ChipTotal";
import { CountRow } from "./CountRow";
import styles from "./SettleSheet.module.css";

type Props = {
  game: Game;
  /** Whether this user can put games in the shared Hall of Fame. */
  canCountStats: boolean;
  onClose: () => void;
  onSettled: (result: EndGameResult) => void;
};

/**
 * Count everyone's chips. Each result updates as you type, and settling
 * stays off until the chips add up to what was bought in.
 */
export function SettleSheet({
  game,
  canCountStats,
  onClose,
  onSettled,
}: Props) {
  const seats = seatsOf(game);
  const [counts, setCounts] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(seats.map(([id, s]) => [id, s.finalChips ?? null])),
  );
  const [saveToHistory, setSaveToHistory] = useState(true);
  const [includeInStats, setIncludeInStats] = useState(true);
  const saveChips = useSaveChips();
  const end = useEndGame();

  const check = chipCheck(game, counts);
  const uncounted = seats.filter(([id]) => (counts[id] ?? null) === null);

  const settle = () => {
    const finalChips: Record<string, number> = {};
    for (const [id, chips] of Object.entries(counts))
      if (chips !== null) finalChips[id] = chips;
    end.mutate(
      { sk: game.sk, finalChips, saveToHistory, includeInStats },
      { onSuccess: onSettled },
    );
  };

  return (
    <Sheet title="Count chips" onClose={onClose}>
      <ChipTotal counted={check.counted} expected={check.expected} />

      <div className={styles.rows}>
        {seats.map(([id, seat]) => (
          <CountRow
            key={id}
            id={id}
            seat={seat}
            value={counts[id] ?? null}
            net={previewNet(seat, game, counts[id] ?? null)}
            onChange={(chips) => setCounts((c) => ({ ...c, [id]: chips }))}
            // Saved as you go so anyone else looking sees the counts too;
            // settling sends the counts on this screen either way.
            onDone={() =>
              saveChips.mutate({ sk: game.sk, id, chips: counts[id] ?? null })
            }
          />
        ))}
      </div>

      <div className={styles.options}>
        <label className={styles.option}>
          Save to history
          <input
            type="checkbox"
            checked={saveToHistory}
            onChange={(e) => setSaveToHistory(e.target.checked)}
          />
        </label>
        {canCountStats && saveToHistory && (
          <label className={styles.option}>
            Count toward the Hall of Fame
            <input
              type="checkbox"
              checked={includeInStats}
              onChange={(e) => setIncludeInStats(e.target.checked)}
            />
          </label>
        )}
        {!saveToHistory && (
          <span className={card.hint}>
            You'll still see who pays whom, but nothing is recorded.
          </span>
        )}
      </div>

      {end.error && (
        <Notice tone="error" title="Couldn't settle" body={end.error.message} />
      )}

      {!check.balanced && (
        <p className={styles.why}>
          {uncounted.length > 0
            ? `Count ${uncounted.map(([, s]) => s.name).join(", ")} to finish. `
            : ""}
          The total has to match the chips bought in.
        </p>
      )}

      <button
        type="button"
        className={card.primary}
        disabled={!check.balanced || end.isPending}
        onClick={settle}
      >
        {end.isPending ? "Settling…" : "Settle up"}
      </button>
    </Sheet>
  );
}
