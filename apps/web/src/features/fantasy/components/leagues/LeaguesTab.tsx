import { useState } from "react";
import type { LinkedLeague } from "@lifehub/shared";
import { Plus } from "lucide-react";
import { useLeagues } from "../../queries";
import { Notice } from "../chrome/Notice";
import { SectionHeading } from "../chrome/SectionHeading";
import { LeagueRow } from "./LeagueRow";
import { LeagueSheet } from "./LeagueSheet";
import { LinkLeagueSheet } from "./LinkLeagueSheet";
import styles from "./LeaguesTab.module.css";

type Props = { linking: boolean; onLinkingChange: (open: boolean) => void };

export function LeaguesTab({ linking, onLinkingChange }: Props) {
  const leagues = useLeagues();
  const [managing, setManaging] = useState<LinkedLeague | null>(null);
  const list = leagues.data ?? [];

  return (
    <>
      {leagues.isError && !leagues.data && (
        <Notice
          tone="error"
          title="Couldn't load your leagues"
          body={leagues.error.message}
          action={{ label: "Try again", onClick: () => void leagues.refetch() }}
        />
      )}
      {leagues.isSuccess && list.length === 0 && (
        <Notice
          title="No leagues linked yet"
          body="Link your Sleeper or ESPN leagues and This Week fills in with your matchups."
        />
      )}
      {list.length > 0 && <SectionHeading title="Linked leagues" />}
      {list.map((league) => (
        <LeagueRow
          key={league.sk}
          league={league}
          onManage={() => setManaging(league)}
        />
      ))}

      {!leagues.isPending && (
        <button
          type="button"
          className={styles.link}
          onClick={() => onLinkingChange(true)}
        >
          <Plus size={18} strokeWidth={2.4} aria-hidden />
          Link a league
        </button>
      )}

      {linking && (
        <LinkLeagueSheet linked={list} onClose={() => onLinkingChange(false)} />
      )}
      {managing && (
        <LeagueSheet league={managing} onClose={() => setManaging(null)} />
      )}
    </>
  );
}
