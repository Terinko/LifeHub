import { useState, type FormEvent } from "react";
import { useClaimPlayer, useDeleteItem, useRenamePlayer } from "../../queries";
import type { Player } from "../../types";
import { Sheet } from "../chrome/Sheet";
import card from "../chrome/card.module.css";
import { sameName } from "./nameCheck";
import styles from "./PlayerSheet.module.css";

type Props = {
  player: Player;
  players: Player[];
  isMe: boolean;
  /** This user has already claimed someone. */
  hasClaim: boolean;
  playing: boolean;
  onClose: () => void;
};

/** Rename, "this is me", or remove: everything for one roster entry. */
export function PlayerSheet({
  player,
  players,
  isMe,
  hasClaim,
  playing,
  onClose,
}: Props) {
  const [name, setName] = useState(player.name);
  const [removing, setRemoving] = useState(false);
  const rename = useRenamePlayer();
  const claim = useClaimPlayer();
  const remove = useDeleteItem();
  const trimmed = name.trim();
  const duplicate = trimmed ? sameName(players, trimmed, player.sk) : undefined;
  const error = rename.error ?? claim.error ?? remove.error;

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!trimmed) return;
    rename.mutate({ id: player.sk, name: trimmed }, { onSuccess: onClose });
  };

  return (
    <Sheet title={player.name} onClose={onClose}>
      <form className={styles.form} onSubmit={save}>
        <label className={styles.field}>
          <span className={card.label}>Name</span>
          <input
            className={card.field}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
          />
          <span className={card.hint}>
            Past games will show the new name too.
          </span>
        </label>
        {duplicate && (
          <p className={styles.warn}>
            {duplicate.name} is already on the roster. Only use this name if
            they're a different person.
          </p>
        )}
        <button
          type="submit"
          className={card.primary}
          disabled={!trimmed || rename.isPending}
        >
          {rename.isPending ? "Saving…" : "Save name"}
        </button>
      </form>

      {(isMe || !hasClaim) && (
        <button
          type="button"
          className={card.quiet}
          disabled={claim.isPending}
          onClick={() =>
            claim.mutate(isMe ? null : player.sk, { onSuccess: onClose })
          }
        >
          {isMe ? "This isn't me" : "This is me"}
        </button>
      )}

      {error && (
        <p className={styles.error} role="alert">
          {error.message}
        </p>
      )}

      {playing ? (
        <span className={styles.note}>
          {player.name} is in a running game, so they can't be removed yet.
        </span>
      ) : removing ? (
        <div className={styles.confirm}>
          <span className={styles.note}>
            Remove {player.name}? Past games keep their results.
          </span>
          <button
            type="button"
            className={card.danger}
            disabled={remove.isPending}
            onClick={() => remove.mutate(player.sk, { onSuccess: onClose })}
          >
            {remove.isPending ? "Removing…" : "Yes, remove"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={card.danger}
          onClick={() => setRemoving(true)}
        >
          Remove from roster
        </button>
      )}
    </Sheet>
  );
}
