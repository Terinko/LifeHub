import {
  HOCKEY_CONFERENCE_NAMES,
  sameHockeyTeam,
  type HockeyNpiRow,
  type HockeyStandings,
  type HockeyTeamOption,
} from "@lifehub/shared";
import { projectField, type FieldTeam } from "../../lib/projection";
import card from "../chrome/card.module.css";
import { Notice } from "../chrome/Notice";
import { SectionTitle } from "../chrome/SectionTitle";
import styles from "./Bracket.module.css";

type Props = {
  npi: HockeyNpiRow[];
  teams: HockeyTeamOption[];
  standings: HockeyStandings[];
  teamName: string | undefined;
  onTeam: (name: string) => void;
};

type SeedProps = {
  team: FieldTeam;
  mine: boolean;
  onTeam: (name: string) => void;
};

function Seed({ team, mine, onTeam }: SeedProps) {
  return (
    <button
      type="button"
      className={styles.seed}
      data-mine={mine || undefined}
      onClick={() => onTeam(team.team)}
    >
      <span className={`${card.score} ${styles.num}`}>{team.seed}</span>
      <span className={styles.name}>{team.team}</span>
      {team.autobid && (
        <span
          className={styles.aq}
          title={`${HOCKEY_CONFERENCE_NAMES[team.autobid]} automatic bid`}
        >
          AQ
        </span>
      )}
    </button>
  );
}

/** Four regionals, the last teams in and the first ones out. */
export function Bracket({ npi, teams, standings, teamName, onTeam }: Props) {
  const p = projectField(npi, teams, standings);
  if (p.regionals.length === 0) {
    return <Notice>Not enough teams have played yet to fill a field.</Notice>;
  }
  const isMine = (team: string) => !!teamName && sameHockeyTeam(team, teamName);
  const mine = p.field.find((f) => isMine(f.team));

  return (
    <div className={styles.body}>
      <Notice>
        If the season ended today: each conference leader takes its automatic
        bid (AQ), the next best by NPI fill the at-large spots, and seeds follow
        the NPI. The real bracket also shifts teams for hosts and
        same-conference matchups.
      </Notice>
      {teamName && (
        <p className={styles.verdict}>
          <b>{teamName}</b>{" "}
          {mine ? `is in as the No. ${mine.seed} seed.` : "is on the outside."}
        </p>
      )}
      <div className={styles.regionals}>
        {p.regionals.map((r) => (
          <section key={r.name} className={`${card.card} ${styles.regional}`}>
            <h3 className={styles.regionalName}>{r.name}</h3>
            {r.games.map(([a, b]) => (
              <div key={a.seed} className={styles.game}>
                <Seed team={a} mine={isMine(a.team)} onTeam={onTeam} />
                <Seed team={b} mine={isMine(b.team)} onTeam={onTeam} />
              </div>
            ))}
          </section>
        ))}
      </div>
      <SectionTitle tone="blue">Last four in</SectionTitle>
      <div className={styles.chips}>
        {p.lastIn.map((t) => (
          <button
            key={t.team}
            type="button"
            className={styles.chip}
            onClick={() => onTeam(t.team)}
          >
            {t.team} · NPI {t.npiRank}
          </button>
        ))}
      </div>
      <SectionTitle tone="red">First four out</SectionTitle>
      <div className={styles.chips}>
        {p.firstOut.map((r) => (
          <button
            key={r.team}
            type="button"
            className={styles.chip}
            data-out
            onClick={() => onTeam(r.team)}
          >
            {r.team} · NPI {r.rank}
          </button>
        ))}
      </div>
    </div>
  );
}
