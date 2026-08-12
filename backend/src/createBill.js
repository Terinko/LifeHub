/* eslint-disable no-undef */
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { randomUUID } = require("crypto");
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

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
      new PutCommand({
        TableName: process.env.TABLE_NAME,
        Item: newBill,
      }),
    );

    return {
      statusCode: 201,
      headers: { "Access-Control-Allow-Origin": "*" }, // CRITICAL
      body: JSON.stringify(newBill),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" }, // CRITICAL
      body: JSON.stringify({ error: error.message }),
    };
  }
};
