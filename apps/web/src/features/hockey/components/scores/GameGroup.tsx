import type { HockeyGame } from "@lifehub/shared";
import { SectionTitle } from "../chrome/SectionTitle";
import { GameCard } from "./GameCard";
import styles from "./GameGroup.module.css";

type Props = {
  title: string;
  tone: "red" | "blue" | "muted";
  games: HockeyGame[];
  teamId: string;
  onOpen: (game: HockeyGame) => void;
};

export function GameGroup({ title, tone, games, teamId, onOpen }: Props) {
  if (games.length === 0) return null;
  return (
    <section className={styles.group}>
      <SectionTitle tone={tone}>{title}</SectionTitle>
      <div className={styles.grid}>
        {games.map((game) => (
          <GameCard key={game.id} game={game} teamId={teamId} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}
