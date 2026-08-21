/* eslint-disable no-undef */
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  ScanCommand,
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

  try {
    const method = event.requestContext.http.method;
    const path = event.requestContext.http.path;

    if (method === "GET" && path === "/poker") {
      const data = await dynamo.send(
        new ScanCommand({ TableName: TABLE_NAME, ConsistentRead: true }),
      );
      return { statusCode: 200, headers, body: JSON.stringify(data.Items) };
    }

    if (method === "POST" && path === "/poker") {
      const body = JSON.parse(event.body);

      if (body.action === "END_GAME") {
        const { game } = body;
        const result = calculateSettlements(
          game.players,
          game.buyInAmount,
          game.chipsPerBuyIn,
        );

        const completedGame = {
          ...game,
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
          body: JSON.stringify(completedGame),
        };
      }

      const item = { pk: body.pk, sk: body.sk || crypto.randomUUID(), ...body };
      await dynamo.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
      return { statusCode: 200, headers, body: JSON.stringify(item) };
    }

    if (method === "DELETE" && path.startsWith("/poker/")) {
      const sk = event.pathParameters.id;
      const pk = event.queryStringParameters?.pk;
      await dynamo.send(
        new DeleteCommand({ TableName: TABLE_NAME, Key: { pk, sk } }),
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
