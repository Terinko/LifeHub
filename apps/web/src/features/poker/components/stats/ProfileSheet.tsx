import { Flame, Snowflake } from "lucide-react";
import type { Profile } from "../../lib/profile";
import { formatPct, formatSigned, trendOf } from "../../lib/money";
import { gameDate } from "../../lib/share";
import { ChipAvatar } from "../chrome/ChipAvatar";
import { Sheet } from "../chrome/Sheet";
import card from "../chrome/card.module.css";
import { FormGuide } from "./FormGuide";
import { RivalsCard } from "./RivalsCard";
import { StakesCard } from "./StakesCard";
import styles from "./ProfileSheet.module.css";

type Props = { profile: Profile; onClose: () => void };

function streakText(name: string, streak: number) {
  if (streak > 0) return `${name} has won ${streak} in a row`;
  if (streak < 0) return `${name} has lost ${-streak} in a row`;
  return "No streak going right now";
}

/** Anyone's career in the Hall of Fame games, opened from a list. */
export function ProfileSheet({ profile: p, onClose }: Props) {
  const tiles = [
    { label: "ROI", value: formatPct(p.roi), trend: trendOf(p.roi) },
    { label: "Win rate", value: `${p.winRate}%` },
    { label: "Nights won", value: String(p.nightsWon) },
    { label: "Attendance", value: `${p.attendance}%` },
    { label: "Avg finish", value: p.avgFinish.toFixed(1) },
    { label: "Buy-ins", value: String(p.buyIns) },
    {
      label: "Best night",
      value: formatSigned(p.bestNight),
      trend: trendOf(p.bestNight),
    },
    {
      label: "Worst night",
      value: formatSigned(p.worstNight),
      trend: trendOf(p.worstNight),
    },
    { label: "Games", value: String(p.games) },
  ];

  return (
    <Sheet title={p.name} onClose={onClose}>
      <div className={styles.top}>
        <ChipAvatar id={p.id} name={p.name} />
        <div className={styles.since}>
          <span className={card.eyebrow}>Lifetime</span>
          <span className={card.hint}>
            Since {gameDate(p.firstPlayed)} · Hall of Fame games
          </span>
        </div>
      </div>
      <div className={styles.total}>
        <span className={`${card.money} ${card[trendOf(p.net)]} ${styles.net}`}>
          {formatSigned(p.net)}
        </span>
        <span className={styles.form}>
          <span className={card.hint}>Last {p.lastFive.length}</span>
          <FormGuide results={p.lastFive} />
        </span>
      </div>

      <dl className={styles.tiles}>
        {tiles.map((t) => (
          <div key={t.label} className={styles.tile}>
            <dt className={styles.label}>{t.label}</dt>
            <dd
              className={`${card.money} ${t.trend ? card[t.trend] : ""} ${styles.value}`}
            >
              {t.value}
            </dd>
          </div>
        ))}
      </dl>

      <p className={styles.streak}>
        {p.currentStreak < 0 ? (
          <Snowflake size={16} aria-hidden />
        ) : (
          <Flame size={16} aria-hidden />
        )}
        {streakText(p.name, p.currentStreak)} · best run {p.bestStreak}
      </p>

      <RivalsCard
        nemesis={p.nemesis}
        favoriteAtm={p.favoriteAtm}
        who={p.name}
      />
      <StakesCard profile={p} who={p.name} />
    </Sheet>
  );
}
