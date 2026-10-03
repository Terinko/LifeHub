import type { HockeyPoll } from "@lifehub/shared";
import { pollRecap, teamLine } from "../../lib/recap";
import card from "../chrome/card.module.css";
import styles from "./PollRecap.module.css";

type Props = {
  poll: HockeyPoll;
  teamName: string | undefined;
  onTeam: (name: string) => void;
};

type Line = { label: string; teams: { team: string; note?: string }[] };

/** The Monday rundown: who moved, who's new, who fell out, and your team. */
export function PollRecap({ poll, teamName, onTeam }: Props) {
  const recap = pollRecap(poll);
  const mine = teamName ? teamLine(poll, teamName) : undefined;
  const lines: Line[] = [
    {
      label: "Rising",
      teams: recap.risers.map((m) => ({ team: m.team, note: `▲${m.by}` })),
    },
    {
      label: "Falling",
      teams: recap.fallers.map((m) => ({ team: m.team, note: `▼${m.by}` })),
    },
    { label: "New", teams: recap.newcomers.map((team) => ({ team })) },
    { label: "Dropped out", teams: recap.droppedOut.map((team) => ({ team })) },
  ].filter((l) => l.teams.length > 0);

  return (
    <section className={`${card.card} ${styles.recap}`} aria-label="Poll recap">
      <h2 className={styles.title}>This week's poll</h2>
      {recap.top && (
        <p className={styles.top}>
          <b>{recap.top.team}</b>{" "}
          {recap.newTop ? "takes over at No. 1" : "stays No. 1"}
          {recap.top.firstPlaceVotes
            ? ` with ${recap.top.firstPlaceVotes} first-place votes`
            : ""}
          .
        </p>
      )}
      {teamName && (
        <p className={styles.mine}>
          <b>{teamName}:</b> {mine ?? "Not ranked this week"}
        </p>
      )}
      {lines.map((line) => (
        <div key={line.label} className={styles.line}>
          <span className={styles.label}>{line.label}</span>
          <span className={styles.chips}>
            {line.teams.map(({ team, note }) => (
              <button
                key={team}
                type="button"
                className={styles.chip}
                data-kind={line.label}
                onClick={() => onTeam(team)}
              >
                {team}
                {note && <span className={styles.note}>{note}</span>}
              </button>
            ))}
          </span>
        </div>
      ))}
    </section>
  );
}
