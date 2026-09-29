import type { Player } from "../../types";

/** Another roster entry already using this name, ignoring case. */
export const sameName = (players: Player[], name: string, exceptSk?: string) =>
  players.find(
    (p) =>
      p.sk !== exceptSk &&
      p.name.trim().toLowerCase() === name.trim().toLowerCase(),
  );
