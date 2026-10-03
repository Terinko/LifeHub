import type {
  HockeyBoxScore,
  HockeyConference,
  HockeyNpi,
  HockeyPoll,
  HockeyScoreboard,
  HockeyStandings,
  HockeyTeamOption,
  HockeyTeamSchedule,
} from "@lifehub/shared";
import { api } from "../../shared/api/client";

export const getScores = (date: string) =>
  api.get<HockeyScoreboard>(`/hockey/scores?date=${date}`);

export const getPoll = () => api.get<HockeyPoll>("/hockey/poll");

export const getNpi = () => api.get<HockeyNpi>("/hockey/npi");

export const getStandings = (conference: HockeyConference) =>
  api.get<HockeyStandings>(`/hockey/standings/${conference}`);

export const getTeams = () => api.get<HockeyTeamOption[]>("/hockey/teams");

export const getTeamSchedule = (id: string) =>
  api.get<HockeyTeamSchedule>(`/hockey/teams/${encodeURIComponent(id)}`);

export const getBoxScore = (date: string, teamIds: string[]) =>
  api.get<HockeyBoxScore>(
    `/hockey/box?date=${date}&teams=${teamIds.map(encodeURIComponent).join(",")}`,
  );
