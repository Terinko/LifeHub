import { formatMoney, formatSigned } from "../../lib/money";
import type { Award, HallOfFame } from "../../lib/stats";
import { ChartCard } from "./ChartCard";
import styles from "./HallOfFameCard.module.css";

type Props = { fame: HallOfFame };

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const AWARDS: {
  key: keyof HallOfFame;
  title: string;
  about: string;
  show: (a: NonNullable<Award>) => string;
}[] = [
  {
    key: "houdini",
    title: "The Houdini",
    about: "Most buy-ins in a night and still came out ahead",
    show: (a) => plural(a.value, "buy-in"),
  },
  {
    key: "roiKing",
    title: "The ROI King",
    about: "Biggest profit off one buy-in",
    show: (a) => `+${formatMoney(a.value)}`,
  },
  {
    key: "rollercoaster",
    title: "The Rollercoaster",
    about: "Biggest gap between best and worst night",
    show: (a) => `${formatMoney(a.value)} gap`,
  },
  {
    key: "swissBank",
    title: "The Swiss Bank",
    about: "Lifetime result closest to $0",
    show: (a) => formatSigned(a.value),
  },
  {
    key: "ironMan",
    title: "The Iron Man",
    about: "Most games played",
    show: (a) => plural(a.value, "game"),
  },
];

/** The group's superlatives, from games marked to count. */
export function HallOfFameCard({ fame }: Props) {
  return (
    <ChartCard title="Hall of Fame">
      <dl className={styles.list}>
        {AWARDS.map(({ key, title, about, show }) => {
          const award = fame[key];
          return (
            <div key={key} className={styles.award}>
              <dt className={styles.what}>
                <span className={styles.title}>{title}</span>
                <span className={styles.about}>{about}</span>
              </dt>
              <dd className={styles.who}>
                <span className={styles.name}>
                  {award?.name ?? "Nobody yet"}
                </span>
                {award && <span className={styles.value}>{show(award)}</span>}
              </dd>
            </div>
          );
        })}
      </dl>
    </ChartCard>
  );
}
