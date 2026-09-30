import { fetchAuthSession } from "aws-amplify/auth";
import { API_BASE } from "../../config";

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();
  if (!token) throw new ApiError(401, "Not signed in", null);
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function errorMessage(body: unknown, res: Response): string {
  if (body && typeof body === "object" && "error" in body) {
    const { error } = body as { error: unknown };
    if (typeof error === "string") return error;
  }
  return res.statusText || `Request failed (${res.status})`;
}

async function request<T>(
  method: Method,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: await getAuthHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await parseBody(res);
  if (!res.ok) throw new ApiError(res.status, errorMessage(data, res), data);
  return data as T;
}

/**
 * The one way features talk to the LifeHub API: adds the base URL and the
 * signed-in user's token, parses JSON, and throws ApiError on a non-2xx.
 */
export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string, body?: unknown) => request<T>("DELETE", path, body),
};
