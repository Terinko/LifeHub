import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

export type CommandLike = {
  constructor: { name: string };
  input: Record<string, unknown>;
};

export type Stored = Record<string, unknown> & { pk: string; sk: string };
export const table: Stored[] = [];

export function event(
  routeKey: string,
  body?: unknown,
  pathParameters?: Record<string, string>,
  query?: Record<string, string>,
): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    routeKey,
    body: body === undefined ? undefined : JSON.stringify(body),
    pathParameters,
    queryStringParameters: query,
    requestContext: { authorizer: { jwt: { claims: { sub: "u1" } } } },
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;
}

// A tiny in-memory table that understands the commands Kitchen sends.
export function fakeDb(cmd: CommandLike) {
  const input = cmd.input as unknown as {
    ExpressionAttributeValues: Record<string, string>;
    Item: Stored;
    Key: Stored;
    RequestItems: Record<string, unknown[]>;
  };
  switch (cmd.constructor.name) {
    case "GetCommand":
      return { Item: { role: "USER" } };
    case "UpdateCommand":
      return {};
    case "QueryCommand": {
      const pk = input.ExpressionAttributeValues[":pk"];
      return { Items: table.filter((i) => i.pk === pk) };
    }
    case "PutCommand":
      put(input.Item);
      return {};
    case "DeleteCommand":
      drop(input.Key);
      return {};
    case "BatchWriteCommand": {
      const reqs = input.RequestItems.Kitchen;
      for (const r of reqs as Record<string, { Item: Stored; Key: Stored }>[]) {
        if (r.PutRequest) put(r.PutRequest.Item);
        if (r.DeleteRequest) drop(r.DeleteRequest.Key);
      }
      return {};
    }
  }
  throw new Error(`Unexpected ${cmd.constructor.name}`);
}
export const drop = (key: { pk: string; sk: string }) => {
  const i = table.findIndex((t) => t.pk === key.pk && t.sk === key.sk);
  if (i !== -1) table.splice(i, 1);
};
export const put = (item: Stored) => {
  drop(item);
  table.push(item);
};
