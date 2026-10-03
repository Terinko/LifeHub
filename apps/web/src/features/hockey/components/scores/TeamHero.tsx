import type { HockeyGame, HockeyTeamOption } from "@lifehub/shared";
import { shortDate, timeLabel } from "../../lib/dates";
import { sideLabel, sides } from "../../lib/games";
import { LineScore } from "./LineScore";
import styles from "./TeamHero.module.css";

type Props = {
  team: HockeyTeamOption | undefined;
  teamId: string;
  /** The team's game on the day being shown, if it plays. */
  game: HockeyGame | undefined;
  /** Its next game after today, for days it doesn't play. */
  next: HockeyGame | undefined;
  onOpen: (game: HockeyGame) => void;
  onTeam: () => void;
};

const STATUS: Record<HockeyGame["state"], string> = {
  pre: "Today",
  in: "Live",
  post: "Final",
};

/** The followed team pinned above the scoreboard, on frosted glass. */
export function TeamHero({ team, teamId, game, next, onOpen, onTeam }: Props) {
  const name = team?.name ?? "Your team";
  if (!game) {
    const n = next && sides(next, teamId);
    return (
      <section className={styles.hero} aria-label={name}>
        <div className={styles.top}>
          <span className={styles.kicker}>{name}</span>
          <span className={styles.state}>No game</span>
        </div>
        {n && next ? (
          <p className={styles.next}>
            Next: {shortDate(next.start)} {n.home ? "vs" : "at"}{" "}
            {sideLabel(n.them)} · {timeLabel(next.start)}
          </p>
        ) : (
          <p className={styles.next}>No upcoming games on the schedule.</p>
        )}
        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={onTeam}>
            {name} schedule
          </button>
        </div>
      </section>
    );
  }

  const facts = [game.venue, ...game.tv].filter(Boolean).join(" · ");
  return (
    <section className={styles.hero} aria-label={`${name} game`}>
      <div className={styles.top}>
        <span className={styles.kicker}>{name}</span>
        <span
          className={styles.state}
          data-live={game.state === "in" || undefined}
        >
          {game.state === "pre"
            ? `${STATUS.pre} · ${timeLabel(game.start)}`
            : game.state === "in"
              ? `${STATUS.in} · ${game.detail}`
              : game.detail || STATUS.post}
        </span>
      </div>
      <LineScore game={game} teamId={teamId} />
      {facts && <p className={styles.facts}>{facts}</p>}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primary}
          onClick={() => onOpen(game)}
        >
          {game.state === "pre" ? "Preview" : "Box score"}
        </button>
        <button type="button" className={styles.secondary} onClick={onTeam}>
          Schedule
        </button>
      </div>
    </section>
  );
}
