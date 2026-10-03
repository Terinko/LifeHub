import type { HockeyGame } from "@lifehub/shared";
import { countdown, shortDate, timeLabel } from "../../lib/dates";
import { sideLabel, sides } from "../../lib/games";
import { useNow } from "../../useNow";
import styles from "./NextGameCard.module.css";

type Props = {
  game: HockeyGame;
  teamId: string;
  onOpen: (game: HockeyGame) => void;
};

const pad = (n: number) => String(n).padStart(2, "0");

/** The next (or live) game on dark ice, with a running countdown to puck drop. */
export function NextGameCard({ game, teamId, onOpen }: Props) {
  const now = useNow();
  const { us, them, home } = sides(game, teamId);
  const live = game.state === "in";
  const left = countdown(game.start, now);
  const units =
    left.days > 0
      ? [
          [left.days, "Days"],
          [left.hours, "Hours"],
          [left.minutes, "Min"],
        ]
      : [
          [left.hours, "Hours"],
          [left.minutes, "Min"],
          [left.seconds, "Sec"],
        ];

  return (
    <button type="button" className={styles.card} onClick={() => onOpen(game)}>
      <span className={styles.top}>
        <span className={styles.kicker} data-live={live || undefined}>
          {live ? `Live · ${game.detail}` : "Next game"}
        </span>
        <span className={styles.tv}>{game.tv.join(" · ")}</span>
      </span>
      <span className={styles.matchup}>
        {home ? "vs" : "at"} {sideLabel(them)}
      </span>
      <span className={styles.when}>
        {shortDate(game.start)} · {timeLabel(game.start)}
        {game.venue ? ` · ${game.venue}` : ""}
      </span>
      {live ? (
        <span className={styles.live}>
          <span>
            {us.name} <b>{us.score ?? 0}</b>
          </span>
          <span>
            {them.name} <b>{them.score ?? 0}</b>
          </span>
        </span>
      ) : (
        <span className={styles.clock} aria-label="Time until puck drop">
          {units.map(([n, label]) => (
            <span key={label} className={styles.unit}>
              <span className={styles.num}>{pad(n as number)}</span>
              <span className={styles.unitLabel}>{label}</span>
            </span>
          ))}
        </span>
      )}
    </button>
  );
}
