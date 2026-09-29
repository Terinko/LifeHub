import type {
  LinkLeagueData,
  LinkedLeague,
  SleeperLeagueSearch,
  UpdateLeagueData,
} from "@lifehub/shared";
import { badRequest, notFound } from "../shared/http";
import {
  decryptCookies,
  encryptCookies,
  type EncryptedCookies,
} from "./crypto";
import { getEspnLeague } from "./espn/api";
import { espnFailure } from "./guide/loadLeague";
import * as repo from "./repository";
import type { StoredLeague } from "./repository";
import * as sleeper from "./sleeper/api";

type SleeperLink = Extract<LinkLeagueData, { platform: "SLEEPER" }>;
type EspnLink = Extract<LinkLeagueData, { platform: "ESPN" }>;

/** The league as the browser sees it: cookies replaced by hasCookies. */
export function toLinkedLeague(item: StoredLeague): LinkedLeague {
  return {
    sk: item.sk,
    platform: item.platform,
    leagueId: item.leagueId,
    nickname: item.nickname ?? null,
    leagueName: item.leagueName ?? null,
    season: item.season ?? null,
    sleeperUsername: item.sleeperUsername,
    espnTeamId: item.espnTeamId,
    hasCookies: !!item.espnCookieCipher,
    linkedAt: item.linkedAt,
  };
}

export async function listLinkedLeagues(userId: string) {
  return (await repo.listLeagues(userId)).map(toLinkedLeague);
}

/** Sleeper's API tells us the season new leagues are being made for. */
async function currentSeason() {
  const state = await sleeper.getState();
  return String(state.league_season ?? state.season);
}

export async function findSleeperLeagues(
  username: string,
): Promise<SleeperLeagueSearch> {
  const user = await sleeper.findUser(username);
  if (!user) throw notFound(`There's no Sleeper user named "${username}".`);
  const season = await currentSeason();
  const leagues = await sleeper.getUserLeagues(user.user_id, season);
  return {
    username: user.username ?? username,
    displayName: user.display_name ?? username,
    season,
    leagues: leagues.map((l) => ({
      leagueId: l.league_id,
      name: l.name,
      season: l.season,
      teams: l.total_rosters ?? 0,
    })),
  };
}

async function linkSleeper(userId: string, input: SleeperLink) {
  const users = await sleeper.getLeagueUsers(input.leagueId).catch(() => {
    throw badRequest("Couldn't find that Sleeper league. Check the league ID.");
  });
  // Accept a username (what people know) or, as before, a display name.
  const user = await sleeper.findUser(input.sleeperUsername);
  const wanted = input.sleeperUsername.toLowerCase();
  const member = user
    ? users.find((u) => u.user_id === user.user_id)
    : users.find((u) => u.display_name?.toLowerCase() === wanted);
  if (!member) {
    throw badRequest(`${input.sleeperUsername} isn't in that Sleeper league.`);
  }
  const info = await sleeper.getLeague(input.leagueId);
  return {
    pk: repo.partitionKey(userId),
    sk: repo.leagueSortKey("SLEEPER", input.leagueId),
    platform: "SLEEPER",
    leagueId: input.leagueId,
    nickname: input.nickname,
    leagueName: info.name,
    season: info.season,
    sleeperUsername: user?.username ?? input.sleeperUsername,
    sleeperUserId: member.user_id,
    linkedAt: new Date().toISOString(),
  } satisfies StoredLeague;
}

const cookieFields = (item: StoredLeague | undefined) =>
  item?.espnCookieCipher ? (item as EncryptedCookies) : undefined;

async function linkEspn(userId: string, input: EspnLink) {
  const sk = repo.leagueSortKey("ESPN", input.leagueId);
  // Re-linking without pasting cookies again keeps the saved ones.
  const encrypted = input.espnCookies
    ? encryptCookies(input.espnCookies)
    : cookieFields(await repo.getLeague(userId, sk));
  const season = await currentSeason();

  const data = await getEspnLeague(
    input.leagueId,
    season,
    encrypted && decryptCookies(encrypted),
  ).catch((error: unknown) => {
    throw badRequest(espnFailure(error, season).message);
  });
  if (!(data.teams ?? []).some((t) => String(t.id) === input.espnTeamId)) {
    throw badRequest(
      `Team ${input.espnTeamId} isn't in that ESPN league. Copy the link from your team's page instead.`,
    );
  }
  return {
    pk: repo.partitionKey(userId),
    sk,
    platform: "ESPN",
    leagueId: input.leagueId,
    nickname: input.nickname,
    leagueName: data.settings?.name ?? null,
    season,
    espnTeamId: input.espnTeamId,
    ...encrypted,
    linkedAt: new Date().toISOString(),
  } satisfies StoredLeague;
}

/** Links a league after checking it exists and you're in it. */
export async function linkLeague(userId: string, input: LinkLeagueData) {
  const item =
    input.platform === "SLEEPER"
      ? await linkSleeper(userId, input)
      : await linkEspn(userId, input);
  await repo.putLeague(item);
  return toLinkedLeague(item);
}

/** Renames a league or replaces its ESPN cookies. */
export async function updateLeague(
  userId: string,
  sk: string,
  input: UpdateLeagueData,
) {
  if (input.nickname === undefined && !input.espnCookies) {
    throw badRequest("Nothing to update");
  }
  try {
    const item = await repo.updateLeague(userId, sk, {
      nickname: input.nickname,
      ...(input.espnCookies && encryptCookies(input.espnCookies)),
    });
    return toLinkedLeague(item);
  } catch (error) {
    if ((error as Error).name === "ConditionalCheckFailedException") {
      throw notFound("That league isn't linked anymore.");
    }
    throw error;
  }
}

export const unlinkLeague = repo.deleteLeague;
