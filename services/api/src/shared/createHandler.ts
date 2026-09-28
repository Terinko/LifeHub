import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { badRequest, HttpError, json, type HttpResponse } from "./http";
import {
  getProfile,
  hasPermission,
  isAdmin,
  recordToolUse,
  type UserProfile,
} from "./users";

export type RouteContext = {
  userId: string;
  profile: UserProfile | undefined;
  /** Parsed JSON body (undefined when there is none). */
  body: unknown;
  pathParameters: Record<string, string | undefined>;
  query: Record<string, string | undefined>;
  event: APIGatewayProxyEventV2WithJWTAuthorizer;
};

export type Route = (ctx: RouteContext) => Promise<HttpResponse>;

type Options = {
  /** Log prefix, e.g. "Applications". */
  name: string;
  /**
   * "admin" re-checks the caller's role on every request; `{ permission }`
   * requires that tool permission on the profile (admins always pass).
   */
  access: "user" | "admin" | { permission: string };
  /** Profile attribute stamped on each request, e.g. "lastUsedFantasy". */
  usageAttribute?: string;
  /** Keyed by the API Gateway route key, e.g. "DELETE /applications/{id}". */
  routes: Record<string, Route>;
};

function parseBody(raw: string | undefined): unknown {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    throw badRequest("Request body must be JSON");
  }
}

function isAllowed(
  access: Options["access"],
  profile: UserProfile | undefined,
) {
  if (access === "user") return true;
  if (access === "admin") return isAdmin(profile);
  return hasPermission(profile, access.permission);
}

function deniedMessage(access: Options["access"], name: string) {
  return access === "admin" ? "Admin only" : `${name} access required`;
}

/**
 * Wraps a tool's routes with what every LifeHub Lambda needs: the caller's
 * identity and profile, the access check, routing, JSON parsing, CORS
 * headers and one consistent error format.
 */
export function createHandler({
  name,
  access,
  usageAttribute,
  routes,
}: Options) {
  return async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer,
  ): Promise<APIGatewayProxyStructuredResultV2> => {
    const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
    if (typeof userId !== "string" || !userId) {
      return json(401, { error: "Unauthorized" });
    }

    try {
      const profile = await getProfile(userId);
      if (!isAllowed(access, profile)) {
        return json(403, { error: deniedMessage(access, name) });
      }
      if (usageAttribute) await recordToolUse(userId, usageAttribute);

      const route = routes[event.routeKey];
      if (!route) return json(404, { error: "Not found" });

      return await route({
        userId,
        profile,
        body: parseBody(event.body),
        pathParameters: event.pathParameters ?? {},
        query: event.queryStringParameters ?? {},
        event,
      });
    } catch (error) {
      if (error instanceof HttpError) {
        return json(error.statusCode, { error: error.message });
      }
      console.error(`${name} Handler Error:`, error);
      const message = error instanceof Error ? error.message : "Internal error";
      return json(500, { error: message });
    }
  };
}
