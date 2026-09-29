import { Ellipsis } from "lucide-react";
import type { Player } from "../../types";
import { ChipAvatar } from "../chrome/ChipAvatar";
import card from "../chrome/card.module.css";
import styles from "./PlayerRow.module.css";

type Props = {
  player: Player;
  isMe: boolean;
  playing: boolean;
  onOpen: () => void;
};

export function PlayerRow({ player, isMe, playing, onOpen }: Props) {
  return (
    <div className={styles.row}>
      <ChipAvatar id={player.sk} name={player.name} />
      <span className={styles.name}>{player.name}</span>
      {isMe && <span className={styles.me}>You</span>}
      {playing && <span className={styles.playing}>In a game</span>}
      <button
        type="button"
        className={card.round}
        onClick={onOpen}
        aria-label={`Options for ${player.name}`}
      >
        <Ellipsis size={20} aria-hidden />
      </button>
    </div>
  );
}
