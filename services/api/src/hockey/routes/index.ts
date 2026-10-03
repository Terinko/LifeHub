import { HOCKEY_CONFERENCES, type HockeyConference } from "@lifehub/shared";
import type { Route } from "../../shared/createHandler";
import { badRequest, json } from "../../shared/http";
import {
  getBoxScore,
  getNpi,
  getPoll,
  getScores,
  getStandings,
  getTeams,
  getTeamSchedule,
} from "../service";

const DIGITS = /^\d+$/;

/** Today in Eastern time as YYYYMMDD: college hockey's calendar day. */
export const easternToday = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(now)
    .replace(/-/g, "");

export const scores: Route = async ({ query }) => {
  const date = query.date ?? easternToday();
  if (!/^\d{8}$/.test(date)) throw badRequest("date must be YYYYMMDD");
  return json(200, await getScores(date));
};

export const poll: Route = async () => json(200, await getPoll());

export const npi: Route = async () => json(200, await getNpi());

export const standings: Route = async ({ pathParameters }) => {
  const conference = pathParameters.conference as HockeyConference;
  if (!HOCKEY_CONFERENCES.includes(conference)) {
    throw badRequest("Unknown conference");
  }
  return json(200, await getStandings(conference));
};

export const teams: Route = async () => json(200, await getTeams());

export const team: Route = async ({ pathParameters }) => {
  const id = pathParameters.id ?? "";
  if (!DIGITS.test(id)) throw badRequest("Team id must be a number");
  return json(200, await getTeamSchedule(id));
};

export const box: Route = async ({ query }) => {
  const date = query.date ?? "";
  const ids = (query.teams ?? "").split(",").filter(Boolean);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw badRequest("date must be YYYY-MM-DD");
  }
  if (ids.length === 0 || !ids.every((id) => DIGITS.test(id))) {
    throw badRequest("teams must be ESPN team ids");
  }
  return json(200, await getBoxScore(ids, date));
};
