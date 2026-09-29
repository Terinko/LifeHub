import { useState, type FormEvent } from "react";
import { useAddPlayer } from "../../queries";
import type { Player } from "../../types";
import { Sheet } from "../chrome/Sheet";
import card from "../chrome/card.module.css";
import { sameName } from "./nameCheck";
import styles from "./PlayerSheet.module.css";

type Props = { players: Player[]; onClose: () => void };

export function AddPlayerSheet({ players, onClose }: Props) {
  const [name, setName] = useState("");
  const [confirmedDuplicate, setConfirmedDuplicate] = useState(false);
  const add = useAddPlayer();
  const trimmed = name.trim();
  const duplicate = trimmed ? sameName(players, trimmed) : undefined;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!trimmed) return;
    if (duplicate && !confirmedDuplicate) return setConfirmedDuplicate(true);
    add.mutate(trimmed, { onSuccess: onClose });
  };

  return (
    <Sheet title="Add a player" onClose={onClose}>
      <form className={styles.form} onSubmit={submit}>
        <label className={styles.field}>
          <span className={card.label}>Name</span>
          <input
            className={card.field}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setConfirmedDuplicate(false);
            }}
            autoFocus
            maxLength={40}
          />
        </label>
        {duplicate && (
          <p className={styles.warn}>
            {duplicate.name} is already on the roster. Only add them again if
            they're a different person; their stats are kept apart.
          </p>
        )}
        {add.error && (
          <p className={styles.error} role="alert">
            {add.error.message}
          </p>
        )}
        <button
          type="submit"
          className={card.primary}
          disabled={!trimmed || add.isPending}
        >
          {add.isPending
            ? "Adding…"
            : duplicate && confirmedDuplicate
              ? "Add anyway"
              : "Add player"}
        </button>
      </form>
    </Sheet>
  );
}
