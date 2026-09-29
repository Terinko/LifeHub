/* eslint-disable no-undef */
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
  DeleteCommand,
  GetCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const crypto = require("crypto");

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;
const USERS_TABLE = process.env.USERS_TABLE;

const round2 = (n) => Math.round(n * 100) / 100;

const isPositiveNumber = (n) => typeof n === "number" && Number.isFinite(n) && n > 0;

// Chips handed out (every buy-in) versus chips counted at the end. A blank
// count is treated as 0 chips.
function chipTotals(players, chipsPerBuyIn) {
  let expected = 0;
  let counted = 0;
  for (const p of Object.values(players)) {
    expected += p.buyIns * chipsPerBuyIn;
    counted += p.finalChips ?? 0;
  }
  return { expected, counted };
}

function calculateSettlements(players, buyInAmount, chipsPerBuyIn) {
  let debtors = [];
  let creditors = [];
  let processedPlayers = {};

  for (const [id, p] of Object.entries(players)) {
    const chipValue = ((p.finalChips ?? 0) / chipsPerBuyIn) * buyInAmount;
    const totalSpent = p.buyIns * buyInAmount;
    const net = round2(chipValue - totalSpent);

    processedPlayers[id] = { ...p, net };

    if (net < 0) debtors.push({ id, name: p.name, amount: Math.abs(net) });
    else if (net > 0) creditors.push({ id, name: p.name, amount: net });
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const settlements = [];
  let d = 0,
    c = 0;

  while (d < debtors.length && c < creditors.length) {
    // Work in whole cents so repeated subtraction can't leave float dust
    // like 0.30000000000000004 in a payment.
    const payment = round2(Math.min(debtors[d].amount, creditors[c].amount));

    if (payment > 0) {
      settlements.push({
        from: debtors[d].name,
        fromId: debtors[d].id,
        to: creditors[c].name,
        toId: creditors[c].id,
        amount: payment,
      });
    }

    debtors[d].amount = round2(debtors[d].amount - payment);
    creditors[c].amount = round2(creditors[c].amount - payment);

    if (debtors[d].amount < 0.01) d++;
    if (creditors[c].amount < 0.01) c++;
  }

  return { players: processedPlayers, settlements };
}

exports.calculateSettlements = calculateSettlements;
exports.chipTotals = chipTotals;

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
  const method = event.requestContext.http.method;
  const path = event.requestContext.http.path;

  try {
    if (!USERS_TABLE) {
      console.error("USERS_TABLE environment variable is missing!");
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Server misconfiguration: USERS_TABLE missing.",
        }),
      };
    }

    const profileRes = await dynamo.send(
      new GetCommand({ TableName: USERS_TABLE, Key: { pk: `USER#${userId}` } }),
    );
    const profile = profileRes.Item || {};
    const isAdmin = profile.role === "ADMIN";
    const hasPoker = isAdmin || profile.permissions?.poker === true;
    const hasPokerStats = isAdmin || profile.permissions?.pokerStats === true;

    if (!hasPoker) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: "Poker access required" }),
      };
    }

    await dynamo
      .send(
        new UpdateCommand({
          TableName: USERS_TABLE,
          Key: { pk: `USER#${userId}` },
          UpdateExpression: "SET lastUsedPoker = :now",
          ExpressionAttributeValues: { ":now": new Date().toISOString() },
        }),
      )
      .catch((err) => console.error("Failed to record poker usage:", err));

    const GROUP_PK = `POKER#GROUP`;

    if (method === "GET") {
      const data = await dynamo.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: "pk = :pk",
          ExpressionAttributeValues: { ":pk": GROUP_PK },
        }),
      );

      const items = data.Items || [];
      const players = items.filter((i) => i.sk.startsWith("PLAYER#"));
      const games = items.filter((i) => i.sk.startsWith("GAME#"));

      if (path === "/poker/stats") {
        if (!hasPokerStats) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: "Stats access required" }),
          };
        }
        const statGames = games.filter(
          (g) => g.countsForStats === true && g.status === "COMPLETED",
        );
        return { statusCode: 200, headers, body: JSON.stringify(statGames) };
      }

      if (path === "/poker/mystats") {
        const myPlayerIds = players
          .filter((p) => p.userId === userId)
          .map((p) => p.sk);
        const myGames = games.filter(
          (g) =>
            g.status === "COMPLETED" &&
            Object.keys(g.players || {}).some((id) =>
              myPlayerIds.includes(id),
            ),
        );
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ playerIds: myPlayerIds, games: myGames }),
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify([...players, ...games]),
      };
    }

    if (method === "POST") {
      const body = JSON.parse(event.body);

      if (body.action === "RENAME_PLAYER") {
        const { playerId, name } = body;
        const trimmedName = (name || "").trim();
        if (!playerId || !trimmedName) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "playerId and name required" }),
          };
        }

        // A targeted field update rather than a full-item PutCommand — a
        // naive upsert here would silently drop the player's claimed
        // userId (and anything else on the item) since Put replaces the
        // whole item.
        await dynamo.send(
          new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { pk: GROUP_PK, sk: playerId },
            UpdateExpression: "SET #name = :name",
            ExpressionAttributeNames: { "#name": "name" },
            ExpressionAttributeValues: { ":name": trimmedName },
          }),
        );

        // Backfill: every game (active or completed) that has this player
        // baked into it keeps the name they had *at the time* — otherwise
        // a typo fix wouldn't show up anywhere in History or the Hall of
        // Fame. Active games get a surgical single-field update (safe
        // alongside concurrent buy-in clicks on the same game); completed
        // games are frozen records nothing else ever writes to, so a full
        // settlements-array replace there is safe.
        const allItems = await dynamo.send(
          new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "pk = :pk",
            ExpressionAttributeValues: { ":pk": GROUP_PK },
          }),
        );
        const affectedGames = (allItems.Items || []).filter(
          (i) => i.sk.startsWith("GAME#") && i.players && i.players[playerId],
        );

        await Promise.all(
          affectedGames.map((game) => {
            if (game.status === "COMPLETED" && game.settlements) {
              const updatedSettlements = game.settlements.map((s) => ({
                ...s,
                from: s.fromId === playerId ? trimmedName : s.from,
                to: s.toId === playerId ? trimmedName : s.to,
              }));
              return dynamo.send(
                new UpdateCommand({
                  TableName: TABLE_NAME,
                  Key: { pk: GROUP_PK, sk: game.sk },
                  UpdateExpression:
                    "SET players.#pid.#name = :name, settlements = :settlements",
                  ExpressionAttributeNames: { "#pid": playerId, "#name": "name" },
                  ExpressionAttributeValues: {
                    ":name": trimmedName,
                    ":settlements": updatedSettlements,
                  },
                }),
              );
            }

            return dynamo.send(
              new UpdateCommand({
                TableName: TABLE_NAME,
                Key: { pk: GROUP_PK, sk: game.sk },
                UpdateExpression: "SET players.#pid.#name = :name",
                ExpressionAttributeNames: { "#pid": playerId, "#name": "name" },
                ExpressionAttributeValues: { ":name": trimmedName },
              }),
            );
          }),
        );

        return { statusCode: 200, headers, body: JSON.stringify({ updated: true }) };
      }

      if (body.action === "CLAIM_PLAYER" || body.action === "UNCLAIM_PLAYER") {
        const data = await dynamo.send(
          new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "pk = :pk",
            ExpressionAttributeValues: { ":pk": GROUP_PK },
          }),
        );
        const allPlayers = (data.Items || []).filter((i) =>
          i.sk.startsWith("PLAYER#"),
        );

        if (body.action === "CLAIM_PLAYER") {
          const { playerId } = body;
          const target = allPlayers.find((p) => p.sk === playerId);
          if (!target) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ error: "Player not found" }),
            };
          }

          await Promise.all(
            allPlayers
              .filter((p) => p.userId === userId && p.sk !== playerId)
              .map((p) =>
                dynamo.send(
                  new UpdateCommand({
                    TableName: TABLE_NAME,
                    Key: { pk: GROUP_PK, sk: p.sk },
                    UpdateExpression: "REMOVE userId",
                  }),
                ),
              ),
          );

          await dynamo.send(
            new UpdateCommand({
              TableName: TABLE_NAME,
              Key: { pk: GROUP_PK, sk: playerId },
              UpdateExpression: "SET userId = :uid",
              ExpressionAttributeValues: { ":uid": userId },
            }),
          );

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ claimed: playerId }),
          };
        }

        await Promise.all(
          allPlayers
            .filter((p) => p.userId === userId)
            .map((p) =>
              dynamo.send(
                new UpdateCommand({
                  TableName: TABLE_NAME,
                  Key: { pk: GROUP_PK, sk: p.sk },
                  UpdateExpression: "REMOVE userId",
                }),
              ),
            ),
        );

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ claimed: null }),
        };
      }

      if (body.action === "UPDATE_BUYIN") {
        const { gameSk, playerId, delta } = body;
        if (!gameSk || !playerId || (delta !== 1 && delta !== -1)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: "gameSk, playerId and delta (+1/-1) required",
            }),
          };
        }

        try {
          await dynamo.send(
            new UpdateCommand({
              TableName: TABLE_NAME,
              Key: { pk: GROUP_PK, sk: gameSk },
              // Atomic increment/decrement on just this player's buyIns —
              // never touches the rest of the game item, so two people
              // adjusting different (or the same) player's buy-ins at the
              // same time can't clobber each other.
              UpdateExpression:
                "SET players.#pid.buyIns = players.#pid.buyIns + :delta",
              ConditionExpression:
                delta < 0
                  ? "players.#pid.buyIns > :floor"
                  : "attribute_exists(players.#pid.buyIns)",
              ExpressionAttributeNames: { "#pid": playerId },
              // DynamoDB rejects the whole request if any provided
              // ExpressionAttributeValues isn't referenced by the
              // expressions — :floor is only used on the decrement path.
              ExpressionAttributeValues:
                delta < 0 ? { ":delta": delta, ":floor": 1 } : { ":delta": delta },
            }),
          );
        } catch (err) {
          if (err.name !== "ConditionalCheckFailedException") throw err;
          // Already at the floor (or game/player vanished) — treat as a
          // no-op rather than an error.
        }

        return { statusCode: 200, headers, body: JSON.stringify({ updated: true }) };
      }

      if (body.action === "UPDATE_FINAL_CHIPS") {
        const { gameSk, playerId, finalChips } = body;
        if (!gameSk || !playerId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "gameSk and playerId required" }),
          };
        }
        const chips =
          finalChips === null || finalChips === undefined ? null : Number(finalChips);
        if (chips !== null && !(Number.isFinite(chips) && chips >= 0)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "Final chips must be 0 or more" }),
          };
        }

        try {
          await dynamo.send(
            new UpdateCommand({
              TableName: TABLE_NAME,
              Key: { pk: GROUP_PK, sk: gameSk },
              UpdateExpression: "SET players.#pid.finalChips = :chips",
              // Only while the game is running: a settled game's nets and
              // payouts were worked out from the chips it had at the time.
              ConditionExpression:
                "#status = :active AND attribute_exists(players.#pid)",
              ExpressionAttributeNames: { "#pid": playerId, "#status": "status" },
              ExpressionAttributeValues: { ":chips": chips, ":active": "ACTIVE" },
            }),
          );
        } catch (err) {
          if (err.name !== "ConditionalCheckFailedException") throw err;
          return {
            statusCode: 409,
            headers,
            body: JSON.stringify({ error: "That game isn't active anymore." }),
          };
        }

        return { statusCode: 200, headers, body: JSON.stringify({ updated: true }) };
      }

      if (body.action === "END_GAME") {
        // Read the game fresh from the table rather than trusting whatever
        // snapshot the client had lying around — buy-ins may have been
        // updated (by this user or someone else) since they loaded the page.
        const {
          game: clientGame,
          finalChips: clientChips = {},
          saveToHistory = true,
          includeInStats = true,
        } = body;
        if (!clientGame?.sk) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "Missing game reference" }),
          };
        }
        const gameRes = await dynamo.send(
          new GetCommand({ TableName: TABLE_NAME, Key: { pk: GROUP_PK, sk: clientGame.sk } }),
        );
        const game = gameRes.Item;
        if (!game || game.status !== "ACTIVE") {
          return {
            statusCode: 409,
            headers,
            body: JSON.stringify({
              error: "This game isn't active anymore. It may have already been settled.",
            }),
          };
        }
        if (!isPositiveNumber(game.buyInAmount) || !isPositiveNumber(game.chipsPerBuyIn)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: "This game has no buy-in amount or chips per buy-in, so it can't be settled.",
            }),
          };
        }

        // The chip counts typed into the settle screen come with this
        // request. Each box also saves on its own when you leave it, but
        // that save can still be in flight when Calculate is tapped, so it
        // can't be relied on here. A count this device doesn't have (null)
        // keeps whatever is saved, which may have come from someone else.
        const players = {};
        for (const [id, p] of Object.entries(game.players || {})) {
          const sent = clientChips[id];
          if (sent === null || sent === undefined) {
            players[id] = p;
            continue;
          }
          const chips = Number(sent);
          if (!Number.isFinite(chips) || chips < 0) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: `${p.name}'s final chips must be 0 or more` }),
            };
          }
          players[id] = { ...p, finalChips: chips };
        }

        const { expected, counted } = chipTotals(players, game.chipsPerBuyIn);
        if (counted !== expected) {
          const diff = Math.abs(expected - counted).toLocaleString("en-US");
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: `The chips don't add up: ${counted.toLocaleString("en-US")} counted but ${expected.toLocaleString("en-US")} were bought in (${diff} ${counted < expected ? "missing" : "extra"}). Recount before settling.`,
            }),
          };
        }

        const result = calculateSettlements(
          players,
          game.buyInAmount,
          game.chipsPerBuyIn,
        );

        // Both writes only go through if the game is still active, so a
        // double tap or a second person settling at the same moment can't
        // record it twice or delete a game someone else just saved.
        const stillActive = {
          ConditionExpression: "#status = :active",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: { ":active": "ACTIVE" },
        };
        const alreadySettled = {
          statusCode: 409,
          headers,
          body: JSON.stringify({
            error: "This game was just settled by someone else.",
          }),
        };

        if (!saveToHistory) {
          // Not saving to history — still clear the active game so the
          // group isn't stuck unable to start a new one.
          try {
            await dynamo.send(
              new DeleteCommand({
                TableName: TABLE_NAME,
                Key: { pk: GROUP_PK, sk: game.sk },
                ...stillActive,
              }),
            );
          } catch (err) {
            if (err.name !== "ConditionalCheckFailedException") throw err;
            return alreadySettled;
          }
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              settlements: result.settlements,
              saved: false,
            }),
          };
        }

        const countsForStats = hasPokerStats ? includeInStats : false;

        const completedGame = {
          ...game,
          pk: GROUP_PK,
          sk: game.sk,
          status: "COMPLETED",
          players: result.players,
          settlements: result.settlements,
          countsForStats,
          recordedBy: userId,
          completedAt: new Date().toISOString(),
        };

        try {
          await dynamo.send(
            new PutCommand({ TableName: TABLE_NAME, Item: completedGame, ...stillActive }),
          );
        } catch (err) {
          if (err.name !== "ConditionalCheckFailedException") throw err;
          return alreadySettled;
        }
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            ...completedGame,
            saved: true,
          }),
        };
      }

      if (body.pk === "GAME" && !body.sk) {
        const playerIds = Object.keys(body.players || {});
        if (!isPositiveNumber(body.buyInAmount) || !isPositiveNumber(body.chipsPerBuyIn)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: "Buy-in and chips per buy-in must both be more than 0.",
            }),
          };
        }
        if (playerIds.length < 2) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "A game needs at least 2 players." }),
          };
        }

        // Someone can only sit at one table at a time.
        const existing = await dynamo.send(
          new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "pk = :pk AND begins_with(sk, :game)",
            ExpressionAttributeValues: { ":pk": GROUP_PK, ":game": "GAME#" },
          }),
        );
        const seated = new Set(
          (existing.Items || [])
            .filter((g) => g.status === "ACTIVE")
            .flatMap((g) => Object.keys(g.players || {})),
        );
        const busy = playerIds.filter((id) => seated.has(id));
        if (busy.length > 0) {
          const names = busy.map((id) => body.players[id]?.name || "A player").join(", ");
          return {
            statusCode: 409,
            headers,
            body: JSON.stringify({
              error: `${names} ${busy.length === 1 ? "is" : "are"} already in another active game.`,
            }),
          };
        }
      }

      const prefix = body.pk === "GAME" ? "GAME#" : "PLAYER#";
      const item = {
        ...body,
        pk: GROUP_PK,
        sk: body.sk || `${prefix}${crypto.randomUUID()}`,
      };

      await dynamo.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(item),
      };
    }

    if (method === "DELETE" && path.startsWith("/poker/")) {
      const sk = decodeURIComponent(event.pathParameters.id);
      await dynamo.send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: { pk: GROUP_PK, sk },
        }),
      );
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: "Deleted" }),
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: "Not found" }),
    };
  } catch (error) {
    console.error("Lambda Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
