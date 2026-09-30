import { fetchWithTimeout } from "@/lib/hn/fetch-timeout";

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

  constructor(status: number, path: string) {
    super(`Pro API ${path} responded ${status}`);
    this.name = "ProApiError";
    this.status = status;
  }
}

const API_TIMEOUT_MS = 10_000;

/** Base URL of `apps/api`, without a trailing slash; empty when not configured. */
export function proApiBaseUrl(): string {
  return (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
}

async function request<T>(
  baseUrl: string,
  installId: string,
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: DeviceRegistration
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${installId}`,
    Accept: "application/json",
  };
  if (body) headers["Content-Type"] = "application/json";

  const response = await fetchWithTimeout(
    `${baseUrl}${path}`,
    { method, headers, body: body ? JSON.stringify(body) : undefined },
    API_TIMEOUT_MS
  );
  if (!response.ok) throw new ProApiError(response.status, path);
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
  };
}

export const proApi = createProApi();
