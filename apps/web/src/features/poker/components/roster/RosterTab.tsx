import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { playerProfile } from "../../lib/profile";
import { useGroupStats, useHasGroupStats } from "../../queries";
import type { Player } from "../../types";
import { ProfileSheet } from "../stats/ProfileSheet";
import { Notice } from "../chrome/Notice";
import card from "../chrome/card.module.css";
import { AddPlayerSheet } from "./AddPlayerSheet";
import { PlayerRow } from "./PlayerRow";
import { PlayerSheet } from "./PlayerSheet";
import styles from "./RosterTab.module.css";

type Props = {
  players: Player[];
  seated: Set<string>;
  /** The roster entries claimed by this user. */
  myIds: string[];
};

export function RosterTab({ players, seated, myIds }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [statsId, setStatsId] = useState<string | null>(null);
  const open = players.find((p) => p.sk === openId);
  const canSeeGroup = useHasGroupStats();
  const group = useGroupStats(canSeeGroup);
  const profileOf = useMemo(() => {
    const games = group.data ?? [];
    return (id: string) => playerProfile(games, id);
  }, [group.data]);
  const openProfile = open ? profileOf(open.sk) : null;
  const statsProfile = statsId ? profileOf(statsId) : null;

  return (
    <div className={styles.tab}>
      {players.length === 0 ? (
        <Notice
          title="No players yet"
          body="Add everyone who plays so you can start a game."
        />
      ) : (
        <section className={`${card.card} ${styles.list}`} aria-label="Players">
          {players.map((p) => (
            <PlayerRow
              key={p.sk}
              player={p}
              isMe={myIds.includes(p.sk)}
              playing={seated.has(p.sk)}
              onOpen={() => setOpenId(p.sk)}
            />
          ))}
        </section>
      )}

      <button
        type="button"
        className={`${card.quiet} ${styles.add}`}
        onClick={() => setAdding(true)}
      >
        <Plus size={18} strokeWidth={2.4} aria-hidden />
        Add a player
      </button>

      {open && (
        <PlayerSheet
          player={open}
          players={players}
          isMe={myIds.includes(open.sk)}
          hasClaim={myIds.length > 0}
          playing={seated.has(open.sk)}
          onStats={
            openProfile
              ? () => {
                  setOpenId(null);
                  setStatsId(open.sk);
                }
              : undefined
          }
          onClose={() => setOpenId(null)}
        />
      )}
      {statsProfile && (
        <ProfileSheet profile={statsProfile} onClose={() => setStatsId(null)} />
      )}
      {adding && (
        <AddPlayerSheet players={players} onClose={() => setAdding(false)} />
      )}
    </div>
  );
}
