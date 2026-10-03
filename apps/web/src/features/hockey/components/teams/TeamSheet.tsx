import { useMemo } from "react";
import {
  HOCKEY_CONFERENCE_NAMES,
  sameHockeyTeam,
  type HockeyGame,
} from "@lifehub/shared";
import { records } from "../../lib/record";
import { useTeamSchedule, useTeams } from "../../queries";
import card from "../chrome/card.module.css";
import { Notice } from "../chrome/Notice";
import { SectionTitle } from "../chrome/SectionTitle";
import { Sheet } from "../chrome/Sheet";
import { ScheduleList } from "../team/ScheduleList";
import styles from "./TeamSheet.module.css";

const SHOWN = 5;

type Props = {
  /** The school's name as any source spells it ("UMass", "Mass.-Lowell"). */
  name: string;
  followedId: string;
  onFollow: (id: string) => void;
  onOpenGame: (game: HockeyGame) => void;
  onClose: () => void;
};

/** Any team's record, last few results and next few games. */
export function TeamSheet(props: Props) {
  const { name, followedId, onFollow, onOpenGame, onClose } = props;
  const teams = useTeams();
  const team = teams.data?.find((t) => sameHockeyTeam(t.name, name));
  const schedule = useTeamSchedule(team?.id ?? "", !!team);

  const { recent, upcoming, record } = useMemo(() => {
    const games = schedule.data?.games ?? [];
    const id = team?.id ?? "";
    return {
      recent: games
        .filter((g) => g.state === "post")
        .slice(-SHOWN)
        .reverse(),
      upcoming: games.filter((g) => g.state !== "post").slice(0, SHOWN),
      record: records(games, id).overall,
    };
  }, [schedule.data, team?.id]);

  const title = team?.name ?? name;
  const missing = teams.isError || (teams.isSuccess && !team);

  return (
    <Sheet title={title} onClose={onClose}>
      {missing ? (
        <Notice tone="error">Couldn't find {name}'s schedule.</Notice>
      ) : !team || schedule.isPending ? (
        <div className={card.skeleton} style={{ height: 320 }} />
      ) : schedule.isError ? (
        <Notice tone="error">Couldn't load {title}'s games.</Notice>
      ) : (
        <div className={styles.body}>
          <div className={styles.summary}>
            {team.logo && (
              <img className={styles.logo} src={team.logo} alt="" />
            )}
            <span className={styles.facts}>
              <b className={card.score}>{record}</b>
              <span>{HOCKEY_CONFERENCE_NAMES[team.conference]}</span>
            </span>
            {team.id !== followedId && (
              <button
                type="button"
                className={styles.follow}
                onClick={() => onFollow(team.id)}
              >
                Follow
              </button>
            )}
          </div>

          <SectionTitle tone="red">Coming up</SectionTitle>
          {upcoming.length > 0 ? (
            <ScheduleList
              games={upcoming}
              teamId={team.id}
              conferenceTeams={[]}
              conferenceLabel=""
              onOpen={onOpenGame}
            />
          ) : (
            <Notice>No more games on the schedule.</Notice>
          )}

          <SectionTitle tone="blue">Last results</SectionTitle>
          {recent.length > 0 ? (
            <ScheduleList
              games={recent}
              teamId={team.id}
              conferenceTeams={[]}
              conferenceLabel=""
              onOpen={onOpenGame}
            />
          ) : (
            <Notice>No games played yet.</Notice>
          )}
        </div>
      )}
    </Sheet>
  );
}
