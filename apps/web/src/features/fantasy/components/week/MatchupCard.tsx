import type { Matchup } from "@lifehub/shared";
import { ChevronRight } from "lucide-react";
import { formatPoints } from "../../lib/points";
import { describeStatus } from "../../lib/status";
import { PlatformBadge } from "./PlatformBadge";
import { Scoreboard } from "./Scoreboard";
import { StatusLine } from "./StatusLine";
import card from "../chrome/card.module.css";
import styles from "./MatchupCard.module.css";

const NO_OPPONENT = {
  bye: "Bye week. No opponent this week.",
  notStarted: "No matchups yet. The league may still be drafting.",
};

type Props = { matchup: Matchup; onOpen: () => void };

export function MatchupCard({ matchup, onOpen }: Props) {
  const { me, opp, status } = matchup;
  const described = status ? describeStatus(status) : null;

  return (
    <button
      type="button"
      className={`${card.card} ${styles.card}`}
      onClick={onOpen}
      aria-label={`${matchup.league}: open matchup`}
    >
      <div className={styles.top}>
        <PlatformBadge platform={matchup.platform} />
        <span className={styles.league}>{matchup.league}</span>
        <ChevronRight size={18} className={styles.chevron} aria-hidden />
      </div>

      {opp ? (
        <Scoreboard me={me} opp={opp} tone={described?.tone ?? "neutral"} />
      ) : (
        <div className={styles.solo}>
          <span className={styles.team}>{me.name}</span>
          <span className={styles.note}>
            {matchup.kind === "matchup" ? "" : NO_OPPONENT[matchup.kind]}
          </span>
          {matchup.kind === "bye" && me.score > 0 && (
            <span className={card.score}>{formatPoints(me.score)}</span>
          )}
        </div>
      )}

      {described && <StatusLine tone={described.tone} text={described.text} />}
    </button>
  );
}
