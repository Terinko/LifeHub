import type { HockeyGame } from "@lifehub/shared";
import { shortDate, timeLabel } from "../../lib/dates";
import { useBoxScore } from "../../queries";
import { Notice } from "../chrome/Notice";
import { Sheet } from "../chrome/Sheet";
import { BoxDetails } from "./BoxDetails";
import { LineScore } from "./LineScore";
import styles from "./BoxScoreSheet.module.css";

type Props = { game: HockeyGame; teamId: string; onClose: () => void };

/** A game's line score, plus goals, goalies and shots where they're published. */
export function BoxScoreSheet({ game, teamId, onClose }: Props) {
  const box = useBoxScore(game);
  const when =
    game.state === "pre"
      ? `${shortDate(game.start)} · ${timeLabel(game.start)}`
      : `${shortDate(game.start)} · ${game.detail}`;
  const facts = [game.venue, game.tv.join(", ")].filter(Boolean).join(" · ");

  return (
    <Sheet
      title={game.state === "pre" ? "Preview" : "Box score"}
      onClose={onClose}
    >
      <div className={styles.head}>
        <span
          className={styles.when}
          data-live={game.state === "in" || undefined}
        >
          {when}
        </span>
        {facts && <span className={styles.facts}>{facts}</span>}
      </div>
      <div className={styles.lines}>
        <LineScore game={game} teamId={teamId} />
      </div>
      {game.state !== "pre" &&
        (box.isPending ? (
          <div className={styles.loading}>Loading goals…</div>
        ) : box.isError ? (
          <Notice tone="error">Couldn't load the scoring summary.</Notice>
        ) : box.data?.available ? (
          <BoxDetails box={box.data} />
        ) : (
          <Notice>
            Goal-by-goal detail is only published for Quinnipiac games, so this
            one has the line score only.
          </Notice>
        ))}
    </Sheet>
  );
}
