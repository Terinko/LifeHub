/* eslint-disable no-undef */
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
  GetCommand,
  DeleteCommand, // <-- Added Delete for DynamoDB
} = require("@aws-sdk/lib-dynamodb");
const {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminDeleteUserCommand, // <-- Added Delete for Cognito
} = require("@aws-sdk/client-cognito-identity-provider");

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const cognitoClient = new CognitoIdentityProviderClient({});

const TABLE_NAME = process.env.TABLE_NAME;
const USER_POOL_ID = process.env.USER_POOL_ID;

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

exports.handler = async (event) => {
  const method = event.requestContext.http.method;
  const callerSub = event.requestContext.authorizer?.jwt?.claims?.sub;

  try {
    // ==========================================
    // GET: Fetch users (or current user's profile)
    // ==========================================
    if (method === "GET") {
      if (event.queryStringParameters?.me === "true") {
        const callerPk = `USER#${callerSub}`;
        let profile = await docClient.send(
          new GetCommand({ TableName: TABLE_NAME, Key: { pk: callerPk } }),
        );

        if (!profile.Item) {
          const newRootAdmin = {
            pk: callerPk,
            email:
              event.requestContext.authorizer?.jwt?.claims?.email || "admin",
            role: "ADMIN",
            permissions: { bills: true, kitchen: true, poker: true },
            createdAt: new Date().toISOString(),
          };
          await docClient.send(
            new PutCommand({ TableName: TABLE_NAME, Item: newRootAdmin }),
          );
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(newRootAdmin),
          };
        }
        return { statusCode: 200, headers, body: JSON.stringify(profile.Item) };
      }

      const allUsers = await docClient.send(
        new ScanCommand({ TableName: TABLE_NAME }),
      );
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(allUsers.Items || []),
      };
    }

    // ==========================================
    // POST: Invite a new friend via Cognito
    // ==========================================
    if (method === "POST") {
      const body = JSON.parse(event.body);
      const { email, permissions } = body;

      if (!email)
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Email required" }),
        };

      const cognitoRes = await cognitoClient.send(
        new AdminCreateUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: email,
          UserAttributes: [
            { Name: "email", Value: email },
            { Name: "email_verified", Value: "true" },
          ],
          DesiredDeliveryMediums: ["EMAIL"],
        }),
      );

      const newSub = cognitoRes.User.Attributes.find(
        (a) => a.Name === "sub",
      ).Value;
      const newUserProfile = {
        pk: `USER#${newSub}`,
        email: email,
        role: "USER",
        permissions: permissions || {
          bills: false,
          kitchen: false,
          poker: false,
        },
        createdAt: new Date().toISOString(),
      };

      await docClient.send(
        new PutCommand({ TableName: TABLE_NAME, Item: newUserProfile }),
      );

      return { statusCode: 200, headers, body: JSON.stringify(newUserProfile) };
    }

    // ==========================================
    // PUT: Update an existing user's permissions
    // ==========================================
    if (method === "PUT") {
      const body = JSON.parse(event.body);
      await docClient.send(
        new PutCommand({ TableName: TABLE_NAME, Item: body }),
      );
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: "Updated" }),
      };
    }

    // ==========================================
    // DELETE: Remove user completely
    // ==========================================
    if (method === "DELETE") {
      const { pk, email } = JSON.parse(event.body);

      // Safety check: Don't let the admin delete themselves
      if (pk === `USER#${callerSub}`) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Cannot delete yourself" }),
        };
      }

      // 1. Delete from Cognito (Revokes their login access immediately)
      await cognitoClient.send(
        new AdminDeleteUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: email,
        }),
      );

      // 2. Delete their profile from DynamoDB
      await docClient.send(
        new DeleteCommand({ TableName: TABLE_NAME, Key: { pk } }),
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: "Deleted" }),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  } catch (error) {
    console.error("Admin Handler Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
