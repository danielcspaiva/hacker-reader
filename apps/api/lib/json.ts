export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

export function isJsonObject(
  value: JsonValue | undefined
): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isString(value: JsonValue | undefined): value is string {
  return typeof value === "string";
}

export function isBoolean(value: JsonValue | undefined): value is boolean {
  return typeof value === "boolean";
}

export function isFiniteNumber(value: JsonValue | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isStringArray(value: JsonValue | undefined): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

/** The object under `key`, when `value` is an object holding one. */
export function getObject(
  value: JsonValue | undefined,
  key: string
): JsonObject | undefined {
  if (!isJsonObject(value)) return undefined;
  const child = value[key];
  return isJsonObject(child) ? child : undefined;
}
