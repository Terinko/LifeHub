import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import type { HockeyGame } from "@lifehub/shared";
import { RotateCw } from "lucide-react";
import { GlassHeader } from "./components/chrome/GlassHeader";
import { IceBackdrop } from "./components/chrome/IceBackdrop";
import { TabBar, type Tab } from "./components/chrome/TabBar";
import { NpiTab } from "./components/npi/NpiTab";
import { TabBoundary } from "./components/chrome/TabBoundary";
import { PollTab } from "./components/poll/PollTab";
import { BoxScoreSheet } from "./components/scores/BoxScoreSheet";
import { ScoresTab } from "./components/scores/ScoresTab";
import { StandingsSheet } from "./components/team/StandingsSheet";
import { TeamPickerSheet } from "./components/team/TeamPickerSheet";
import { TeamTab } from "./components/team/TeamTab";
import { todayKey } from "./lib/dates";
import { useStandings, useTeamSchedule } from "./queries";
import { loadTeamId, saveTeamId } from "./storage";
import { useHockeyAccess } from "./useHockeyAccess";
import { useIceBackground } from "./useIceBackground";
import styles from "./HockeyPage.module.css";

const SUBTITLES: Record<Tab, string> = {
  scores: "D-I men's scores",
  poll: "USCHO Top 20",
  npi: "NCAA tournament ranking",
  team: "Schedule & standings",
};

export function HockeyPage() {
  useHockeyAccess();
  useIceBackground();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetching = useIsFetching({ queryKey: ["hockey"] }) > 0;

  const [tab, setTab] = useState<Tab>("scores");
  const [date, setDate] = useState(todayKey);
  const [teamId, setTeamId] = useState(loadTeamId);
  const [openGame, setOpenGame] = useState<HockeyGame>();
  const [standingsOpen, setStandingsOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const schedule = useTeamSchedule(teamId);
  const team = schedule.data?.team;
  const conference =
    team && team.conference !== "ind" ? team.conference : undefined;
  const standings = useStandings(conference);
  const conferenceTeams = standings.data?.rows.map((r) => r.team) ?? [];
  const nextGame = schedule.data?.games.find(
    (g) =>
      g.state !== "post" &&
      g.start.slice(0, 10) > new Date().toISOString().slice(0, 10),
  );

  const closeGame = useCallback(() => setOpenGame(undefined), []);
  const closeStandings = useCallback(() => setStandingsOpen(false), []);
  const closePicker = useCallback(() => setPickerOpen(false), []);

  const pickTeam = (id: string) => {
    saveTeamId(id);
    setTeamId(id);
    setPickerOpen(false);
  };

  return (
    <div className={styles.page}>
      <IceBackdrop />
      <GlassHeader
        title="Hockey"
        subtitle={SUBTITLES[tab]}
        onBack={() => navigate("/")}
        action={
          <button
            type="button"
            className={styles.refresh}
            aria-label="Refresh"
            onClick={() =>
              void queryClient.invalidateQueries({ queryKey: ["hockey"] })
            }
            data-spinning={fetching || undefined}
          >
            <RotateCw size={19} strokeWidth={2.2} aria-hidden />
          </button>
        }
      />

      <main className={styles.content}>
        <TabBoundary key={tab}>
          {tab === "scores" && (
            <ScoresTab
              date={date}
              onDateChange={setDate}
              teamId={teamId}
              team={team}
              nextGame={nextGame}
              onOpenGame={setOpenGame}
              onTeam={() => setTab("team")}
            />
          )}
          {tab === "poll" && <PollTab teamName={team?.name} />}
          {tab === "npi" && <NpiTab teamName={team?.name} />}
          {tab === "team" && (
            <TeamTab
              teamId={teamId}
              schedule={schedule.data}
              loading={schedule.isPending}
              failed={schedule.isError}
              conferenceTeams={conferenceTeams}
              onOpenGame={setOpenGame}
              onStandings={() => setStandingsOpen(true)}
              onChangeTeam={() => setPickerOpen(true)}
              onPoll={() => setTab("poll")}
              onNpi={() => setTab("npi")}
            />
          )}
        </TabBoundary>
      </main>

      <TabBar tab={tab} teamLabel={team?.name ?? "Team"} onChange={setTab} />

      {openGame && (
        <BoxScoreSheet game={openGame} teamId={teamId} onClose={closeGame} />
      )}
      {standingsOpen && conference && (
        <StandingsSheet
          initial={conference}
          teamName={team?.name}
          onClose={closeStandings}
        />
      )}
      {pickerOpen && (
        <TeamPickerSheet
          teamId={teamId}
          onPick={pickTeam}
          onClose={closePicker}
        />
      )}
    </div>
  );
}
