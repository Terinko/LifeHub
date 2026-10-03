import type { HockeyBoxScore } from "@lifehub/shared";
import card from "../chrome/card.module.css";
import { SectionTitle } from "../chrome/SectionTitle";
import styles from "./BoxDetails.module.css";

type Box = Extract<HockeyBoxScore, { available: true }>;

/** Shots, goalies and every goal, from the school's published box score. */
export function BoxDetails({ box }: { box: Box }) {
  return (
    <>
      <div className={styles.tiles}>
        {box.shots.length > 0 && (
          <div className={`${card.card} ${styles.tile}`}>
            <span className={styles.tileLabel}>Shots</span>
            {box.shots.map((s) => (
              <span key={s.team}>
                <b>{s.team}</b> {s.total}
              </span>
            ))}
          </div>
        )}
        {box.goalies.length > 0 && (
          <div className={`${card.card} ${styles.tile}`}>
            <span className={styles.tileLabel}>In goal</span>
            {box.goalies.map((g) => (
              <span key={g.name}>
                <b>{g.team}</b> {g.name} · {g.saves} sv
              </span>
            ))}
          </div>
        )}
      </div>

      <SectionTitle>Scoring</SectionTitle>
      {box.goals.length === 0 ? (
        <p className={styles.none}>No goals yet.</p>
      ) : (
        <ol className={`${card.card} ${styles.goals}`}>
          {box.goals.map((g, i) => (
            <li key={i} className={styles.goal}>
              <span className={styles.when}>
                {g.period}
                <br />
                {g.time}
              </span>
              <span className={styles.who}>
                <span className={styles.scorer}>{g.scorer}</span>
                <span className={styles.assists}>
                  {g.team}
                  {g.assists.length > 0
                    ? ` · ${g.assists.join(", ")}`
                    : " · Unassisted"}
                </span>
              </span>
              {g.tags.length > 0 && (
                <span className={styles.tag}>{g.tags.join(" ")}</span>
              )}
            </li>
          ))}
        </ol>
      )}
      <p className={styles.source}>
        {box.attendance
          ? `Attendance ${box.attendance.toLocaleString()} · `
          : ""}
        <a href={box.source} target="_blank" rel="noreferrer">
          Full box score
        </a>
      </p>
    </>
  );
}
