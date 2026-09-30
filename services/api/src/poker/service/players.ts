import { badRequest, notFound } from "../../shared/http";
import * as repo from "../repository";
import { renameInSettlements, splitItems } from "../views";

/**
 * Renames a roster entry, then every game it's seated in, active or
 * completed, so a typo fix shows up in History and the Hall of Fame too.
 */
export async function renamePlayer(playerId: unknown, name: unknown) {
  const trimmedName = ((name as string) || "").trim();
  if (!playerId || !trimmedName) {
    throw badRequest("playerId and name required");
  }
  const id = playerId as string;
  await repo.setPlayerName(id, trimmedName);

  // Active games get a single-field update (safe alongside concurrent
  // buy-in taps); completed games are frozen records nothing else writes
  // to, so replacing their settlements array there is safe.
  const affectedGames = splitItems(await repo.listGroup()).games.filter(
    (g) => g.players && g.players[id],
  );
  await Promise.all(
    affectedGames.map((game) =>
      game.status === "COMPLETED" && game.settlements
        ? repo.setSeatName(
            game.sk,
            id,
            trimmedName,
            renameInSettlements(game.settlements, id, trimmedName),
          )
        : repo.setSeatName(game.sk, id, trimmedName),
    ),
  );
  return { updated: true };
}

/** Claims a roster entry as "me", releasing any other one I'd claimed. */
export async function claimPlayer(userId: string, playerId: unknown) {
  const { players } = splitItems(await repo.listGroup());
  if (!players.find((p) => p.sk === playerId)) {
    throw notFound("Player not found");
  }
  const id = playerId as string;
  await Promise.all(
    players
      .filter((p) => p.userId === userId && p.sk !== id)
      .map((p) => repo.removeClaim(p.sk)),
  );
  await repo.setClaim(id, userId);
  return { claimed: id };
}

export async function unclaimPlayer(userId: string) {
  const { players } = splitItems(await repo.listGroup());
  await Promise.all(
    players
      .filter((p) => p.userId === userId)
      .map((p) => repo.removeClaim(p.sk)),
  );
  return { claimed: null };
}
