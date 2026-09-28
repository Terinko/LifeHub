import type { LinkedLeague } from "@lifehub/shared";
import { Ellipsis } from "lucide-react";
import { leagueDetail, leagueMonogram, leagueTitle } from "../../lib/leagues";
import card from "../chrome/card.module.css";
import styles from "./LeagueRow.module.css";

type Props = { league: LinkedLeague; onManage: () => void };

export function LeagueRow({ league, onManage }: Props) {
  const title = leagueTitle(league);
  return (
    <article className={`${card.card} ${styles.row}`}>
      <span className={styles.tile} data-platform={league.platform} aria-hidden>
        {leagueMonogram(league)}
      </span>
      <div className={styles.text}>
        <span className={styles.title}>{title}</span>
        <span className={styles.detail}>{leagueDetail(league)}</span>
      </div>
      <button
        type="button"
        className={styles.more}
        onClick={onManage}
        aria-label={`Manage ${title}`}
      >
        <Ellipsis size={20} aria-hidden />
      </button>
    </article>
  );
}
