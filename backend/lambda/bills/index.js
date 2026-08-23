/* eslint-disable no-undef */
const crypto = require("crypto");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
};

exports.handler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  const userId =
    event.requestContext?.authorizer?.jwt?.claims?.sub || "PENDING_AUTH_USER";
  const userPartitionKey = `USER#${userId}#BILL`;
  const method = event.requestContext?.http?.method || event.httpMethod;

  try {
    switch (method) {
      // ==========================================
      // GET: Retrieve strictly this user's bills
      // ==========================================
      case "GET": {
        const data = await docClient.send(
          new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "pk = :pk",
            ExpressionAttributeValues: {
              ":pk": userPartitionKey,
            },
          }),
        );

        const items = (data.Items || []).map((item) => {
          const itemKey = item.sk || item.id || item.billId || item._id;
          return {
            ...item,
            pk: "BILL",
            id: itemKey,
            billId: itemKey,
          };
        });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(items),
        };
      }

      // ==========================================
      // POST: Save a new bill strictly to user partition
      // ==========================================
      case "POST": {
        const body = event.body ? JSON.parse(event.body) : {};
        const itemKey =
          body.sk || body.id || body.billId || body._id || crypto.randomUUID();

        const newBill = {
          ...body,
          pk: userPartitionKey,
          sk: itemKey,
          id: itemKey,
          billId: itemKey,
        };

        await docClient.send(
          new PutCommand({
            TableName: TABLE_NAME,
            Item: newBill,
          }),
        );

        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({
            ...newBill,
            pk: "BILL",
          }),
        };
      }

      // ==========================================
      // DELETE: Delete bill by ID within user partition
      // ==========================================
      case "DELETE": {
        let id =
          event.queryStringParameters?.id ||
          event.queryStringParameters?.billId ||
          event.queryStringParameters?._id ||
          event.pathParameters?.id;

        if (!id && event.rawPath) {
          const pathSegments = event.rawPath.split("/").filter(Boolean);
          if (pathSegments.length > 1) {
            id = pathSegments[pathSegments.length - 1];
          }
        }

        if (!id && event.body) {
          try {
            const body = JSON.parse(event.body);
            id = body.id || body.billId || body._id || body.sk;
          } catch (err) {
            console.error("Could not parse JSON body during DELETE:", err);
          }
        }

        if (!id || id === "undefined" || id === "null") {
          console.error("DELETE failed: Invalid or undefined ID passed:", id);
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              message: "Invalid or missing bill ID",
            }),
          };
        }

        await docClient.send(
          new DeleteCommand({
            TableName: TABLE_NAME,
            Key: {
              pk: userPartitionKey,
              sk: id,
            },
          }),
        );

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: "Bill deleted successfully", id }),
        };
      }

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ message: `Method ${method} Not Allowed` }),
        };
    }
  } catch (error) {
    console.error("Handler error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: "Internal Server Error",
        error: error.message,
      }),
    };
  }
};
