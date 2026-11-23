import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { GarminPanel } from "./components/GarminPanel";
import { RunHeader } from "./components/RunHeader";
import { TabBar } from "./components/TabBar";
import { buildDashboard } from "./lib/dashboard";
import { localToday } from "./lib/dates";
import { TABS, type Tab } from "./lib/tabs";
import { useRefreshRuns, useRunData } from "./queries";
import { InsightsTab } from "./tabs/InsightsTab";
import { LiftingTab } from "./tabs/LiftingTab";
import { RunningTab } from "./tabs/RunningTab";
import { WeekTab } from "./tabs/WeekTab";
import { useGroundBackground } from "./useGroundBackground";
import { useRunAccess } from "./useRunAccess";
import styles from "./RunPage.module.css";

const isTab = (v: string | null): v is Tab => TABS.some((t) => t.key === v);

export function RunPage() {
  useRunAccess();
  useGroundBackground();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tabParam = params.get("tab");
  const tab: Tab = isTab(tabParam) ? tabParam : "week";
  const run = useRunData();
  const refresh = useRefreshRuns();
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
          refreshing={run.isFetching || refresh.isPending}
          onBack={() => navigate("/")}
          onRefresh={() => refresh.mutate()}
        />
        <TabBar
          tab={tab}
          onChange={(next) =>
            setParams(next === "week" ? {} : { tab: next }, { replace: true })
          }
        />
        {refresh.error && (
          <p className={styles.status}>{refresh.error.message}</p>
        )}
        {run.isError ? (
          <p className={styles.status}>{run.error.message}</p>
        ) : !run.data || !dash ? (
          <p className={styles.status}>Loading your training…</p>
        ) : (
          <>
            {run.data.syncError && (
              <p className={styles.status}>
                Couldn't copy new activities from Garmin ({run.data.syncError}).
                Showing what was copied before.
              </p>
            )}
            {run.data.garmin !== "connected" && (
              <GarminPanel status={run.data.garmin} />
            )}
            {tab === "week" && <WeekTab dash={dash} today={today} />}
            {tab === "running" && <RunningTab dash={dash} today={today} />}
            {tab === "lifting" && (
              <LiftingTab dash={dash} pending={run.data.detailsPending} />
            )}
            {tab === "insights" && <InsightsTab dash={dash} />}
            {run.data.garmin === "connected" && (
              <GarminPanel status="connected" />
            )}
          </>
        )}
      </div>
    </div>
  );
}
