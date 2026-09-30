import type { APIGatewayProxyStructuredResultV2 } from "aws-lambda";

export type HttpResponse = APIGatewayProxyStructuredResultV2;

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
  // API responses are per-user and often live (scores), so never cache them.
  "Cache-Control": "no-store",
};

export function json(statusCode: number, body: unknown): HttpResponse {
  return { statusCode, headers: HEADERS, body: JSON.stringify(body) };
}

/** Throw from anywhere in a route to send `{ error: message }` with this status. */
export class HttpError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
  }
}

export const badRequest = (message: string) => new HttpError(400, message);
export const notFound = (message: string) => new HttpError(404, message);

/**
 * JSON.parse of a raw body the way the older Lambdas did it: a missing or
 * malformed body throws a SyntaxError, so the caller gets a 500.
 */
export const parseBodyStrictly = (body: string | undefined): unknown =>
  JSON.parse(String(body));
