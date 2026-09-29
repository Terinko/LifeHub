import { useMemo } from "react";
import { formatSigned } from "../../lib/money";
import {
  bankroll,
  hallOfFame,
  headToHead,
  leaderboard,
  monthlyActivity,
  myStats,
} from "../../lib/stats";
import { useGroupStats, useHasGroupStats } from "../../queries";
import type { MyStatsData } from "../../types";
import { Notice } from "../chrome/Notice";
import { ChartCard } from "./ChartCard";
import { GroupCharts } from "./GroupCharts";
import { HallOfFameCard } from "./HallOfFameCard";
import { MyCharts } from "./MyCharts";
import { MyStatsCard } from "./MyStatsCard";
import { RankedList } from "./RankedList";
import styles from "./StatsTab.module.css";

type Props = {
  mine: MyStatsData | undefined;
  onFindMe: () => void;
};

/** My results, then the group's Hall of Fame for those who can see it. */
export default function StatsTab({ mine, onFindMe }: Props) {
  const canSeeGroup = useHasGroupStats();
  const group = useGroupStats(canSeeGroup);

  const personal = useMemo(() => {
    if (!mine) return null;
    return {
      stats: myStats(mine.games, mine.playerIds),
      points: bankroll(mine.games, mine.playerIds),
      rivals: headToHead(mine.games, mine.playerIds),
    };
  }, [mine]);

  const shared = useMemo(() => {
    const games = group.data ?? [];
    return {
      fame: hallOfFame(games),
      board: leaderboard(games),
      months: monthlyActivity(games),
    };
  }, [group.data]);

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
            <MyStatsCard stats={personal.stats} />
            <MyCharts points={personal.points} />
            {personal.rivals.length > 0 && (
              <ChartCard title="Head to head">
                <RankedList rows={personal.rivals} />
              </ChartCard>
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
              <HallOfFameCard fame={shared.fame} />
              <ChartCard title="Leaderboard">
                <RankedList
                  rows={shared.board.map((r) => ({
                    ...r,
                    detail: `${r.games} ${r.games === 1 ? "game" : "games"} · ${r.winRate}% wins · ${formatSigned(r.avgNet)} a game`,
                  }))}
                />
              </ChartCard>
              <GroupCharts board={shared.board} months={shared.months} />
            </>
          )}
        </>
      )}
    </div>
  );
}
