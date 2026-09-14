/* eslint-disable no-undef */
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
  DeleteCommand,
  UpdateCommand,
  GetCommand,
} = require("@aws-sdk/lib-dynamodb");
const crypto = require("crypto");

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;
const USERS_TABLE = process.env.USERS_TABLE;

const STATUSES = [
  "Applied",
  "Phone Screen",
  "Interview",
  "Offer",
  "Rejected",
  "Withdrawn",
];

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };
  const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;

  if (!userId)
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: "Unauthorized" }),
    };

  try {
    // Admin-only tool — re-verify server-side on every request regardless
    // of what the frontend shows, same as every other tool in this app.
    const callerRes = await dynamo.send(
      new GetCommand({
        TableName: USERS_TABLE,
        Key: { pk: `USER#${userId}` },
      }),
    );
    if (callerRes.Item?.role !== "ADMIN") {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: "Admin only" }),
      };
    }

    const method = event.requestContext.http.method;
    const path = event.requestContext.http.path;
    const PK = `USER#${userId}#APPLICATION`;

    if (method === "GET" && path === "/applications") {
      const data = await dynamo.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: "pk = :pk",
          ExpressionAttributeValues: { ":pk": PK },
          ConsistentRead: true,
        }),
      );
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(data.Items || []),
      };
    }

    if (method === "POST" && path === "/applications") {
      const body = JSON.parse(event.body);

      // Quick status change from the board's "Move to →" control — an
      // atomic single-field update instead of resubmitting the whole card.
      if (body.action === "UPDATE_STATUS") {
        const { sk, status } = body;
        if (!sk || !STATUSES.includes(status)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "Invalid status update" }),
          };
        }
        const now = new Date().toISOString();
        await dynamo.send(
          new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { pk: PK, sk },
            UpdateExpression: "SET #status = :status, updatedAt = :now",
            ExpressionAttributeNames: { "#status": "status" },
            ExpressionAttributeValues: { ":status": status, ":now": now },
          }),
        );
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, sk, status, updatedAt: now }),
        };
      }

      // Create or full update (an existing sk means "edit this one").
      if (!body.company?.trim() || !body.position?.trim()) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Company and position are required" }),
        };
      }

      const now = new Date().toISOString();
      const item = {
        pk: PK,
        sk: body.sk || crypto.randomUUID(),
        company: body.company.trim(),
        position: body.position.trim(),
        location: body.location || "",
        status: STATUSES.includes(body.status) ? body.status : "Applied",
        dateApplied: body.dateApplied || now.slice(0, 10),
        url: body.url || "",
        source: body.source || "",
        salaryRange: body.salaryRange || "",
        contact: body.contact || "",
        notes: body.notes || "",
        createdAt: body.createdAt || now,
        updatedAt: now,
      };

      await dynamo.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
      return { statusCode: 200, headers, body: JSON.stringify(item) };
    }

    if (method === "DELETE" && path.startsWith("/applications/")) {
      const sk = decodeURIComponent(event.pathParameters.id);
      await dynamo.send(
        new DeleteCommand({ TableName: TABLE_NAME, Key: { pk: PK, sk } }),
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
    console.error("Applications Handler Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
