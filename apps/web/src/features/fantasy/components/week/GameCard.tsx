import { useState } from "react";
import type { NflGame } from "@lifehub/shared";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { gameMeta, gamecastUrl } from "../../lib/games";
import { BoxScore } from "./BoxScore";
import { GameStatePill } from "./GameStatePill";
import { StakeRow } from "./StakeRow";
import card from "../chrome/card.module.css";
import styles from "./GameCard.module.css";

/** "KC 17 @ BUF 21" once it's started, "KC @ BUF" before. */
function scoreLine(game: NflGame) {
  const away = game.teams.find((t) => t.homeAway === "away");
  const home = game.teams.find((t) => t.homeAway === "home");
  if (!away || !home) return game.shortName;
  return game.state === "pre"
    ? `${away.abbreviation} @ ${home.abbreviation}`
    : `${away.abbreviation} ${away.score} @ ${home.abbreviation} ${home.score}`;
}

export function GameCard({ game }: { game: NflGame }) {
  const [open, setOpen] = useState(false);
  const panelId = `game-${game.id}`;

  return (
    <article className={`${card.card} ${styles.card}`}>
      <button
        type="button"
        className={styles.head}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
      >
        <div className={styles.titles}>
          <span className={styles.teams}>{scoreLine(game)}</span>
          <span className={styles.meta}>{gameMeta(game)}</span>
        </div>
        <GameStatePill game={game} />
        <ChevronDown
          size={18}
          className={styles.chevron}
          data-open={open}
          aria-hidden
        />
      </button>

      {game.rootFor.length > 0 && (
        <div className={styles.group}>
          <span className={styles.for}>Rooting for</span>
          {game.rootFor.map((p) => (
            <StakeRow key={p.name} player={p} />
          ))}
        </div>
      )}
      {game.rootAgainst.length > 0 && (
        <div className={styles.group}>
          <span className={styles.against}>Rooting against</span>
          {game.rootAgainst.map((p) => (
            <StakeRow key={p.name} player={p} />
          ))}
        </div>
      )}

      {open && (
        <div id={panelId} className={styles.panel}>
          <BoxScore game={game} />
          <a
            className={styles.gamecast}
            href={gamecastUrl(game)}
            target="_blank"
            rel="noreferrer"
          >
            Gamecast on ESPN
            <ArrowUpRight size={16} aria-hidden />
          </a>
        </div>
      )}
    </article>
  );
}
