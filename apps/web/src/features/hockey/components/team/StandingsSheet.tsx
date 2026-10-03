import { useState } from "react";
import {
  HOCKEY_CONFERENCE_NAMES,
  HOCKEY_CONFERENCES,
  sameHockeyTeam,
  type HockeyConference,
} from "@lifehub/shared";
import { useStandings } from "../../queries";
import card from "../chrome/card.module.css";
import { Notice } from "../chrome/Notice";
import { Sheet } from "../chrome/Sheet";
import styles from "./StandingsSheet.module.css";

type Props = {
  initial: HockeyConference;
  teamName: string | undefined;
  onTeam: (name: string) => void;
  onClose: () => void;
};

/** Conference standings, any of the six, on a glass sheet. */
export function StandingsSheet({ initial, teamName, onTeam, onClose }: Props) {
  const [conference, setConference] = useState(initial);
  const standings = useStandings(conference);
  const rows = standings.data?.rows ?? [];
  const unplayed = rows.length > 0 && rows.every((r) => r.gamesPlayed === 0);

  return (
    <Sheet title="Standings" onClose={onClose}>
      <div className={styles.chips} role="tablist" aria-label="Conference">
        {HOCKEY_CONFERENCES.map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={c === conference}
            className={styles.chip}
            onClick={() => setConference(c)}
          >
            {HOCKEY_CONFERENCE_NAMES[c]}
          </button>
        ))}
      </div>
      {standings.isPending ? (
        <div className={card.skeleton} style={{ height: 300 }} />
      ) : standings.isError ? (
        <Notice tone="error">Couldn't load standings.</Notice>
      ) : (
        <>
          {unplayed && (
            <Notice>
              League play hasn't started yet, so every team is level.
            </Notice>
          )}
          <div className={`${card.card} ${styles.table}`}>
            <div className={styles.head} aria-hidden>
              <span />
              <span>Team</span>
              <span>Pts</span>
              <span>W-L-T</span>
              <span>GF-GA</span>
            </div>
            <ol className={styles.list}>
              {rows.map((row) => (
                <li key={row.team}>
                  <button
                    type="button"
                    className={`${card.rowButton} ${styles.row}`}
                    data-mine={
                      (teamName && sameHockeyTeam(row.team, teamName)) ||
                      undefined
                    }
                    onClick={() => onTeam(row.team)}
                  >
                    <span className={`${card.score} ${styles.rank}`}>
                      {row.rank}
                    </span>
                    <span className={styles.name}>{row.team}</span>
                    <span className={styles.pts}>{row.points}</span>
                    <span>{row.record}</span>
                    <span className={styles.dim}>{row.goals}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
          <p className={styles.source}>
            Conference games only. Source: College Hockey News.
          </p>
        </>
      )}
    </Sheet>
  );
}
