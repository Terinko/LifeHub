import { findRow } from "../../lib/poll";
import { useNpi } from "../../queries";
import card from "../chrome/card.module.css";
import { Notice } from "../chrome/Notice";
import { ChevronRight } from "lucide-react";
import { FieldMeter } from "./FieldMeter";
import styles from "./NpiTab.module.css";

const npiLabel = (n: number | null | undefined) =>
  typeof n === "number" && Number.isFinite(n) ? n.toFixed(2) : "–";

/** NCAA tournament field size: six conference champions plus ten at-large. */
const FIELD = 16;

/** The NPI table, with where the followed team sits against the field. */
type Props = {
  teamName: string | undefined;
  onTeam: (name: string) => void;
  onProjection: () => void;
};

export function NpiTab({ teamName, onTeam, onProjection }: Props) {
  const npi = useNpi();
  if (npi.isPending)
    return <div className={card.skeleton} style={{ height: 420 }} />;
  if (npi.isError) return <Notice tone="error">Couldn't load the NPI.</Notice>;

  const { rows } = npi.data;
  const at = teamName ? findRow(rows, teamName) : -1;
  const mine = rows[at];
  const tiedAtTop = rows.filter((r) => r.npi === rows[0]?.npi).length;

  return (
    <div className={styles.tab}>
      {teamName && (
        <section
          className={`${card.card} ${styles.mine}`}
          aria-label={`${teamName} in the NPI`}
        >
          <div className={styles.mineHead}>
            <span className={`${card.score} ${styles.mineRank}`}>
              {mine ? mine.rank : "–"}
            </span>
            <span className={styles.mineText}>
              <b>
                {teamName}
                {mine ? ` · ${npiLabel(mine.npi)}` : ""}
              </b>
              <span>
                {!mine
                  ? "Not ranked until it plays a game"
                  : mine.rank <= FIELD
                    ? "In the field if the season ended today"
                    : `${mine.rank - FIELD} spots outside the field`}
              </span>
            </span>
          </div>
          {mine && (
            <FieldMeter rank={mine.rank} total={rows.length} field={FIELD} />
          )}
        </section>
      )}

      <button
        type="button"
        className={`${card.card} ${styles.projection}`}
        onClick={onProjection}
      >
        <span className={styles.projectionText}>
          <b>Projected NCAA field</b>
          <span>The 16-team bracket if the season ended today</span>
        </span>
        <ChevronRight size={18} aria-hidden />
      </button>

      <Notice>
        {tiedAtTop > 3
          ? `Early season: ${tiedAtTop} teams are tied at the top, so this means little until November. `
          : ""}
        The NCAA picks its 16-team field with the NPI: the six conference
        champions get in automatically, and the rest go by NPI rank.
      </Notice>

      <div className={`${card.card} ${styles.table}`}>
        <div className={styles.head} aria-hidden>
          <span>Rk</span>
          <span>Team</span>
          <span>NPI</span>
          <span>Record</span>
        </div>
        <ol className={styles.list}>
          {rows.map((row, i) => (
            <li key={`${row.rank}-${row.team}`}>
              <button
                type="button"
                className={`${card.rowButton} ${styles.row}`}
                data-mine={i === at || undefined}
                data-cut={row.rank === FIELD || undefined}
                onClick={() => onTeam(row.team)}
              >
                <span className={`${card.score} ${styles.rank}`}>
                  {row.rank}
                </span>
                <span className={styles.name}>{row.team}</span>
                <span className={styles.num}>{npiLabel(row.npi)}</span>
                <span className={styles.rec}>{row.record}</span>
              </button>
            </li>
          ))}
        </ol>
        <p className={styles.source}>
          Teams that haven't played aren't ranked. Source: College Hockey News.
        </p>
      </div>
    </div>
  );
}
