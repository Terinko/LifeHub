import { json, parseBodyStrictly } from "../../shared/http";
import type { Route } from "../../shared/createHandler";
import { hasPermission } from "../../shared/users";
import { endGame } from "../service/endGame";
import {
  cashOut,
  saveItem,
  setNotes,
  undoCashOut,
  updateBuyIn,
  updateFinalChips,
} from "../service/games";
import { claimPlayer, renamePlayer, unclaimPlayer } from "../service/players";

type Body = Record<string, unknown>;

/**
 * POST /poker does everything that changes data: an `action` names a
 * targeted update, and a body without one is a player or game to save.
 */
export const post: Route = async ({ userId, profile, event }) => {
  const body = parseBodyStrictly(event.body) as Body;

  switch (body.action) {
    case "RENAME_PLAYER":
      return json(200, await renamePlayer(body.playerId, body.name));
    case "CLAIM_PLAYER":
      return json(200, await claimPlayer(userId, body.playerId));
    case "UNCLAIM_PLAYER":
      return json(200, await unclaimPlayer(userId));
    case "UPDATE_BUYIN":
      return json(200, await updateBuyIn(body));
    case "UPDATE_FINAL_CHIPS":
      return json(200, await updateFinalChips(body));
    case "CASH_OUT":
      return json(200, await cashOut(body));
    case "UNDO_CASH_OUT":
      return json(200, await undoCashOut(body));
    case "SET_NOTES":
      return json(200, await setNotes(body));
    case "END_GAME":
      return json(
        200,
        await endGame(userId, hasPermission(profile, "pokerStats"), body),
      );
    default:
      return json(200, await saveItem(body));
  }
};
