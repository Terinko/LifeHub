import { useMemo, useState } from "react";
import { formatPct, formatSigned } from "../../lib/money";
import { playerProfile } from "../../lib/profile";
import { recordBook } from "../../lib/records";
import {
  bankroll,
  hallOfFame,
  headToHead,
  leaderboard,
  monthlyActivity,
  myStats,
  sortLeaders,
  type LeaderRow,
  type LeaderSort,
} from "../../lib/stats";
import { useGroupStats, useHasGroupStats } from "../../queries";
import type { MyStatsData } from "../../types";
import { Notice } from "../chrome/Notice";
import { ChartCard } from "./ChartCard";
import { GroupCharts } from "./GroupCharts";
import { HallOfFameCard } from "./HallOfFameCard";
import { MyCharts } from "./MyCharts";
import { MyStatsCard } from "./MyStatsCard";
import { ProfileSheet } from "./ProfileSheet";
import { RankedList } from "./RankedList";
import { RecordBookCard } from "./RecordBookCard";
import { RivalsCard } from "./RivalsCard";
import { Segmented } from "./Segmented";
import { StakesCard } from "./StakesCard";
import styles from "./StatsTab.module.css";

type Props = {
  mine: MyStatsData | undefined;
  onFindMe: () => void;
  /** Opens a game in History, from the record book. */
  onOpenGame: (sk: string) => void;
};

const SORTS: { value: LeaderSort; label: string }[] = [
  { value: "net", label: "Total" },
  { value: "roi", label: "ROI" },
  { value: "winRate", label: "Win %" },
  { value: "nightsWon", label: "Nights won" },
];

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** What each row says under the name, leading with the chosen measure. */
function leaderDetail(r: LeaderRow, by: LeaderSort) {
  const roi = `${formatPct(r.roi)} ROI`;
  const wins = `${r.winRate}% wins`;
  const nights = `${plural(r.nightsWon, "night")} won`;
  const perGame = `${formatSigned(r.avgNet)} a game`;
  const shown = {
    net: [roi, nights],
    roi: [roi, perGame],
    winRate: [wins, nights],
    nightsWon: [nights, wins],
  }[by];
  return [plural(r.games, "game"), ...shown].join(" · ");
}

/** My results, then the group's Hall of Fame for those who can see it. */
export default function StatsTab({ mine, onFindMe, onOpenGame }: Props) {
  const canSeeGroup = useHasGroupStats();
  const group = useGroupStats(canSeeGroup);
  const [sort, setSort] = useState<LeaderSort>("net");
  const [openId, setOpenId] = useState<string | null>(null);

  const personal = useMemo(() => {
    if (!mine) return null;
    const myId = mine.playerIds[0];
    return {
      stats: myStats(mine.games, mine.playerIds),
      profile: myId ? playerProfile(mine.games, myId) : null,
      points: bankroll(mine.games, mine.playerIds),
      rivals: headToHead(mine.games, mine.playerIds),
    };
  }, [mine]);

  const shared = useMemo(() => {
    const games = group.data ?? [];
    return {
      games,
      fame: hallOfFame(games),
      board: leaderboard(games),
      records: recordBook(games),
      months: monthlyActivity(games),
    };
  }, [group.data]);

  const opened = openId ? playerProfile(shared.games, openId) : null;

  return (
    <div className={styles.tab}>
      {mine && mine.playerIds.length === 0 ? (
        <Notice
          title="Which player are you?"
          body="Pick yourself on the roster to track your own results."
          action={{ label: "Go to roster", onClick: onFindMe }}
        />
      ) : personal && !personal.stats ? (
        <Notice
          title="No results yet"
          body="Your numbers show up here after your first saved game."
        />
      ) : (
        personal?.stats && (
          <>
            <MyStatsCard stats={personal.stats} profile={personal.profile} />
            <MyCharts points={personal.points} />
            {personal.profile && (
              <RivalsCard
                nemesis={personal.profile.nemesis}
                favoriteAtm={personal.profile.favoriteAtm}
                who="you"
              />
            )}
            {personal.rivals.length > 0 && (
              <ChartCard title="Head to head">
                <RankedList rows={personal.rivals} />
              </ChartCard>
            )}
            {personal.profile && (
              <StakesCard profile={personal.profile} who="you" />
            )}
          </>
        )
      )}

      {canSeeGroup && (
        <>
          <h2 className={styles.section}>The group</h2>
          {group.isError ? (
            <Notice
              tone="error"
              title="Couldn't load the Hall of Fame"
              body={group.error.message}
              action={{
                label: "Try again",
                onClick: () => void group.refetch(),
              }}
            />
          ) : group.isPending ? (
            <p className={styles.loading}>Loading the Hall of Fame…</p>
          ) : !shared.fame ? (
            <Notice
              title="No Hall of Fame games yet"
              body="Games settled with Hall of Fame turned on count here."
            />
          ) : (
            <>
              <ChartCard title="Leaderboard">
                <Segmented
                  label="Rank by"
                  options={SORTS}
                  value={sort}
                  onChange={setSort}
                />
                <RankedList
                  rows={sortLeaders(shared.board, sort).map((r) => ({
                    ...r,
                    detail: leaderDetail(r, sort),
                  }))}
                  onOpen={setOpenId}
                />
              </ChartCard>
              <HallOfFameCard fame={shared.fame} />
              <RecordBookCard book={shared.records} onOpenGame={onOpenGame} />
              <GroupCharts board={shared.board} months={shared.months} />
            </>
          )}
        </>
      )}

      {opened && (
        <ProfileSheet profile={opened} onClose={() => setOpenId(null)} />
      )}
    </div>
  );
}
