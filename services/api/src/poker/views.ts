import type { Game, Player, PokerItem, Settlement } from "./types";

/** Splits the group's items into the roster and the games. */
export function splitItems(items: PokerItem[]) {
  return {
    players: items.filter((i) => i.sk.startsWith("PLAYER#")) as Player[],
    games: items.filter((i) => i.sk.startsWith("GAME#")) as Game[],
  };
}

/** Completed games marked to count toward the Hall of Fame. */
export const statGames = (games: Game[]) =>
  games.filter((g) => g.countsForStats === true && g.status === "COMPLETED");

/** The roster entries I've claimed, and every completed game they played. */
export function myStats(players: Player[], games: Game[], userId: string) {
  const playerIds = players.filter((p) => p.userId === userId).map((p) => p.sk);
  const myGames = games.filter(
    (g) =>
      g.status === "COMPLETED" &&
      Object.keys(g.players || {}).some((id) => playerIds.includes(id)),
  );
  return { playerIds, games: myGames };
}

/** A settled game's payments with one player's new name filled in. */
export const renameInSettlements = (
  settlements: Settlement[],
  playerId: string,
  name: string,
) =>
  settlements.map((s) => ({
    ...s,
    from: s.fromId === playerId ? name : s.from,
    to: s.toId === playerId ? name : s.to,
  }));

/** Names of the players already seated at another active game. */
export function busyPlayerNames(
  playerIds: string[],
  seats: Record<string, { name?: unknown } | undefined>,
  existingGames: Game[],
): string[] {
  const seated = new Set(
    existingGames
      .filter((g) => g.status === "ACTIVE")
      .flatMap((g) => Object.keys(g.players || {})),
  );
  return playerIds
    .filter((id) => seated.has(id))
    .map((id) => (seats[id]?.name as string) || "A player");
}
