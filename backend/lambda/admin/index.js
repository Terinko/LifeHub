/* eslint-disable no-undef */
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
  GetCommand,
  DeleteCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
} = require("@aws-sdk/client-cognito-identity-provider");

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const cognitoClient = new CognitoIdentityProviderClient({});
const CHANGELOG = require("./changelog.json");

const TABLE_NAME = process.env.TABLE_NAME;
const USER_POOL_ID = process.env.USER_POOL_ID;

// Anyone with an account before "What's New" shipped gets backfilled to
// this fixed point (the day before it went out) instead of "now", so the
// entries dated on/after launch still surface once, but nothing older
// floods in as a giant backlog. New users created afterward start caught
// up (see the POST handler below), since there's nothing for them to miss.
const CHANGELOG_EPOCH = "2026-09-07T00:00:00.000Z";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

function getUnseenChangelog(userProfile) {
  const lastSeen = userProfile.lastSeenChangelogAt || CHANGELOG_EPOCH;
  const isAdminRole = userProfile.role === "ADMIN";
  return CHANGELOG.filter((entry) => new Date(entry.date) > new Date(lastSeen))
    .filter(
      (entry) =>
        isAdminRole ||
        !entry.tools ||
        entry.tools.length === 0 ||
        entry.tools.some((t) => userProfile.permissions?.[t]),
    )
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

exports.handler = async (event) => {
  const method = event.requestContext.http.method;
  const path = event.requestContext.http.path;
  const callerSub = event.requestContext.authorizer?.jwt?.claims?.sub;
  const isSelfLookup =
    method === "GET" && event.queryStringParameters?.me === "true";
  const isMarkChangelogSeen =
    method === "POST" && path === "/admin/changelog-seen";

  try {
    // 1. INLINE AUTHORIZATION CHECK
    if (!isSelfLookup && !isMarkChangelogSeen) {
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

        const now = new Date().toISOString();

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
            createdAt: now,
            lastActiveAt: now,
            lastSeenChangelogAt: now,
          };
          await docClient.send(
            new PutCommand({ TableName: TABLE_NAME, Item: newRootAdmin }),
          );
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ ...newRootAdmin, unseenChangelog: [] }),
          };
        }

        // Backfill lastSeenChangelogAt for pre-existing accounts (only if
        // missing) so the "What's New" popup has a real baseline instead of
        // defaulting to the epoch on every single request.
        await docClient
          .send(
            new UpdateCommand({
              TableName: TABLE_NAME,
              Key: { pk: callerPk },
              UpdateExpression:
                "SET lastActiveAt = :now, lastSeenChangelogAt = if_not_exists(lastSeenChangelogAt, :now)",
              ExpressionAttributeValues: { ":now": now },
            }),
          )
          .catch((err) => console.error("Failed to record last active:", err));

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            ...profile.Item,
            lastActiveAt: now,
            unseenChangelog: getUnseenChangelog(profile.Item),
          }),
        };
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
    // POST /admin/changelog-seen: dismiss the "What's New" popup
    // ==========================================
    if (isMarkChangelogSeen) {
      await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { pk: `USER#${callerSub}` },
          UpdateExpression: "SET lastSeenChangelogAt = :now",
          ExpressionAttributeValues: { ":now": new Date().toISOString() },
        }),
      );
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
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
        // New invitees start caught up on "What's New" — there's nothing
        // for them to have missed, so don't dump the backlog on them.
        lastSeenChangelogAt: new Date().toISOString(),
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
