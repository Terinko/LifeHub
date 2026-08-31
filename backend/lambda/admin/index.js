/* eslint-disable no-undef */
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
  GetCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
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
  const isSelfLookup =
    method === "GET" && event.queryStringParameters?.me === "true";

  try {
    // 1. INLINE AUTHORIZATION CHECK
    if (!isSelfLookup) {
      const callerRes = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { pk: `USER#${callerSub}` },
        }),
      );
      const callerProfile = callerRes.Item;

      if (callerProfile?.role !== "ADMIN") {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: "Admin only" }),
        };
      }
    }

    // ==========================================
    // GET: Fetch users (or current user's profile)
    // ==========================================
    if (method === "GET") {
      if (isSelfLookup) {
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
            permissions: {
              bills: true,
              kitchen: true,
              poker: true,
              pokerStats: true,
              fantasy: true,
            },
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
          pokerStats: false,
          fantasy: false,
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
      const { pk, permissions } = JSON.parse(event.body);

      // FIX: Fetch existing user and only update permissions to prevent role overriding
      const targetUser = await docClient.send(
        new GetCommand({ TableName: TABLE_NAME, Key: { pk } }),
      );

      if (!targetUser.Item) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: "User not found" }),
        };
      }

      targetUser.Item.permissions = permissions;

      await docClient.send(
        new PutCommand({ TableName: TABLE_NAME, Item: targetUser.Item }),
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

      if (pk === `USER#${callerSub}`) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Cannot delete yourself" }),
        };
      }

      await cognitoClient.send(
        new AdminDeleteUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: email,
        }),
      );

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
