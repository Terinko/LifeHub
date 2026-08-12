/* eslint-disable no-undef */
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  const billId = event.queryStringParameters?.billId;

  if (billId) {
    await docClient.send(
      new DeleteCommand({ TableName: process.env.TABLE_NAME, Key: { billId } }),
    );
  }

  return {
    statusCode: 200,
    headers: { "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({ message: "Deleted" }),
  };
};
