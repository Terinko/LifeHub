/* eslint-disable no-undef */
const crypto = require("crypto");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
  DeleteCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;
const USERS_TABLE = process.env.USERS_TABLE;

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
};

const FREQUENCIES = ["monthly", "biweekly", "quarterly", "yearly", "once"];
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const reply = (statusCode, body) => ({
  statusCode,
  headers,
  body: JSON.stringify(body),
});
const invalid = (error) => reply(400, { error });

/**
 * Checks a bill before it's saved. Returns an error message for the person,
 * or null when the bill is fine. Older bills (no frequency) are monthly.
 */
function validateBill(bill) {
  if (!bill || typeof bill !== "object") return "Send the bill as JSON.";
  const name = typeof bill.name === "string" ? bill.name.trim() : "";
  if (!name) return "Give the bill a name.";
  if (name.length > 100) return "Keep the name under 100 characters.";
  if (typeof bill.amount !== "number" || !Number.isFinite(bill.amount) || bill.amount < 0)
    return "The amount has to be a number of dollars, 0 or more.";
  const frequency = bill.frequency ?? "monthly";
  if (!FREQUENCIES.includes(frequency)) return "Pick how often the bill repeats.";
  if (frequency === "monthly") {
    const day = bill.dueDayOfMonth;
    if (!Number.isInteger(day) || day < 1 || day > 31)
      return "The due day has to be between 1 and 31.";
  } else if (typeof bill.anchorDate !== "string" || !DAY.test(bill.anchorDate)) {
    return "Pick the next due date.";
  }
  for (const key of ["startMonth", "endDate"]) {
    const v = bill[key];
    if (v !== undefined && v !== null && !(typeof v === "string" && MONTH.test(v)))
      return `${key === "endDate" ? "End" : "Start"} month has to look like 2026-09.`;
  }
  if (bill.startMonth && bill.endDate && bill.endDate < bill.startMonth)
    return "The bill can't end before it starts.";
  if (bill.payers !== undefined) {
    if (!Array.isArray(bill.payers) || bill.payers.length > 20)
      return "A bill can be split with up to 20 people.";
    for (const p of bill.payers) {
      if (!p || typeof p.id !== "string" || typeof p.name !== "string")
        return "Each person on a split needs a name.";
      if (p.share !== undefined && p.share !== null &&
          (typeof p.share !== "number" || !Number.isFinite(p.share) || p.share < 0))
        return "Each share has to be a number of dollars, 0 or more.";
    }
  }
  return null;
}

async function recordUsage(userId) {
  if (!USERS_TABLE || userId === "PENDING_AUTH_USER") return;
  await docClient
    .send(
      new UpdateCommand({
        TableName: USERS_TABLE,
        Key: { pk: `USER#${userId}` },
        UpdateExpression: "SET lastUsedBills = :now",
        ExpressionAttributeValues: { ":now": new Date().toISOString() },
      }),
    )
    .catch((err) => console.error("Failed to record bills usage:", err));
}

function idFrom(event) {
  let id =
    event.queryStringParameters?.id ||
    event.queryStringParameters?.billId ||
    event.pathParameters?.id;
  if (!id && event.body) {
    try {
      const body = JSON.parse(event.body);
      id = body.id || body.billId || body.sk;
    } catch {
      // No usable body; fall through to the missing-id reply.
    }
  }
  return id && id !== "undefined" && id !== "null" ? id : null;
}

exports.handler = async (event) => {
  const userId =
    event.requestContext?.authorizer?.jwt?.claims?.sub || "PENDING_AUTH_USER";
  const userPartitionKey = `USER#${userId}#BILL`;
  const method = event.requestContext?.http?.method || event.httpMethod;

  try {
    // The Hub's summary peek doesn't count as opening Bills.
    if (!(method === "GET" && event.queryStringParameters?.summary))
      await recordUsage(userId);

    switch (method) {
      case "GET": {
        const data = await docClient.send(
          new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "pk = :pk",
            ExpressionAttributeValues: { ":pk": userPartitionKey },
          }),
        );
        const items = (data.Items || []).map((item) => {
          const itemKey = item.sk || item.id || item.billId;
          return { ...item, pk: "BILL", id: itemKey, billId: itemKey };
        });
        return reply(200, items);
      }

      case "POST":
      case "PUT": {
        let body;
        try {
          body = event.body ? JSON.parse(event.body) : null;
        } catch {
          return invalid("Send the bill as JSON.");
        }
        const problem = validateBill(body);
        if (problem) return invalid(problem);

        const itemKey =
          event.pathParameters?.id ||
          body.sk ||
          body.id ||
          body.billId ||
          crypto.randomUUID();
        const bill = {
          ...body,
          name: body.name.trim(),
          pk: userPartitionKey,
          sk: itemKey,
          id: itemKey,
          billId: itemKey,
          updatedAt: new Date().toISOString(),
        };
        await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: bill }));
        return reply(method === "POST" ? 201 : 200, { ...bill, pk: "BILL" });
      }

      case "DELETE": {
        const id = idFrom(event);
        if (!id) return invalid("Which bill? The id is missing.");
        await docClient.send(
          new DeleteCommand({
            TableName: TABLE_NAME,
            Key: { pk: userPartitionKey, sk: id },
          }),
        );
        return reply(200, { message: "Bill deleted", id });
      }

      default:
        return reply(405, { error: `Method ${method} isn't supported.` });
    }
  } catch (error) {
    console.error("Handler error:", error);
    return reply(500, { error: "Something went wrong saving your bills. Try again." });
  }
};

exports.validateBill = validateBill;
