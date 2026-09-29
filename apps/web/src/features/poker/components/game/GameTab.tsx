import { useState } from "react";
import { Plus } from "lucide-react";
import type { Game, Player } from "../../types";
import card from "../chrome/card.module.css";
import { LiveGame } from "./LiveGame";
import { NewGameForm } from "./NewGameForm";
import styles from "./GameTab.module.css";

type Props = {
  players: Player[];
  activeGames: Game[];
  allGames: Game[];
  seated: Set<string>;
  onSettle: (gameSk: string) => void;
};

/** Running games first; the new-game form when nothing is running. */
export function GameTab({
  players,
  activeGames,
  allGames,
  seated,
  onSettle,
}: Props) {
  const [addingAnother, setAddingAnother] = useState(false);
  const showForm = activeGames.length === 0 || addingAnother;

  return (
    <div className={styles.tab}>
      {activeGames.map((game) => (
        <LiveGame
          key={game.sk}
          game={game}
          onSettle={() => onSettle(game.sk)}
        />
      ))}

      {activeGames.length > 0 && !addingAnother && (
        <button
          type="button"
          className={card.quiet}
          onClick={() => setAddingAnother(true)}
        >
          <Plus size={18} strokeWidth={2.4} aria-hidden />
          Start another table
        </button>
      )}

      {showForm && (
        <>
          {activeGames.length > 0 && (
            <h2 className={`${card.eyebrow} ${styles.heading}`}>
              Another table
            </h2>
          )}
          <NewGameForm
            players={players}
            seated={seated}
            games={allGames}
            onStarted={() => setAddingAnother(false)}
          />
        </>
      )}
    </div>
  );
}
