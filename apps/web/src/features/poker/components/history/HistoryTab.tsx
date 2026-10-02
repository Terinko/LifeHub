import { useEffect, useState } from "react";
import { gameDate } from "../../lib/share";
import { useDeleteItem } from "../../queries";
import type { Game } from "../../types";
import { ConfirmSheet } from "../chrome/ConfirmSheet";
import { Notice } from "../chrome/Notice";
import { GameHistoryCard } from "./GameHistoryCard";
import styles from "./HistoryTab.module.css";

type Props = {
  games: Game[];
  myIds: string[];
  /** A game to open and scroll to, like one picked from the record book. */
  focusSk?: string | null;
};

/** Finished games, newest first. The latest one starts open. */
export function HistoryTab({ games, myIds, focusSk }: Props) {
  const [openSk, setOpenSk] = useState<string | null>(
    focusSk ?? games[0]?.sk ?? null,
  );

  useEffect(() => {
    if (!focusSk) return;
    document
      .getElementById(`game-${focusSk}`)
      ?.scrollIntoView({ block: "center" });
  }, [focusSk]);
  const [deleting, setDeleting] = useState<Game | null>(null);
  const remove = useDeleteItem();

  if (games.length === 0) {
    return (
      <Notice
        title="No games yet"
        body="Settled games you save to history show up here."
      />
    );
  }

  const confirmDelete = () => {
    if (!deleting) return;
    remove.mutate(deleting.sk, {
      onSuccess: () => {
        setDeleting(null);
        setOpenSk(null);
      },
    });
  };

  return (
    <div className={styles.tab}>
      {games.map((game) => (
        <GameHistoryCard
          key={game.sk}
          game={game}
          myIds={myIds}
          expanded={openSk === game.sk}
          onToggle={() => setOpenSk(openSk === game.sk ? null : game.sk)}
          onDelete={() => {
            remove.reset();
            setDeleting(game);
          }}
        />
      ))}

      {deleting && (
        <ConfirmSheet
          title="Delete this game?"
          body={`The ${gameDate(deleting.completedAt ?? deleting.date)} game leaves history and stats for everyone. This can't be undone.`}
          confirmLabel="Delete game"
          busy={remove.isPending}
          error={remove.error?.message}
          onConfirm={confirmDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
