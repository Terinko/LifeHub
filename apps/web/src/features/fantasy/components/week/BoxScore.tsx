import type { NflGame } from "@lifehub/shared";
import { statLine } from "../../lib/boxScore";
import { useBoxScore } from "../../queries";
import styles from "./BoxScore.module.css";

/** Today's stat lines for the players you care about in this game. */
export function BoxScore({ game }: { game: NflGame }) {
  const box = useBoxScore(game.id, game.state === "in");

  if (game.state === "pre")
    return <p className={styles.note}>Stats show up at kickoff.</p>;
  if (box.isPending) return <p className={styles.note}>Loading stats…</p>;
  if (box.isError)
    return <p className={styles.note}>Couldn't load stats for this game.</p>;

  const rows = [...game.rootFor, ...game.rootAgainst].flatMap((p) => {
    const line = statLine(box.data, p.name);
    return line ? [{ name: p.name, line }] : [];
  });
  if (rows.length === 0)
    return <p className={styles.note}>No stats for your players yet.</p>;

  return (
    <dl className={styles.list}>
      {rows.map((r) => (
        <div key={r.name} className={styles.row}>
          <dt className={styles.name}>{r.name}</dt>
          <dd className={styles.line}>{r.line}</dd>
        </div>
      ))}
    </dl>
  );
}
