import type { APIGatewayProxyStructuredResultV2 } from "aws-lambda";

export type HttpResponse = APIGatewayProxyStructuredResultV2;

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
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
