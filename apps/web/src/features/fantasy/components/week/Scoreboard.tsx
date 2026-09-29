import type { TeamSide } from "@lifehub/shared";
import { initials } from "../../lib/lineup";
import { formatPoints } from "../../lib/points";
import type { Tone } from "../../lib/status";
import card from "../chrome/card.module.css";
import styles from "./Scoreboard.module.css";

type Props = { me: TeamSide; opp: TeamSide; tone: Tone };

function Side({
  team,
  you,
  tone,
}: {
  team: TeamSide;
  you?: boolean;
  tone?: Tone;
}) {
  return (
    <div className={you ? styles.side : `${styles.side} ${styles.right}`}>
      <div className={styles.name}>
        <span className={you ? styles.avatarMine : styles.avatar} aria-hidden>
          {initials(team.name)}
        </span>
        <span className={styles.teamName}>{team.name}</span>
      </div>
      <span className={styles.record}>
        {team.record}
        {you ? " · You" : ""}
      </span>
      <span className={`${card.score} ${styles.score}`} data-tone={tone}>
        {formatPoints(team.score)}
      </span>
    </div>
  );
}

/** The big side-by-side score, with a bar showing each side's share. */
export function Scoreboard({ me, opp, tone }: Props) {
  const total = me.score + opp.score;
  const share = total > 0 ? Math.round((me.score / total) * 100) : 50;
  return (
    <>
      <div className={styles.board}>
        <Side team={me} you tone={tone} />
        <span className={styles.vs}>VS</span>
        <Side team={opp} />
      </div>
      <div className={styles.bar} aria-hidden>
        <span
          className={styles.mine}
          data-tone={tone}
          style={{ flexGrow: share }}
        />
        <span className={styles.theirs} style={{ flexGrow: 100 - share }} />
      </div>
    </>
  );
}
