import type { Matchup, Starter } from "@lifehub/shared";
import { ArrowUpRight } from "lucide-react";
import { pairLineups, shortName } from "../../lib/lineup";
import { formatPoints } from "../../lib/points";
import { describeStatus } from "../../lib/status";
import { PositionChip } from "../chrome/PositionChip";
import { Sheet } from "../chrome/Sheet";
import { StatusLine } from "./StatusLine";
import card from "../chrome/card.module.css";
import styles from "./MatchupSheet.module.css";

const STATE_LABEL = { pre: "Later", in: "Live", post: "Final", bye: "Bye" };

function PlayerCell({
  starter,
  side,
}: {
  starter?: Starter;
  side: "mine" | "theirs";
}) {
  if (!starter) return <div className={styles.cell} />;
  return (
    <div className={`${styles.cell} ${styles[side]}`}>
      <PositionChip pos={starter.pos} />
      <div className={styles.who}>
        <span className={styles.player} title={starter.name}>
          {shortName(starter.name)}
        </span>
        <span className={styles.state} data-state={starter.gameState}>
          {starter.team} · {STATE_LABEL[starter.gameState]}
        </span>
      </div>
      <span className={`${card.score} ${styles.points}`}>
        {starter.gameState === "pre" || starter.gameState === "bye"
          ? "–"
          : formatPoints(starter.points)}
      </span>
    </div>
  );
}

/** Both starting lineups, position by position, with who's left to play. */
export function MatchupSheet({
  matchup,
  onClose,
}: {
  matchup: Matchup;
  onClose: () => void;
}) {
  const { me, opp, status } = matchup;
  const described = status && describeStatus(status);
  const rows = pairLineups(me.starters, opp?.starters ?? []);

  return (
    <Sheet title={matchup.league} onClose={onClose}>
      <div className={styles.summary}>
        <div>
          <div className={styles.teamName}>{me.name}</div>
          <div
            className={`${card.score} ${styles.total}`}
            data-tone={described?.tone}
          >
            {formatPoints(me.score)}
          </div>
        </div>
        {opp && (
          <div className={styles.right}>
            <div className={styles.teamName}>{opp.name}</div>
            <div className={`${card.score} ${styles.total}`}>
              {formatPoints(opp.score)}
            </div>
          </div>
        )}
      </div>

      {described && <StatusLine tone={described.tone} text={described.text} />}

      <section className={styles.lineup} aria-label="Starting lineups">
        {rows.map((row, i) => (
          <div key={i} className={styles.row}>
            <PlayerCell starter={row.mine} side="mine" />
            <PlayerCell starter={row.theirs} side="theirs" />
          </div>
        ))}
      </section>

      <a
        className={styles.external}
        href={matchup.url}
        target="_blank"
        rel="noreferrer"
      >
        Open on {matchup.platform === "SLEEPER" ? "Sleeper" : "ESPN"}
        <ArrowUpRight size={16} aria-hidden />
      </a>
    </Sheet>
  );
}
