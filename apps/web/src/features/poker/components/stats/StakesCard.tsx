import type { Profile } from "../../lib/profile";
import { formatPct, formatShortMoney } from "../../lib/money";
import { Money } from "../chrome/Money";
import { ChartCard } from "./ChartCard";
import styles from "./StakesCard.module.css";

type Props = { profile: Profile; who: string };

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** How someone does after rebuying, and at each buy-in level. */
export function StakesCard({ profile, who }: Props) {
  const { rebuyGames, comebacks, byStakes } = profile;
  const mine = who === "you";
  return (
    <ChartCard title="Comebacks and stakes">
      <p className={styles.comeback}>
        {rebuyGames === 0
          ? `${mine ? "You've" : `${who} has`} never needed a rebuy.`
          : `${mine ? "You" : who} rebought in ${plural(rebuyGames, "game")} and came back to win ${comebacks} (${Math.round((comebacks / rebuyGames) * 100)}%).`}
      </p>
      {byStakes.length > 1 && (
        <ul className={styles.list}>
          {byStakes.map((s) => (
            <li key={s.buyIn} className={styles.row}>
              <span className={styles.what}>
                <span className={styles.title}>
                  {formatShortMoney(s.buyIn)} games
                </span>
                <span className={styles.about}>
                  {plural(s.games, "game")} · {formatPct(s.roi)} ROI
                </span>
              </span>
              <Money value={s.net} size={20} />
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  );
}
