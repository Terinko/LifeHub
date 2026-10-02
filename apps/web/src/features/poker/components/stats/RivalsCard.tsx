import type { Rival } from "../../lib/profile";
import { Money } from "../chrome/Money";
import { ChartCard } from "./ChartCard";
import styles from "./RivalsCard.module.css";

type Props = {
  nemesis: Rival | null;
  favoriteAtm: Rival | null;
  /** "you" on my own stats, the player's name on a profile. */
  who: string;
};

/** The two opponents worth bragging or grumbling about. */
export function RivalsCard({ nemesis, favoriteAtm, who }: Props) {
  if (!nemesis && !favoriteAtm) return null;
  const mine = who === "you";
  return (
    <ChartCard title="Rivals">
      <dl className={styles.list}>
        {nemesis && (
          <div className={styles.row}>
            <dt className={styles.what}>
              <span className={styles.title}>Nemesis</span>
              <span className={styles.about}>
                Has taken the most from {who}
              </span>
            </dt>
            <dd className={styles.who}>
              <span className={styles.name}>{nemesis.name}</span>
              <Money value={nemesis.net} size={20} />
            </dd>
          </div>
        )}
        {favoriteAtm && (
          <div className={styles.row}>
            <dt className={styles.what}>
              <span className={styles.title}>Favorite ATM</span>
              <span className={styles.about}>
                {mine ? "You've" : `${who} has`} taken the most from them
              </span>
            </dt>
            <dd className={styles.who}>
              <span className={styles.name}>{favoriteAtm.name}</span>
              <Money value={favoriteAtm.net} size={20} />
            </dd>
          </div>
        )}
      </dl>
    </ChartCard>
  );
}
