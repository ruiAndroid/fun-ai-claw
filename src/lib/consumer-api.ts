import { appConfig } from "@/config/app-config";
import { clearUserCenterAuthState, getUserCenterAuthSnapshot, getUserCenterMe } from "@/lib/user-center-api";
import type { ListResponse } from "@/types/contracts";
import type { ConsumerAccount, ConsumerBoundInstance } from "@/types/consumer";

const BASE_URL = appConfig.controlApiBaseUrl;

function buildHeaders(init?: RequestInit) {
  const snapshot = getUserCenterAuthSnapshot();
  const headers = new Headers(init?.headers ?? {});
  headers.set("Content-Type", "application/json");

  if (snapshot.accessToken) {
    headers.set("Authorization", `Bearer ${snapshot.accessToken}`);
  }
  if (snapshot.refreshToken) {
    headers.set("X-Consumer-Refresh-Token", snapshot.refreshToken);
  }
  if (snapshot.tokenType) {
    headers.set("X-Consumer-Token-Type", snapshot.tokenType);
  }
  if (snapshot.accessTokenExpiresAt) {
    headers.set("X-Consumer-Access-Token-Expires-At", snapshot.accessTokenExpiresAt);
  }
  if (snapshot.refreshTokenExpiresAt) {
    headers.set("X-Consumer-Refresh-Token-Expires-At", snapshot.refreshTokenExpiresAt);
  }
  headers.set("X-Consumer-Session-Key", snapshot.sessionKey);

  return headers;
}

async function buildRequestError(response: Response): Promise<Error> {
  const body = await response.text();
  let detail = body || response.statusText;

  if (body) {
    try {
      const parsed = JSON.parse(body) as { message?: string; detail?: string; error?: string };
      detail = parsed.message?.trim() || parsed.detail?.trim() || parsed.error?.trim() || detail;
    } catch {
      detail = body;
    }
  }

  return new Error(`HTTP ${response.status}: ${detail}`);
}

async function requestConsumerJson<T>(path: string, init?: RequestInit, hasRetried = false): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: buildHeaders(init),
    cache: "no-store",
  });

  if (response.status === 401 && !hasRetried) {
    try {
      await getUserCenterMe();
    } catch {
      clearUserCenterAuthState();
    }
    return requestConsumerJson<T>(path, init, true);
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearUserCenterAuthState();
    }
    throw await buildRequestError(response);
  }

  return (await response.json()) as T;
}

export async function getConsumerAccount() {
  return requestConsumerJson<ConsumerAccount>("/app/v1/consumer/me");
}

export async function listConsumerInstances() {
  return requestConsumerJson<ListResponse<ConsumerBoundInstance>>("/app/v1/consumer/instances");
}
