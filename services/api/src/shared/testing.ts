// Helpers for handler tests (not bundled: no handler imports this).
import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";

/** What a mocked `db.send` / client `send` receives. */
export type CommandLike = {
  constructor: { name: string };
  input: Record<string, unknown>;
};

type EventOptions = {
  /** Sent as JSON; a string is sent as-is (to test bad bodies). */
  body?: unknown;
  query?: Record<string, string>;
  pathParameters?: Record<string, string>;
  claims?: Record<string, string>;
};

/** An API Gateway HTTP API event for `routeKey` from user "u1". */
export function apiEvent(
  routeKey: string,
  { body, query, pathParameters, claims }: EventOptions = {},
): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    routeKey,
    body:
      body === undefined || typeof body === "string"
        ? body
        : JSON.stringify(body),
    queryStringParameters: query,
    pathParameters,
    requestContext: {
      authorizer: { jwt: { claims: { sub: "u1", ...claims } } },
    },
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;
}

/** Status and parsed body of a handler response. */
export const parseResponse = (res: APIGatewayProxyStructuredResultV2) => ({
  status: res.statusCode,
  body: JSON.parse(res.body ?? "null"),
});

/** The commands sent so far, by class name, with their input. */
export const sentCommands = (send: { mock: { calls: unknown[][] } }) =>
  send.mock.calls.map(([cmd]) => {
    const c = cmd as CommandLike;
    return { name: c.constructor.name, input: c.input };
  });
