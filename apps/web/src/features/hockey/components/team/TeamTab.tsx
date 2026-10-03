import {
  HOCKEY_CONFERENCE_NAMES,
  type HockeyGame,
  type HockeyTeamSchedule,
} from "@lifehub/shared";
import { ChevronRight } from "lucide-react";
import { resultLabel, sides } from "../../lib/games";
import { findRow } from "../../lib/poll";
import { records } from "../../lib/record";
import { useNpi, usePoll } from "../../queries";
import card from "../chrome/card.module.css";
import { Notice } from "../chrome/Notice";
import { SectionTitle } from "../chrome/SectionTitle";
import { NextGameCard } from "./NextGameCard";
import { ScheduleList } from "./ScheduleList";
import { StatLeaders } from "./StatLeaders";
import { StatTiles } from "./StatTiles";
import styles from "./TeamTab.module.css";

/** ESPN id; gobobcats.com is the one school stats source we read. */
const QUINNIPIAC = "2514";

type Props = {
  teamId: string;
  schedule: HockeyTeamSchedule | undefined;
  loading: boolean;
  failed: boolean;
  conferenceTeams: string[];
  onOpenGame: (game: HockeyGame) => void;
  onStandings: () => void;
  onChangeTeam: () => void;
  onPoll: () => void;
  onNpi: () => void;
};

/** The followed team's page: record, next game, last result and full schedule. */
export function TeamTab(props: Props) {
  const { teamId, schedule, conferenceTeams, onOpenGame } = props;
  const poll = usePoll();
  const npi = useNpi();
  if (props.loading)
    return <div className={card.skeleton} style={{ height: 480 }} />;
  if (props.failed || !schedule) {
    return <Notice tone="error">Couldn't load this team's schedule.</Notice>;
  }

  const { team, games } = schedule;
  const confName = HOCKEY_CONFERENCE_NAMES[team.conference];
  const record = records(games, teamId, conferenceTeams);
  const pollRow = poll.data?.rows[findRow(poll.data.rows, team.name)];
  const npiRow = npi.data?.rows[findRow(npi.data.rows, team.name)];
  const next = games.find((g) => g.state !== "post");
  const last = [...games].reverse().find((g) => g.state === "post");
  const hasConference = team.conference !== "ind";

  return (
    <div className={styles.tab}>
      <div className={styles.head}>
        <div className={styles.titles}>
          <h2 className={styles.name}>{team.name}</h2>
          <span className={styles.sub}>
            {confName} · {games.length} games
          </span>
        </div>
        <button
          type="button"
          className={styles.change}
          onClick={props.onChangeTeam}
        >
          Change team
        </button>
      </div>

      <StatTiles
        tiles={[
          { value: record.overall, label: "Overall" },
          {
            value: hasConference ? record.conference : "–",
            label: hasConference ? confName : "Conf",
          },
          {
            value: pollRow ? `#${pollRow.rank}` : "NR",
            label: "Poll",
            accent: !!pollRow,
            onClick: props.onPoll,
          },
          {
            value: npiRow ? ordinal(npiRow.rank) : "–",
            label: "NPI",
            accent: !!npiRow,
            onClick: props.onNpi,
          },
        ]}
      />

      {next && <NextGameCard game={next} teamId={teamId} onOpen={onOpenGame} />}

      {last && (
        <button
          type="button"
          className={`${card.card} ${styles.link}`}
          onClick={() => onOpenGame(last)}
        >
          <span className={styles.linkText}>
            <span className={styles.linkLabel}>Last game</span>
            <span className={styles.linkValue}>
              {resultLabel(last, teamId)}{" "}
              {sides(last, teamId).home ? "vs" : "at"}{" "}
              {sides(last, teamId).them.name}
            </span>
          </span>
          <span className={styles.linkAction}>
            Box score <ChevronRight size={16} aria-hidden />
          </span>
        </button>
      )}

      {hasConference && (
        <button
          type="button"
          className={`${card.card} ${styles.link}`}
          onClick={props.onStandings}
        >
          <span className={styles.linkText}>
            <span className={styles.linkLabel}>{confName} standings</span>
            <span className={styles.linkValue}>
              {record.conference} in league play
            </span>
          </span>
          <span className={styles.linkAction}>
            View <ChevronRight size={16} aria-hidden />
          </span>
        </button>
      )}

      {teamId === QUINNIPIAC && <StatLeaders />}

      <SectionTitle>Schedule</SectionTitle>
      {games.length === 0 ? (
        <Notice>No games on the schedule yet.</Notice>
      ) : (
        <ScheduleList
          games={games}
          teamId={teamId}
          conferenceTeams={conferenceTeams}
          conferenceLabel={team.conference === "he" ? "HE" : confName}
          onOpen={onOpenGame}
        />
      )}
    </div>
  );
}

function ordinal(n: number) {
  const s =
    n % 100 >= 11 && n % 100 <= 13
      ? "th"
      : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${s}`;
}
