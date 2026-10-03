import { findRow, movement, rankTrend, votesOutside } from "../../lib/poll";
import { usePoll } from "../../queries";
import card from "../chrome/card.module.css";
import { Notice } from "../chrome/Notice";
import { MoveChip } from "./MoveChip";
import { RankTrend } from "./RankTrend";
import styles from "./PollTab.module.css";

/** The USCHO Top 20, with the followed team's season charted on top. */
export function PollTab({ teamName }: { teamName: string | undefined }) {
  const poll = usePoll();
  if (poll.isPending)
    return <div className={card.skeleton} style={{ height: 420 }} />;
  if (poll.isError)
    return <Notice tone="error">Couldn't load the poll.</Notice>;

  const { rows, others, through } = poll.data;
  const mineAt = teamName ? findRow(rows, teamName) : -1;
  const mine = rows[mineAt];
  const outside = teamName ? votesOutside(poll.data, teamName) : undefined;

  return (
    <div className={styles.tab}>
      <p className={styles.through}>
        USCHO.com poll · {through.replace(/^Through Games\s*/i, "through ")}
      </p>
      {teamName && (
        <section
          className={`${card.card} ${styles.mine}`}
          aria-label={`${teamName} in the poll`}
        >
          <div className={styles.mineHead}>
            <span className={`${card.score} ${styles.mineRank}`}>
              {mine ? mine.rank : "NR"}
            </span>
            <span className={styles.mineText}>
              <b>{teamName}</b>
              <span>
                {mine
                  ? `${mine.points} points${mine.firstPlaceVotes ? ` · ${mine.firstPlaceVotes} first-place` : ""}`
                  : outside
                    ? `Receiving ${outside} points`
                    : "Not ranked this week"}
              </span>
            </span>
            {mine && <MoveChip move={movement(mine)} />}
          </div>
          <RankTrend points={rankTrend(poll.data, teamName)} team={teamName} />
          <span className={styles.hint}>
            A point is added each week a new poll comes out.
          </span>
        </section>
      )}

      <ol className={`${card.card} ${styles.list}`}>
        {rows.map((row, i) => (
          <li
            key={row.team}
            className={styles.row}
            data-mine={i === mineAt || undefined}
          >
            <span className={`${card.score} ${styles.rank}`}>{row.rank}</span>
            <span className={styles.team}>
              <span className={styles.name}>{row.team}</span>
              <span className={styles.points}>
                {row.points} pts
                {row.firstPlaceVotes
                  ? ` · ${row.firstPlaceVotes} first`
                  : ""} · {row.record}
              </span>
            </span>
            <MoveChip move={movement(row)} />
          </li>
        ))}
      </ol>
      {others.length > 0 && (
        <p className={styles.others}>
          <b>Also receiving votes:</b>{" "}
          {others.map((o) => `${o.team} ${o.points}`).join(", ")}
        </p>
      )}
    </div>
  );
}
