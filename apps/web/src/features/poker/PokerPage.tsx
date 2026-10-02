import { lazy, Suspense, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GlassHeader } from "./components/chrome/GlassHeader";
import { Notice } from "./components/chrome/Notice";
import { TabBar, type Tab } from "./components/chrome/TabBar";
import { GameTab } from "./components/game/GameTab";
import { HistoryTab } from "./components/history/HistoryTab";
import { RosterTab } from "./components/roster/RosterTab";
import { PayoutsSheet } from "./components/settle/PayoutsSheet";
import { SettleSheet } from "./components/settle/SettleSheet";
import { isGame, seatedIds, splitItems } from "./lib/game";
import { useHasGroupStats, useMyStats, usePokerItems } from "./queries";
import type { EndGameResult, Game } from "./types";
import { useVegasBackground } from "./useVegasBackground";
import styles from "./PokerPage.module.css";

// Charts are the heaviest part of Poker, so they load when Stats opens.
const StatsTab = lazy(() => import("./components/stats/StatsTab"));

const TITLES: Record<Tab, string> = {
  game: "Poker",
  roster: "Roster",
  history: "History",
  stats: "Stats",
};

export function PokerPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("game");
  const [historyFocus, setHistoryFocus] = useState<string | null>(null);
  const [settlingSk, setSettlingSk] = useState<string | null>(null);
  const [settled, setSettled] = useState<{
    game: Game;
    result: EndGameResult;
  } | null>(null);
  const items = usePokerItems();
  const mine = useMyStats();
  const canCountStats = useHasGroupStats();
  useVegasBackground();

  const { players, activeGames, pastGames } = useMemo(
    () => splitItems(items.data ?? []),
    [items.data],
  );
  const allGames = useMemo(
    () => (items.data ?? []).filter(isGame),
    [items.data],
  );
  const seated = useMemo(() => seatedIds(activeGames), [activeGames]);
  const myIds = mine.data?.playerIds ?? [];
  const settling = activeGames.find((g) => g.sk === settlingSk);

  const subtitle =
    tab === "game" && activeGames.length > 1
      ? `${activeGames.length} tables running`
      : undefined;

  return (
    <div className={styles.page}>
      <GlassHeader
        title={TITLES[tab]}
        subtitle={subtitle}
        onBack={() => navigate("/")}
      />

      <main className={styles.content}>
        {items.isPending ? (
          <p className={styles.loading}>Shuffling up…</p>
        ) : items.isError ? (
          <Notice
            tone="error"
            title="Couldn't load Poker"
            body={items.error.message}
            action={{ label: "Try again", onClick: () => void items.refetch() }}
          />
        ) : (
          <>
            {settlingSk && !settling && (
              <Notice
                tone="warning"
                title="That game is no longer running"
                body="Someone settled or cancelled it on another phone. Check History for the result."
                action={{ label: "OK", onClick: () => setSettlingSk(null) }}
              />
            )}
            {tab === "game" && (
              <GameTab
                players={players}
                activeGames={activeGames}
                allGames={allGames}
                seated={seated}
                onSettle={setSettlingSk}
              />
            )}
            {tab === "roster" && (
              <RosterTab players={players} seated={seated} myIds={myIds} />
            )}
            {tab === "history" && (
              <HistoryTab
                games={pastGames}
                myIds={myIds}
                focusSk={historyFocus}
              />
            )}
            {tab === "stats" && (
              <Suspense
                fallback={<p className={styles.loading}>Loading stats…</p>}
              >
                {mine.isError ? (
                  <Notice
                    tone="error"
                    title="Couldn't load your stats"
                    body={mine.error.message}
                    action={{
                      label: "Try again",
                      onClick: () => void mine.refetch(),
                    }}
                  />
                ) : (
                  <StatsTab
                    mine={mine.data}
                    onFindMe={() => setTab("roster")}
                    onOpenGame={(sk) => {
                      setHistoryFocus(sk);
                      setTab("history");
                    }}
                  />
                )}
              </Suspense>
            )}
          </>
        )}
      </main>

      <TabBar
        tab={tab}
        onChange={(next) => {
          setHistoryFocus(null);
          setTab(next);
        }}
      />

      {settling && (
        <SettleSheet
          game={settling}
          canCountStats={canCountStats}
          onClose={() => setSettlingSk(null)}
          onSettled={(result) => {
            setSettled({ game: settling, result });
            setSettlingSk(null);
          }}
        />
      )}
      {settled && (
        <PayoutsSheet
          game={settled.game}
          result={settled.result}
          onClose={() => setSettled(null)}
        />
      )}
    </div>
  );
}
