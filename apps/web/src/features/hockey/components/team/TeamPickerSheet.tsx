import { useState } from "react";
import { HOCKEY_CONFERENCE_NAMES } from "@lifehub/shared";
import { Check } from "lucide-react";
import { useTeams } from "../../queries";
import card from "../chrome/card.module.css";
import { Notice } from "../chrome/Notice";
import { Sheet } from "../chrome/Sheet";
import styles from "./TeamPickerSheet.module.css";

type Props = {
  teamId: string;
  onPick: (id: string) => void;
  onClose: () => void;
};

/** Search every D-I team and follow one instead. */
export function TeamPickerSheet({ teamId, onPick, onClose }: Props) {
  const [search, setSearch] = useState("");
  const teams = useTeams();
  const q = search.trim().toLowerCase();
  const list = (teams.data ?? []).filter((t) =>
    t.name.toLowerCase().includes(q),
  );

  return (
    <Sheet title="Follow a team" onClose={onClose}>
      <label className={styles.searchLabel}>
        <span>Search teams</span>
        <input
          className={styles.search}
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Quinnipiac, Denver…"
        />
      </label>
      {teams.isPending ? (
        <div className={card.skeleton} style={{ height: 300 }} />
      ) : teams.isError ? (
        <Notice tone="error">Couldn't load the team list.</Notice>
      ) : (
        <ul className={`${card.card} ${styles.list}`}>
          {list.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                className={styles.team}
                aria-pressed={t.id === teamId}
                onClick={() => onPick(t.id)}
              >
                <span className={styles.name}>{t.name}</span>
                <span className={styles.conf}>
                  {HOCKEY_CONFERENCE_NAMES[t.conference]}
                </span>
                {t.id === teamId && (
                  <Check size={18} strokeWidth={2.6} aria-hidden />
                )}
              </button>
            </li>
          ))}
          {list.length === 0 && (
            <li className={styles.empty}>No D-I team matches “{search}”.</li>
          )}
        </ul>
      )}
    </Sheet>
  );
}
