import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { badRequest, HttpError, json, type HttpResponse } from "./http";
import { getProfile, isAdmin, type UserProfile } from "./users";

export type RouteContext = {
  userId: string;
  profile: UserProfile | undefined;
  /** Parsed JSON body (undefined when there is none). */
  body: unknown;
  pathParameters: Record<string, string | undefined>;
  event: APIGatewayProxyEventV2WithJWTAuthorizer;
};

export type Route = (ctx: RouteContext) => Promise<HttpResponse>;

type Options = {
  /** Log prefix, e.g. "Applications". */
  name: string;
  /** "admin" re-checks the caller's role on every request. */
  access: "user" | "admin";
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

/**
 * Wraps a tool's routes with what every LifeHub Lambda needs: the caller's
 * identity and profile, the access check, routing, JSON parsing, CORS
 * headers and one consistent error format.
 */
export function createHandler({ name, access, routes }: Options) {
  return async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer,
  ): Promise<APIGatewayProxyStructuredResultV2> => {
    const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
    if (typeof userId !== "string" || !userId) {
      return json(401, { error: "Unauthorized" });
    }

    try {
      const profile = await getProfile(userId);
      if (access === "admin" && !isAdmin(profile)) {
        return json(403, { error: "Admin only" });
      }

      const route = routes[event.routeKey];
      if (!route) return json(404, { error: "Not found" });

      return await route({
        userId,
        profile,
        body: parseBody(event.body),
        pathParameters: event.pathParameters ?? {},
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
