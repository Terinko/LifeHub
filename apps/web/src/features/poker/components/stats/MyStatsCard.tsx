import { Flame, Snowflake } from "lucide-react";
import type { MyStats } from "../../lib/stats";
import type { Profile } from "../../lib/profile";
import { formatPct, formatSigned, trendOf } from "../../lib/money";
import { FormGuide } from "./FormGuide";
import card from "../chrome/card.module.css";
import styles from "./MyStatsCard.module.css";

type Props = { stats: MyStats; profile: Profile | null };

function streakText(streak: number) {
  if (streak > 0) return `On a ${streak}-game winning streak`;
  if (streak < 0) return `On a ${-streak}-game losing streak`;
  return "No streak going right now";
}

/** My lifetime numbers across every game one of my players sat in. */
export function MyStatsCard({ stats, profile }: Props) {
  const tiles = [
    { label: "Games", value: String(stats.gamesPlayed) },
    { label: "Win rate", value: `${stats.winRate}%` },
    ...(profile
      ? [
          {
            label: "ROI",
            value: formatPct(profile.roi),
            trend: trendOf(profile.roi),
          },
          { label: "Nights won", value: String(profile.nightsWon) },
          { label: "Avg finish", value: profile.avgFinish.toFixed(1) },
        ]
      : []),
    { label: "Buy-ins", value: String(stats.buyInsTotal) },
    {
      label: "Avg a game",
      value: formatSigned(stats.avgNet),
      trend: trendOf(stats.avgNet),
    },
    {
      label: "Best night",
      value: formatSigned(stats.biggestWin),
      trend: trendOf(stats.biggestWin),
    },
    {
      label: "Worst night",
      value: formatSigned(stats.biggestLoss),
      trend: trendOf(stats.biggestLoss),
    },
  ];

  return (
    <section className={`${card.card} ${styles.card}`} aria-label="My results">
      <h2 className={card.eyebrow}>Lifetime</h2>
      <span
        className={`${card.money} ${card[trendOf(stats.netTotal)]} ${styles.total}`}
      >
        {formatSigned(stats.netTotal)}
      </span>
      {profile && profile.lastFive.length > 0 && (
        <span className={styles.form}>
          <span className={styles.label}>Last {profile.lastFive.length}</span>
          <FormGuide results={profile.lastFive} />
        </span>
      )}

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
        {stats.currentStreak < 0 ? (
          <Snowflake size={16} aria-hidden />
        ) : (
          <Flame size={16} aria-hidden />
        )}
        {streakText(stats.currentStreak)} · best run {stats.bestStreak}
      </p>
    </section>
  );
}
