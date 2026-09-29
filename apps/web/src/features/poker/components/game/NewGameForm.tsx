import { useState, type FormEvent } from "react";
import { formatShortMoney } from "../../lib/money";
import { lastSetup } from "../../lib/game";
import { useStartGame } from "../../queries";
import type { Game, Player, Seat } from "../../types";
import { Notice } from "../chrome/Notice";
import card from "../chrome/card.module.css";
import { PlayerPicker } from "./PlayerPicker";
import styles from "./NewGameForm.module.css";

type Props = {
  players: Player[];
  /** Players already at another running table. */
  seated: Set<string>;
  /** Every game, to start from the last one's stakes and players. */
  games: Game[];
  onStarted?: () => void;
};

const readAmount = (text: string) => {
  const n = Number(text.replace(/[$,\s]/g, ""));
  return text.trim() !== "" && Number.isFinite(n) && n > 0 ? n : null;
};

/** Stakes and who's playing, filled in from the last game. */
export function NewGameForm({ players, seated, games, onStarted }: Props) {
  const last = lastSetup(games);
  const available = (id: string) =>
    !seated.has(id) && players.some((p) => p.sk === id);
  const lastPlayers = (last?.playerIds ?? []).filter(available);

  const [buyIn, setBuyIn] = useState(String(last?.buyIn ?? 10));
  const [chips, setChips] = useState(String(last?.chips ?? 10000));
  const [picked, setPicked] = useState<string[]>(lastPlayers);
  const [problem, setProblem] = useState<string | null>(null);
  const start = useStartGame();

  const seats = picked.filter(available);
  const buyInAmount = readAmount(buyIn);
  const chipsPerBuyIn = readAmount(chips);
  const pot = buyInAmount ? buyInAmount * seats.length : 0;

  const toggle = (id: string) =>
    setPicked((list) =>
      list.includes(id) ? list.filter((x) => x !== id) : [...list, id],
    );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setProblem(null);
    if (!buyInAmount) return setProblem("Enter a buy-in above $0.");
    if (!chipsPerBuyIn || !Number.isInteger(chipsPerBuyIn))
      return setProblem("Enter how many chips each buy-in gets.");
    if (seats.length < 2) return setProblem("Pick at least 2 players.");
    const table: Record<string, Seat> = {};
    for (const id of seats) {
      const name = players.find((p) => p.sk === id)?.name ?? "Player";
      table[id] = { name, buyIns: 1, finalChips: null };
    }
    start.mutate(
      { buyInAmount, chipsPerBuyIn, players: table },
      { onSuccess: () => onStarted?.() },
    );
  };

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <section className={`${card.card} ${styles.section}`}>
        <div className={styles.heading}>
          <h2 className={card.eyebrow}>Stakes</h2>
          {last && <span className={card.hint}>Same as last game</span>}
        </div>
        <div className={styles.stakes}>
          <label className={styles.stake}>
            <span className={card.label}>Buy-in ($)</span>
            <input
              className={card.field}
              inputMode="decimal"
              value={buyIn}
              onChange={(e) => setBuyIn(e.target.value)}
            />
          </label>
          <label className={styles.stake}>
            <span className={card.label}>Chips per buy-in</span>
            <input
              className={card.field}
              inputMode="numeric"
              value={chips}
              onChange={(e) => setChips(e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className={`${card.card} ${styles.section}`}>
        <div className={styles.heading}>
          <h2 className={card.eyebrow}>Who's playing</h2>
          {lastPlayers.length > 0 && (
            <button
              type="button"
              className={styles.again}
              onClick={() => setPicked(lastPlayers)}
            >
              Last game's players
            </button>
          )}
        </div>
        <PlayerPicker
          players={players}
          picked={seats}
          seated={seated}
          onToggle={toggle}
        />
      </section>

      {(problem || start.error) && (
        <Notice
          tone="error"
          title="Couldn't start the game"
          body={problem ?? start.error?.message}
        />
      )}

      <button type="submit" className={card.primary} disabled={start.isPending}>
        {start.isPending
          ? "Starting…"
          : seats.length >= 2 && pot > 0
            ? `Start game · ${seats.length} players · ${formatShortMoney(pot)} pot`
            : "Start game"}
      </button>
    </form>
  );
}
