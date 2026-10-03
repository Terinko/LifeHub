import type { HockeyGame, HockeyTeamOption } from "@lifehub/shared";
import { groupGames, involves } from "../../lib/games";
import { useScores } from "../../queries";
import card from "../chrome/card.module.css";
import { Notice } from "../chrome/Notice";
import { DayStepper } from "./DayStepper";
import { GameGroup } from "./GameGroup";
import { TeamHero } from "./TeamHero";
import styles from "./ScoresTab.module.css";

type Props = {
  date: string;
  onDateChange: (date: string) => void;
  teamId: string;
  team: HockeyTeamOption | undefined;
  nextGame: HockeyGame | undefined;
  onOpenGame: (game: HockeyGame) => void;
  onTeam: () => void;
};

export function ScoresTab({
  date,
  onDateChange,
  teamId,
  team,
  nextGame,
  onOpenGame,
  onTeam,
}: Props) {
  const scores = useScores(date);
  const games = scores.data?.games ?? [];
  const mine = games.find((g) => involves(g, teamId));
  const others = games.filter((g) => g !== mine);
  const { live, upcoming, final } = groupGames(others);

  return (
    <div className={styles.tab}>
      <DayStepper date={date} onChange={onDateChange} />
      {scores.isPending ? (
        <>
          <div className={card.skeleton} style={{ height: 180 }} />
          <div className={card.skeleton} style={{ height: 120 }} />
        </>
      ) : scores.isError ? (
        <Notice tone="error">
          Couldn't load scores. Tap refresh to try again.
        </Notice>
      ) : (
        <>
          <TeamHero
            team={team}
            teamId={teamId}
            game={mine}
            next={nextGame}
            onOpen={onOpenGame}
            onTeam={onTeam}
          />
          {others.length === 0 && <Notice>No other D-I games this day.</Notice>}
          <GameGroup
            title="Live"
            tone="red"
            games={live}
            teamId={teamId}
            onOpen={onOpenGame}
          />
          <GameGroup
            title="Upcoming"
            tone="muted"
            games={upcoming}
            teamId={teamId}
            onOpen={onOpenGame}
          />
          <GameGroup
            title="Final"
            tone="blue"
            games={final}
            teamId={teamId}
            onOpen={onOpenGame}
          />
        </>
      )}
    </div>
  );
}
