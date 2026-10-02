import { Flame, Gift, Sparkles, Trophy } from "lucide-react";
import type { NightAward } from "../../lib/recap";
import { ChipAvatar } from "../chrome/ChipAvatar";
import card from "../chrome/card.module.css";
import styles from "./AwardList.module.css";

const ICONS = {
  bigWinner: Trophy,
  topDonor: Gift,
  comebackKid: Sparkles,
  tilt: Flame,
} as const;

/** Tonight's superlatives, one row each. */
export function AwardList({ awards }: { awards: NightAward[] }) {
  return (
    <dl className={`${card.card} ${styles.list}`}>
      {awards.map((a) => {
        const Icon = ICONS[a.key];
        return (
          <div key={a.key} className={styles.award}>
            <span className={`${styles.icon} ${styles[a.key]}`} aria-hidden>
              <Icon size={18} strokeWidth={2.2} />
            </span>
            <dt className={styles.title}>{a.title}</dt>
            <dd className={styles.who}>
              <ChipAvatar id={a.id} name={a.name} size="sm" />
              <span className={styles.text}>
                <span className={styles.name}>{a.name}</span>
                <span className={styles.detail}>{a.detail}</span>
              </span>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
