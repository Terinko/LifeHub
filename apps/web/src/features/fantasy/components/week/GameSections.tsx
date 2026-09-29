import { useState } from "react";
import type { NflGame } from "@lifehub/shared";
import { groupGames } from "../../lib/games";
import { SectionHeading } from "../chrome/SectionHeading";
import { GameCard } from "./GameCard";
import { OtherGames } from "./OtherGames";
import styles from "./GameSections.module.css";

function Toggle({
  open,
  label,
  onClick,
}: {
  open: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={styles.toggle}
      aria-expanded={open}
      onClick={onClick}
    >
      {open ? `Hide ${label}` : `Show ${label}`}
    </button>
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Live games first, then upcoming; finished and no-stake games fold away. */
export function GameSections({ games }: { games: NflGame[] }) {
  const { live, upcoming, finished, other } = groupGames(games);
  const [showFinished, setShowFinished] = useState(false);
  const [showOther, setShowOther] = useState(false);
  const withStakes = live.length + upcoming.length + finished.length;

  if (games.length === 0) {
    return <p className={styles.empty}>No NFL games this week.</p>;
  }

  return (
    <>
      {withStakes > 0 && (
        <SectionHeading
          title="Games with stakes"
          aside={`${withStakes} of ${games.length}`}
        />
      )}
      {[...live, ...upcoming].map((g) => (
        <GameCard key={g.id} game={g} />
      ))}

      {finished.length > 0 && (
        <Toggle
          open={showFinished}
          label={plural(finished.length, "finished game")}
          onClick={() => setShowFinished(!showFinished)}
        />
      )}
      {showFinished && finished.map((g) => <GameCard key={g.id} game={g} />)}

      {other.length > 0 && (
        <Toggle
          open={showOther}
          label={`${plural(other.length, "game")} with no stake`}
          onClick={() => setShowOther(!showOther)}
        />
      )}
      {showOther && <OtherGames games={other} />}
    </>
  );
}
