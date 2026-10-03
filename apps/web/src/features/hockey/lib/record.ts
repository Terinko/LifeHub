import { sameHockeyTeam, type HockeyGame } from "@lifehub/shared";
import { sides } from "./games";

type Tally = { w: number; l: number; t: number };

const format = ({ w, l, t }: Tally) => `${w}-${l}-${t}`;

/**
 * Overall and conference records from a team's finished games. A game is a
 * conference game when the opponent is in the team's standings table.
 */
export function records(
  games: HockeyGame[],
  teamId: string,
  conferenceTeams: string[] = [],
) {
  const overall: Tally = { w: 0, l: 0, t: 0 };
  const conference: Tally = { w: 0, l: 0, t: 0 };
  for (const game of games) {
    if (game.state !== "post") continue;
    const { us, them } = sides(game, teamId);
    const a = us.score ?? 0;
    const b = them.score ?? 0;
    const key = a > b ? "w" : a < b ? "l" : "t";
    overall[key] += 1;
    if (isConferenceGame(them.name, conferenceTeams)) conference[key] += 1;
  }
  return { overall: format(overall), conference: format(conference) };
}

export const isConferenceGame = (opponent: string, conferenceTeams: string[]) =>
  conferenceTeams.some((t) => sameHockeyTeam(t, opponent));
