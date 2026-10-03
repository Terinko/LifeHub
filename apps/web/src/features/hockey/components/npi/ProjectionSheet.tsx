import { type HockeyStandings } from "@lifehub/shared";
import { useAllStandings, useNpi, useTeams } from "../../queries";
import card from "../chrome/card.module.css";
import { Notice } from "../chrome/Notice";
import { Sheet } from "../chrome/Sheet";
import { Bracket } from "./Bracket";

type Props = {
  teamName: string | undefined;
  onTeam: (name: string) => void;
  onClose: () => void;
};

/** The NCAA field and bracket if the season ended today. */
export function ProjectionSheet({ teamName, onTeam, onClose }: Props) {
  const npi = useNpi();
  const teams = useTeams();
  const standings = useAllStandings();
  const tables = standings
    .map((q) => q.data)
    .filter((s): s is HockeyStandings => !!s);
  const loading =
    npi.isPending || teams.isPending || standings.some((q) => q.isPending);

  return (
    <Sheet title="Projected field" onClose={onClose}>
      {loading ? (
        <div className={card.skeleton} style={{ height: 420 }} />
      ) : !npi.data || !teams.data ? (
        <Notice tone="error">Couldn't build the projection right now.</Notice>
      ) : (
        <Bracket
          npi={npi.data.rows}
          teams={teams.data}
          standings={tables}
          teamName={teamName}
          onTeam={onTeam}
        />
      )}
    </Sheet>
  );
}
