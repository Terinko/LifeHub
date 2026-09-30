import { HttpError, json } from "../../shared/http";
import type { Route } from "../../shared/createHandler";
import { hasPermission } from "../../shared/users";
import * as repo from "../repository";
import { myStats as pickMyStats, splitItems, statGames } from "../views";

/** GET /poker (and /poker/{id}): the roster, then every game. */
export const list: Route = async () => {
  const { players, games } = splitItems(await repo.listGroup());
  return json(200, [...players, ...games]);
};

/** GET /poker/stats: the Hall of Fame games. Needs Poker Stats access. */
export const stats: Route = async ({ profile }) => {
  const { games } = splitItems(await repo.listGroup());
  if (!hasPermission(profile, "pokerStats")) {
    throw new HttpError(403, "Stats access required");
  }
  return json(200, statGames(games));
};

/** GET /poker/mystats: the players I've claimed and their completed games. */
export const myStats: Route = async ({ userId }) => {
  const { players, games } = splitItems(await repo.listGroup());
  return json(200, pickMyStats(players, games, userId));
};
