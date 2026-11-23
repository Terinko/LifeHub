import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ConsistencyCard } from "./components/ConsistencyCard";
import { EasyPaceCard } from "./components/EasyPaceCard";
import { GarminPanel } from "./components/GarminPanel";
import { KpiCard } from "./components/KpiCard";
import { RecentRuns } from "./components/RecentRuns";
import { RecordsCard } from "./components/RecordsCard";
import { RunHeader } from "./components/RunHeader";
import { WeeklyMileage } from "./components/WeeklyMileage";
import card from "./components/card.module.css";
import { buildDashboard, TREND_WEEKS } from "./lib/dashboard";
import { localToday } from "./lib/dates";
import { EASY_HR, WEEKLY_GOAL_MI } from "./lib/goals";
import { useRunData } from "./queries";
import { useGarminReturn } from "./useGarminReturn";
import { useGroundBackground } from "./useGroundBackground";
import { useRunAccess } from "./useRunAccess";
import styles from "./RunPage.module.css";

export function RunPage() {
  useRunAccess();
  useGroundBackground();
  const navigate = useNavigate();
  const garminReturn = useGarminReturn();
  const run = useRunData(!garminReturn.finishing);
  const today = localToday();
  const dash = useMemo(
    () => (run.data ? buildDashboard(run.data, today) : undefined),
    [run.data, today],
  );

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <RunHeader
          today={today}
          data={run.data}
          refreshing={run.isFetching}
          onBack={() => navigate("/")}
          onRefresh={() => run.refetch()}
        />
        {garminReturn.finishing ? (
          <p className={styles.status}>Connecting Garmin…</p>
        ) : run.isError ? (
          <p className={styles.status}>{run.error.message}</p>
        ) : !run.data || !dash ? (
          <p className={styles.status}>Loading your runs…</p>
        ) : (
          <>
            {run.data.garmin !== "connected" && (
              <GarminPanel
                status={run.data.garmin}
                error={garminReturn.error}
              />
            )}
            <section aria-label="Summary" className={styles.kpis}>
              {dash.kpis.map((k) => (
                <KpiCard key={k.label} kpi={k} />
              ))}
            </section>
            <div className={card.pair}>
              <WeeklyMileage
                days={dash.days}
                today={today}
                goal={WEEKLY_GOAL_MI}
              />
              <ConsistencyCard
                days={dash.days}
                today={today}
                streak={dash.streak}
                weeksAtGoal={dash.weeksAtGoal}
                longest={dash.longestStreak}
              />
            </div>
            <div className={card.pair}>
              <EasyPaceCard
                points={dash.easyPace}
                band={EASY_HR}
                first={dash.trendStart}
                weeks={TREND_WEEKS}
              />
              <RecordsCard records={dash.records} />
            </div>
            <RecentRuns runs={dash.recent} />
            {run.data.garmin === "connected" && (
              <GarminPanel status="connected" error={garminReturn.error} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
