/* eslint-disable no-undef */
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const crypto = require("crypto");

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

function calculateSettlements(players, buyInAmount, chipsPerBuyIn) {
  let debtors = [];
  let creditors = [];
  let processedPlayers = {};

  // Calculate Net
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

  // Greedy match
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

  const userId =
    event.requestContext?.authorizer?.jwt?.claims?.sub || "PENDING_AUTH_USER";

  const playerPartitionKey = `USER#${userId}#PLAYER`;
  const gamePartitionKey = `USER#${userId}#GAME`;

  try {
    const method = event.requestContext.http.method;
    const path = event.requestContext.http.path;

    if (method === "GET" && path === "/poker") {
      const [playerData, gameData] = await Promise.all([
        dynamo.send(
          new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "pk = :pk",
            ExpressionAttributeValues: { ":pk": playerPartitionKey },
            ConsistentRead: true,
          }),
        ),
        dynamo.send(
          new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "pk = :pk",
            ExpressionAttributeValues: { ":pk": gamePartitionKey },
            ConsistentRead: true,
          }),
        ),
      ]);

      const players = (playerData.Items || []).map((p) => ({
        ...p,
        pk: "PLAYER",
      }));
      const games = (gameData.Items || []).map((g) => ({
        ...g,
        pk: "GAME",
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify([...players, ...games]),
      };
    }

    if (method === "POST" && path === "/poker") {
      const body = JSON.parse(event.body);
      const isGame =
        body.pk === "GAME" ||
        body.status === "ACTIVE" ||
        body.action === "END_GAME";
      const targetPk = isGame ? gamePartitionKey : playerPartitionKey;
      const cleanPk = isGame ? "GAME" : "PLAYER";

      if (body.action === "END_GAME") {
        const { game } = body;
        const result = calculateSettlements(
          game.players,
          game.buyInAmount,
          game.chipsPerBuyIn,
        );

        const completedGame = {
          ...game,
          pk: gamePartitionKey,
          sk: game.sk || crypto.randomUUID(),
          status: "COMPLETED",
          players: result.players,
          settlements: result.settlements,
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
            pk: "GAME",
          }),
        };
      }

      const item = {
        ...body,
        pk: targetPk,
        sk: body.sk || crypto.randomUUID(),
      };
      await dynamo.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ...item,
          pk: cleanPk,
        }),
      };
    }

    if (method === "DELETE" && path.startsWith("/poker/")) {
      const sk = event.pathParameters.id;
      const rawPk = event.queryStringParameters?.pk || "PLAYER";
      const isGame = rawPk.includes("GAME");
      const targetPk = isGame ? gamePartitionKey : playerPartitionKey;

      await dynamo.send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: { pk: targetPk, sk },
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
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
