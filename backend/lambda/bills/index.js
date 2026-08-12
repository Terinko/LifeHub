/* eslint-disable no-undef */
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { randomUUID } = require("crypto");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "Content-Type,X-Amz-Date,Authorization,X-Api-Key",
  "Access-Control-Allow-Methods": "OPTIONS,GET,POST,DELETE",
};

exports.handler = async (event) => {
  const method = event.httpMethod || event.requestContext?.http?.method;

  try {
    // 1. GET ALL BILLS
    if (method === "GET") {
      const data = await docClient.send(
        new ScanCommand({ TableName: TABLE_NAME }),
      );
      return { statusCode: 200, headers, body: JSON.stringify(data.Items) };
    }

    // 2. CREATE A BILL
    if (method === "POST") {
      const body = JSON.parse(event.body || "{}");
      const newBill = {
        billId: randomUUID(),
        name: body.name,
        amount: body.amount,
        payeeName: body.payeeName,
        dueDayOfMonth: body.dueDayOfMonth,
        endDate: body.endDate || null,
        lastPaidMonth: "never",
      };

      await docClient.send(
        new PutCommand({ TableName: TABLE_NAME, Item: newBill }),
      );
      return { statusCode: 201, headers, body: JSON.stringify(newBill) };
    }

    // 3. DELETE A BILL
    if (method === "DELETE") {
      const queryParams = event.queryStringParameters || {};
      const billId = queryParams.billId;

      if (!billId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Missing billId" }),
        };
      }

      await docClient.send(
        new DeleteCommand({ TableName: TABLE_NAME, Key: { billId } }),
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
      body: JSON.stringify({ error: "Route not found" }),
    };
  } catch (error) {
    console.error("Handler error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
