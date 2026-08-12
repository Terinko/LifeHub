/* eslint-disable no-undef */
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  try {
    const billId = event.queryStringParameters.billId;

    await docClient.send(
      new DeleteCommand({
        TableName: process.env.TABLE_NAME,
        Key: { billId: billId },
      }),
    );

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" }, // CRITICAL
      body: JSON.stringify({ message: "Deleted" }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" }, // CRITICAL
      body: JSON.stringify({ error: "Failed to delete" }),
    };
  }
};
