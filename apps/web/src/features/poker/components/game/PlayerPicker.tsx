import { Check } from "lucide-react";
import type { Player } from "../../types";
import styles from "./PlayerPicker.module.css";

type Props = {
  players: Player[];
  picked: string[];
  seated: Set<string>;
  onToggle: (id: string) => void;
};

/** Big tappable pills; someone at another table can't be picked. */
export function PlayerPicker({ players, picked, seated, onToggle }: Props) {
  if (players.length === 0)
    return <p className={styles.empty}>Add players in the Roster tab first.</p>;

  return (
    <div className={styles.pills} role="group" aria-label="Players">
      {players.map((p) => {
        const busy = seated.has(p.sk);
        const on = picked.includes(p.sk);
        return (
          <button
            key={p.sk}
            type="button"
            className={styles.pill}
            aria-pressed={on}
            disabled={busy}
            onClick={() => onToggle(p.sk)}
          >
            {on && <Check size={16} strokeWidth={3} aria-hidden />}
            {p.name}
            {busy && <span className={styles.busy}> · at another table</span>}
          </button>
        );
      })}
    </div>
  );
}
