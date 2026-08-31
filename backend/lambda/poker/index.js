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

function calculateSettlements(players, buyInAmount, chipsPerBuyIn) {
  let debtors = [];
  let creditors = [];
  let processedPlayers = {};

  for (const [id, p] of Object.entries(players)) {
    const chipValue = (p.finalChips / chipsPerBuyIn) * buyInAmount;
    const totalSpent = p.buyIns * buyInAmount;
    const net = Math.round((chipValue - totalSpent) * 100) / 100;

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
    const debt = debtors[d].amount;
    const credit = creditors[c].amount;
    const payment = Math.min(debt, credit);

    if (payment > 0) {
      settlements.push({
        from: debtors[d].name,
        fromId: debtors[d].id,
        to: creditors[c].name,
        toId: creditors[c].id,
        amount: payment,
      });
    }

    debtors[d].amount -= payment;
    creditors[c].amount -= payment;

    if (debtors[d].amount < 0.01) d++;
    if (creditors[c].amount < 0.01) c++;
  }

  return { players: processedPlayers, settlements };
}

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

      if (body.action === "END_GAME") {
        const { game, saveToHistory = true, includeInStats = true } = body;
        const result = calculateSettlements(
          game.players,
          game.buyInAmount,
          game.chipsPerBuyIn,
        );

        if (!saveToHistory) {
          // Not saving to history — still clear the active game so the
          // group isn't stuck unable to start a new one.
          if (game.sk) {
            await dynamo.send(
              new DeleteCommand({
                TableName: TABLE_NAME,
                Key: { pk: GROUP_PK, sk: game.sk },
              }),
            );
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
          sk:
            game.sk ||
            `GAME#${new Date().toISOString()}#${crypto.randomUUID()}`,
          status: "COMPLETED",
          players: result.players,
          settlements: result.settlements,
          countsForStats,
          recordedBy: userId,
          completedAt: new Date().toISOString(),
        };

        await dynamo.send(
          new PutCommand({ TableName: TABLE_NAME, Item: completedGame }),
        );
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            ...completedGame,
            saved: true,
          }),
        };
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
      const sk = event.pathParameters.id;
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
