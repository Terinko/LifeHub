import { chipColor, initials } from "../../lib/game";
import styles from "./ChipAvatar.module.css";

type Props = { id: string; name: string; size?: "md" | "sm" };

/** A player drawn as a poker chip in their own color. */
export function ChipAvatar({ id, name, size = "md" }: Props) {
  return (
    <span
      className={`${styles.chip} ${styles[size]} ${styles[chipColor(id)]}`}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
