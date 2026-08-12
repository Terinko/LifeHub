/* eslint-disable no-undef */
const crypto = require("crypto");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  ScanCommand,
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

  const method = event.requestContext?.http?.method || event.httpMethod;

  try {
    switch (method) {
      // ==========================================
      // GET: Retrieve all bills (Attaches both 'id' and 'billId')
      // ==========================================
      case "GET": {
        const data = await docClient.send(
          new ScanCommand({ TableName: TABLE_NAME }),
        );

        // Map items so both 'id' and 'billId' are always present
        const items = (data.Items || []).map((item) => {
          const itemKey = item.id || item.billId || item._id;
          return {
            ...item,
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
      // POST: Create / Save a new bill
      // ==========================================
      case "POST": {
        const body = event.body ? JSON.parse(event.body) : {};
        const itemKey =
          body.id || body.billId || body._id || crypto.randomUUID();

        const newBill = {
          ...body,
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
          body: JSON.stringify(newBill),
        };
      }

      // ==========================================
      // DELETE: Delete a bill by ID
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
            id = body.id || body.billId || body._id;
          } catch (err) {
            console.error("Could not parse JSON body during DELETE:", err);
          }
        }

        // Guard against missing or string "undefined"/"null" IDs
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
            Key: { id },
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
