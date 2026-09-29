import type { NflGame } from "@lifehub/shared";
import { ArrowUpRight } from "lucide-react";
import { gameMeta, gamecastUrl } from "../../lib/games";
import card from "../chrome/card.module.css";
import styles from "./OtherGames.module.css";

/** Games none of your players are in: one line each, linking to ESPN. */
export function OtherGames({ games }: { games: NflGame[] }) {
  return (
    <ul className={`${card.card} ${styles.list}`}>
      {games.map((g) => (
        <li key={g.id}>
          <a
            className={styles.row}
            href={gamecastUrl(g)}
            target="_blank"
            rel="noreferrer"
          >
            <span className={styles.teams}>{g.shortName}</span>
            <span className={styles.meta}>{gameMeta(g)}</span>
            <ArrowUpRight size={16} aria-hidden className={styles.icon} />
          </a>
        </li>
      ))}
    </ul>
  );
}
