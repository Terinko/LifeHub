/* eslint-disable no-undef */
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { randomUUID } = require("crypto");
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  const body = JSON.parse(event.body);
  const newBill = { billId: randomUUID(), ...body };

  await docClient.send(
    new PutCommand({ TableName: process.env.TABLE_NAME, Item: newBill }),
  );

  return {
    statusCode: 201,
    headers: { "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify(newBill),
  };
};
