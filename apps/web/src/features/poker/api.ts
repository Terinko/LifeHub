import { api } from "../../shared/api/client";
import type {
  EndGameInput,
  EndGameResult,
  Game,
  MyStatsData,
  Player,
  StartGameInput,
} from "./types";

const itemPath = (sk: string) => `/poker/${encodeURIComponent(sk)}`;
const action = <T>(body: Record<string, unknown>) =>
  api.post<T>("/poker", body);

/** Roster and every game, active and completed, in one list. */
export const getPoker = () => api.get<(Player | Game)[]>("/poker");

export const getMyStats = () => api.get<MyStatsData>("/poker/mystats");

/** Completed games that count toward the Hall of Fame (stats access only). */
export const getGroupStats = () => api.get<Game[]>("/poker/stats");

export const addPlayer = (name: string) =>
  api.post<Player>("/poker", { pk: "PLAYER", name });

export const renamePlayer = (playerId: string, name: string) =>
  action({ action: "RENAME_PLAYER", playerId, name });

export const claimPlayer = (playerId: string) =>
  action({ action: "CLAIM_PLAYER", playerId });

export const unclaimPlayer = () => action({ action: "UNCLAIM_PLAYER" });

/** Removes a roster entry, or cancels or deletes a game. */
export const deleteItem = (sk: string) =>
  api.delete<{ message: string }>(itemPath(sk));

export const startGame = (input: StartGameInput) =>
  api.post<Game>("/poker", {
    pk: "GAME",
    status: "ACTIVE",
    ...input,
    date: new Date().toISOString(),
  });

export const updateBuyIn = (gameSk: string, playerId: string, delta: 1 | -1) =>
  action({ action: "UPDATE_BUYIN", gameSk, playerId, delta });

export const updateFinalChips = (
  gameSk: string,
  playerId: string,
  finalChips: number | null,
) => action({ action: "UPDATE_FINAL_CHIPS", gameSk, playerId, finalChips });

export const endGame = ({ sk, ...rest }: EndGameInput) =>
  action<EndGameResult>({ action: "END_GAME", game: { sk }, ...rest });
