import { useState } from "react";
import type { Matchup } from "@lifehub/shared";
import { Notice } from "../chrome/Notice";
import { SectionHeading } from "../chrome/SectionHeading";
import { useGuide } from "../../queries";
import { ByeStrip } from "./ByeStrip";
import { GameSections } from "./GameSections";
import { MatchupCard } from "./MatchupCard";
import { MatchupSheet } from "./MatchupSheet";
import { WeekSkeleton } from "./WeekSkeleton";

type Props = { onLinkLeague: () => void; onManageLeagues: () => void };

export function WeekTab({ onLinkLeague, onManageLeagues }: Props) {
  const guide = useGuide();
  const [open, setOpen] = useState<Matchup | null>(null);

  if (guide.isPending) return <WeekSkeleton />;
  if (!guide.data) {
    return (
      <Notice
        tone="error"
        title="Couldn't load this week"
        body={guide.error?.message}
        action={{ label: "Try again", onClick: () => void guide.refetch() }}
      />
    );
  }

  const { matchups, byePlayers, games, leagueErrors, leaguesLinked } =
    guide.data;
  if (leaguesLinked === 0) {
    return (
      <Notice
        title="No leagues linked yet"
        body="Link a Sleeper or ESPN league to see your matchups and who to root for in every game."
        action={{ label: "Link a league", onClick: onLinkLeague }}
      />
    );
  }

  return (
    <>
      {guide.isError && (
        <Notice
          tone="warning"
          title="Couldn't refresh"
          body="Showing the last scores that loaded."
          action={{ label: "Retry", onClick: () => void guide.refetch() }}
        />
      )}
      {leagueErrors.map((problem) => (
        <Notice
          key={problem.leagueSk ?? problem.league}
          tone="warning"
          title={problem.league}
          body={problem.message}
          action={
            problem.leagueSk
              ? { label: "Fix", onClick: onManageLeagues }
              : undefined
          }
        />
      ))}

      {matchups.length > 0 && (
        <SectionHeading
          title="Your matchups"
          aside={`${matchups.length} league${matchups.length === 1 ? "" : "s"}`}
        />
      )}
      {matchups.map((m) => (
        <MatchupCard key={m.leagueSk} matchup={m} onOpen={() => setOpen(m)} />
      ))}

      <ByeStrip players={byePlayers} />
      <GameSections games={games} />

      {open && (
        <MatchupSheet
          // Keep the open sheet in sync with background refreshes.
          matchup={matchups.find((m) => m.leagueSk === open.leagueSk) ?? open}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}
