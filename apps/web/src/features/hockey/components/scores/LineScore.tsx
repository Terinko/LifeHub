import type { HockeyGame } from "@lifehub/shared";
import { periodLabel } from "../../lib/games";
import card from "../chrome/card.module.css";
import styles from "./LineScore.module.css";

/** Goals by period for both teams, OT columns included when played. */
export function LineScore({
  game,
  teamId,
}: {
  game: HockeyGame;
  teamId: string;
}) {
  const periods = Math.max(
    3,
    game.away.periods.length,
    game.home.periods.length,
  );
  const cols = Array.from({ length: periods }, (_, i) => i);
  const sides = [game.away, game.home];
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th scope="col" className={styles.teamCol} aria-label="Team" />
          {cols.map((i) => (
            <th key={i} scope="col">
              {periodLabel(i)}
            </th>
          ))}
          <th scope="col">T</th>
        </tr>
      </thead>
      <tbody>
        {sides.map((side) => (
          <tr
            key={side.id}
            data-mine={side.id === teamId || undefined}
            data-lost={
              (game.state === "post" && side.winner === false) || undefined
            }
          >
            <th scope="row" className={styles.teamCol}>
              {side.rank && <span className={card.rank}>{side.rank} </span>}
              {side.name}
            </th>
            {cols.map((i) => (
              <td key={i}>
                {game.state === "pre" ? "–" : (side.periods[i] ?? "–")}
              </td>
            ))}
            <td className={`${card.score} ${styles.total}`}>
              {side.score ?? "–"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
