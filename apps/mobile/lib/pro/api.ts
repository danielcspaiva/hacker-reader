import { fetchWithTimeout } from "@/lib/hn/fetch-timeout";

import { isJsonObject, isJsonString, type JsonValue } from "./json";
import { parseSummaryResult, type StorySummaryResult } from "./summary";

export type DevicePlatform = "ios" | "android";

export interface DeviceRegistration {
  platform: DevicePlatform;
  appVersion: string;
  timezone: string;
  /** `null` clears the stored value, omitted keeps it. */
  expoPushToken?: string | null;
  hnUsername?: string | null;
  prefs?: { [key: string]: boolean | number | string | string[] };
}

export interface ProMe {
  pro: boolean;
  expiresAt?: string;
  features: string[];
}

export class ProApiError extends Error {
  readonly status: number;
  /** The API's `error.code` (for example `daily_limit`), when it sent one. */
  readonly code: string | undefined;

  constructor(status: number, path: string, code?: string) {
    super(`Pro API ${path} responded ${status}`);
    this.name = "ProApiError";
    this.status = status;
    this.code = code;
  }
}

const API_TIMEOUT_MS = 10_000;
/** A summary that has to be generated can take up to a minute. */
const SUMMARY_TIMEOUT_MS = 65_000;

async function errorCode(response: Response): Promise<string | undefined> {
  try {
    const body: JsonValue = await response.json();
    const error = isJsonObject(body) ? body.error : undefined;
    const code = isJsonObject(error) ? error.code : undefined;
    return isJsonString(code) ? code : undefined;
  } catch {
    return undefined;
  }
}

/** Base URL of `apps/api`, without a trailing slash; empty when not configured. */
export function proApiBaseUrl(): string {
  return (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
}

async function request<T>(
  baseUrl: string,
  installId: string,
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: DeviceRegistration,
  timeoutMs: number = API_TIMEOUT_MS
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${installId}`,
    Accept: "application/json",
  };
  if (body) headers["Content-Type"] = "application/json";

  const response = await fetchWithTimeout(
    `${baseUrl}${path}`,
    { method, headers, body: body ? JSON.stringify(body) : undefined },
    timeoutMs
  );
  if (!response.ok) {
    throw new ProApiError(response.status, path, await errorCode(response));
  }
  return response.json();
}

/** Typed client for `apps/api`. `baseUrl` defaults to `EXPO_PUBLIC_API_URL`. */
export function createProApi(configuredUrl: string = proApiBaseUrl()) {
  const baseUrl = configuredUrl.replace(/\/+$/, "");
  return {
    isConfigured: baseUrl.length > 0,
    registerDevice: (installId: string, device: DeviceRegistration) =>
      request<{ installId: string }>(
        baseUrl,
        installId,
        "POST",
        "/api/v1/devices",
        device
      ),
    deleteProData: (installId: string) =>
      request<{ deleted: boolean }>(
        baseUrl,
        installId,
        "DELETE",
        "/api/v1/devices"
      ),
    getMe: (installId: string) =>
      request<ProMe>(baseUrl, installId, "GET", "/api/v1/me"),
    /** `generating` (HTTP 202) means: ask again in a few seconds. */
    getStorySummary: async (
      installId: string,
      storyId: number
    ): Promise<StorySummaryResult> => {
      const path = `/api/v1/summaries/story/${storyId}`;
      const body = await request<JsonValue>(
        baseUrl,
        installId,
        "GET",
        path,
        undefined,
        SUMMARY_TIMEOUT_MS
      );
      const result = parseSummaryResult(body);
      if (!result) throw new ProApiError(502, path, "invalid_response");
      return result;
    },
  };
}

export const proApi = createProApi();
