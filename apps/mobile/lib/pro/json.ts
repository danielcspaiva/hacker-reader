/** JSON as parsed from the Pro API, with the guards to narrow it. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export function isJsonObject(
  value: JsonValue | undefined
): value is { [key: string]: JsonValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isJsonString(value: JsonValue | undefined): value is string {
  return typeof value === "string";
}

export function isJsonNumber(value: JsonValue | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
