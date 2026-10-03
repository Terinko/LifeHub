import { useState } from "react";
import type { HockeySkaterStats } from "@lifehub/shared";
import { useStats } from "../../queries";
import card from "../chrome/card.module.css";
import { Notice } from "../chrome/Notice";
import { SectionTitle } from "../chrome/SectionTitle";
import styles from "./StatLeaders.module.css";

const LEADERS = 5;

const byPoints = (a: HockeySkaterStats, b: HockeySkaterStats) =>
  b.points - a.points || b.goals - a.goals || a.name.localeCompare(b.name);

/** ".913" the way hockey prints save percentage */
const savePct = (n: number) => n.toFixed(3).replace(/^0/, "");

/** Points leaders and goalies for the Bobcats, from gobobcats.com. */
export function StatLeaders() {
  const stats = useStats(true);
  const [all, setAll] = useState(false);

  if (stats.isPending)
    return <div className={card.skeleton} style={{ height: 260 }} />;
  if (stats.isError)
    return <Notice tone="error">Couldn't load the team's stats.</Notice>;

  const skaters = [...stats.data.skaters].sort(byPoints);
  const shown = all ? skaters : skaters.slice(0, LEADERS);
  const goalies = [...stats.data.goalies].sort(
    (a, b) => b.gamesPlayed - a.gamesPlayed,
  );

  return (
    <section className={styles.wrap} aria-label="Stat leaders">
      <SectionTitle tone="red">Stat leaders</SectionTitle>
      {skaters.length === 0 ? (
        <Notice>No stats yet this season.</Notice>
      ) : (
        <div className={`${card.card} ${styles.table}`}>
          <div className={styles.head} aria-hidden>
            <span>Skater</span>
            <span>G</span>
            <span>A</span>
            <span>Pts</span>
          </div>
          <ol className={styles.list}>
            {shown.map((s) => (
              <li key={s.name} className={styles.row}>
                <span className={styles.name}>
                  {s.number && <span className={styles.num}>#{s.number}</span>}
                  {s.name}
                </span>
                <span>{s.goals}</span>
                <span>{s.assists}</span>
                <b className={card.score}>{s.points}</b>
              </li>
            ))}
          </ol>
          {skaters.length > LEADERS && (
            <button
              type="button"
              className={styles.more}
              onClick={() => setAll(!all)}
            >
              {all ? "Show top 5" : `Show all ${skaters.length} skaters`}
            </button>
          )}
        </div>
      )}

      {goalies.length > 0 && (
        <div className={`${card.card} ${styles.table}`}>
          <div className={`${styles.head} ${styles.goalieGrid}`} aria-hidden>
            <span>Goalie</span>
            <span>W-L-T</span>
            <span>GAA</span>
            <span>SV%</span>
          </div>
          <ol className={styles.list}>
            {goalies.map((g) => (
              <li key={g.name} className={`${styles.row} ${styles.goalieGrid}`}>
                <span className={styles.name}>
                  {g.number && <span className={styles.num}>#{g.number}</span>}
                  {g.name}
                </span>
                <span>{g.record}</span>
                <span>{g.goalsAgainstAverage.toFixed(2)}</span>
                <b className={card.score}>{savePct(g.savePercentage)}</b>
              </li>
            ))}
          </ol>
        </div>
      )}
      <p className={styles.source}>Season totals. Source: gobobcats.com.</p>
    </section>
  );
}
