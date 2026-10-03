import type { HockeyGame } from "@lifehub/shared";
import { shortDate, timeLabel } from "../../lib/dates";
import { resultLabel, sideLabel, sides } from "../../lib/games";
import { isConferenceGame } from "../../lib/record";
import card from "../chrome/card.module.css";
import styles from "./ScheduleList.module.css";

type Props = {
  games: HockeyGame[];
  teamId: string;
  conferenceTeams: string[];
  conferenceLabel: string;
  onOpen: (game: HockeyGame) => void;
};

/** Every game this season: results for played ones, time and TV for the rest. */
export function ScheduleList({
  games,
  teamId,
  conferenceTeams,
  conferenceLabel,
  onOpen,
}: Props) {
  return (
    <ol className={`${card.card} ${styles.list}`}>
      {games.map((game) => {
        const { them, home } = sides(game, teamId);
        const [weekday, date] = shortDate(game.start).split(", ");
        const conf = isConferenceGame(them.name, conferenceTeams);
        const result =
          game.state === "post"
            ? resultLabel(game, teamId)
            : game.state === "in"
              ? `Live · ${game.detail}`
              : [timeLabel(game.start), game.tv[0]].filter(Boolean).join(" · ");
        return (
          <li key={game.id}>
            <button
              type="button"
              className={styles.row}
              onClick={() => onOpen(game)}
              data-state={game.state}
            >
              <span className={styles.date}>
                {weekday}
                <br />
                {date}
              </span>
              <span className={styles.opp}>
                <span className={styles.vs}>
                  {game.neutral ? "vs" : home ? "vs" : "at"}
                </span>
                <span className={styles.name}>{sideLabel(them)}</span>
                {conf && <span className={styles.conf}>{conferenceLabel}</span>}
              </span>
              <span
                className={styles.result}
                data-outcome={game.state === "post" ? result[0] : undefined}
              >
                {result}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
