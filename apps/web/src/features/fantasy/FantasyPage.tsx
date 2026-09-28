import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RotateCw } from "lucide-react";
import { GlassHeader } from "./components/chrome/GlassHeader";
import { TabBar, type Tab } from "./components/chrome/TabBar";
import { LeaguesTab } from "./components/leagues/LeaguesTab";
import { WeekTab } from "./components/week/WeekTab";
import { useGuide } from "./queries";
import { useNightBackground } from "./useNightBackground";
import styles from "./FantasyPage.module.css";

export function FantasyPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("week");
  const [linking, setLinking] = useState(false);
  const guide = useGuide();
  useNightBackground();

  const openLinkSheet = () => {
    setTab("leagues");
    setLinking(true);
  };

  return (
    <div className={styles.page}>
      <GlassHeader
        title={tab === "week" ? "Fantasy" : "My Leagues"}
        subtitle={
          tab === "week" && guide.data?.week
            ? `Week ${guide.data.week}`
            : undefined
        }
        onBack={() => navigate("/")}
        action={
          tab === "week" ? (
            <button
              type="button"
              className={styles.refresh}
              aria-label="Refresh scores"
              onClick={() => void guide.refetch()}
              data-spinning={guide.isFetching || undefined}
            >
              <RotateCw size={19} strokeWidth={2.2} aria-hidden />
            </button>
          ) : undefined
        }
      />

      <main className={styles.content}>
        {tab === "week" ? (
          <WeekTab
            onLinkLeague={openLinkSheet}
            onManageLeagues={() => setTab("leagues")}
          />
        ) : (
          <LeaguesTab linking={linking} onLinkingChange={setLinking} />
        )}
      </main>

      <TabBar tab={tab} onChange={setTab} />
    </div>
  );
}
