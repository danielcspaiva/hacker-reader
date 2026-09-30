import type { JsonValue } from "./json";

const NO_STORE = { "Cache-Control": "no-store" };

export function json<T>(
  data: T,
  status = 200,
  headers: Record<string, string> = {}
): Response {
  return Response.json(data, {
    status,
    headers: { ...NO_STORE, ...headers },
  });
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  headers: Record<string, string> = {}
): Response {
  return json({ error: { code, message } }, status, headers);
}

/** Parses a JSON request body; null when it is missing or not valid JSON. */
export async function readJson(req: Request): Promise<JsonValue> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
