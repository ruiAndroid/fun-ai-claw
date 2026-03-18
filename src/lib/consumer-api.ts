import { appConfig } from "@/config/app-config";
import {
  clearUserCenterAuthState,
  getUserCenterAuthSnapshot,
  notifyUserCenterAuthRequired,
  refreshUserCenterAuth,
} from "@/lib/user-center-api";
import type { ListResponse } from "@/types/contracts";
import type {
  ConsumerAccount,
  ConsumerRobotAdoptionResponse,
  ConsumerRobotTemplateSummary,
  ConsumerBoundInstance,
  ConsumerChatSession,
  ConsumerChatSessionCreateRequest,
  ConsumerChatSessionMessage,
  CreateConsumerRobotRequest,
} from "@/types/consumer";

const BASE_URL = appConfig.controlApiBaseUrl;
const CONSUMER_ACCOUNT_KEY = "fun_claw_consumer_account";
const CONSUMER_BOOTSTRAP_KEY = "fun_claw_consumer_bootstrap_key";
let consumerSessionReadyKey: string | null = null;
let consumerSessionAccount: ConsumerAccount | null = null;
let consumerSessionBootstrapPromise: Promise<ConsumerAccount | null> | null = null;

function getStoredValue(key: string) {
  if (typeof window === "undefined") {
    return null;
  }
  const value = window.localStorage.getItem(key);
  return value && value.trim() ? value.trim() : null;
}

function setStoredValue(key: string, value?: string | null) {
  if (typeof window === "undefined") {
    return;
  }
  if (value && value.trim()) {
    window.localStorage.setItem(key, value.trim());
  } else {
    window.localStorage.removeItem(key);
  }
}

function getStoredConsumerAccount() {
  const raw = getStoredValue(CONSUMER_ACCOUNT_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as ConsumerAccount;
  } catch {
    setStoredValue(CONSUMER_ACCOUNT_KEY, null);
    return null;
  }
}

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

function getConsumerSessionKey() {
  const snapshot = getUserCenterAuthSnapshot();
  return [
    snapshot.tokenType?.trim() ?? "",
    snapshot.accessToken?.trim() ?? "",
    snapshot.refreshToken?.trim() ?? "",
    snapshot.sessionKey?.trim() ?? "",
  ].join("|");
}

function hasConsumerCredentials() {
  const snapshot = getUserCenterAuthSnapshot();
  return Boolean(snapshot.accessToken || snapshot.refreshToken);
}

function invalidateConsumerSessionBootstrap() {
  consumerSessionReadyKey = null;
  consumerSessionAccount = null;
  setStoredValue(CONSUMER_BOOTSTRAP_KEY, null);
  setStoredValue(CONSUMER_ACCOUNT_KEY, null);
}

function restoreCachedConsumerSession(bootstrapKey: string) {
  if (consumerSessionReadyKey === bootstrapKey && consumerSessionAccount) {
    return consumerSessionAccount;
  }

  const storedBootstrapKey = getStoredValue(CONSUMER_BOOTSTRAP_KEY);
  if (storedBootstrapKey !== bootstrapKey) {
    return null;
  }

  const storedAccount = getStoredConsumerAccount();
  if (!storedAccount) {
    setStoredValue(CONSUMER_BOOTSTRAP_KEY, null);
    return null;
  }

  consumerSessionReadyKey = storedBootstrapKey;
  consumerSessionAccount = storedAccount;
  return storedAccount;
}

function cacheConsumerSession(account: ConsumerAccount, bootstrapKey = getConsumerSessionKey()) {
  consumerSessionReadyKey = bootstrapKey;
  consumerSessionAccount = account;
  setStoredValue(CONSUMER_BOOTSTRAP_KEY, bootstrapKey);
  setStoredValue(CONSUMER_ACCOUNT_KEY, JSON.stringify(account));
}

async function buildRequestError(response: Response): Promise<Error> {
  const body = await response.text();
  let detail = body || response.statusText;

  if (body) {
    try {
      const parsed = JSON.parse(body) as { message?: string; detail?: string; msg?: string; error?: string };
      detail = parsed.message?.trim()
        || parsed.detail?.trim()
        || parsed.msg?.trim()
        || parsed.error?.trim()
        || detail;
    } catch {
      detail = body;
    }
  }

  return new Error(`HTTP ${response.status}: ${detail}`);
}

async function requestStrongConsumerJson<T>(path: string, init?: RequestInit, hasRetried = false): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: buildHeaders(init),
    cache: "no-store",
  });

  if (response.status === 401 && !hasRetried) {
    try {
      await refreshUserCenterAuth();
    } catch {
      clearUserCenterAuthState();
      invalidateConsumerSessionBootstrap();
    }
    return requestStrongConsumerJson<T>(path, init, true);
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearUserCenterAuthState();
      invalidateConsumerSessionBootstrap();
      notifyUserCenterAuthRequired();
    }
    throw await buildRequestError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("Content-Type") ?? "";
  if (!contentType.includes("application/json")) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function ensureConsumerSessionInitialized(force = false) {
  if (!hasConsumerCredentials()) {
    invalidateConsumerSessionBootstrap();
    return null;
  }

  const bootstrapKey = getConsumerSessionKey();
  if (!force) {
    const cachedAccount = restoreCachedConsumerSession(bootstrapKey);
    if (cachedAccount) {
      return cachedAccount;
    }
  }

  if (!consumerSessionBootstrapPromise || force) {
    consumerSessionBootstrapPromise = requestStrongConsumerJson<ConsumerAccount>("/app/v1/consumer/me")
      .then((account) => {
        cacheConsumerSession(account, getConsumerSessionKey());
        return account;
      })
      .finally(() => {
        consumerSessionBootstrapPromise = null;
      });
  }

  return consumerSessionBootstrapPromise;
}

async function requestConsumerJson<T>(path: string, init?: RequestInit, hasRetried = false): Promise<T> {
  await ensureConsumerSessionInitialized();

  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: buildHeaders(init),
    cache: "no-store",
  });

  if (response.status === 401 && !hasRetried) {
    invalidateConsumerSessionBootstrap();
    await ensureConsumerSessionInitialized(true);
    return requestConsumerJson<T>(path, init, true);
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearUserCenterAuthState();
      invalidateConsumerSessionBootstrap();
      notifyUserCenterAuthRequired();
    }
    throw await buildRequestError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("Content-Type") ?? "";
  if (!contentType.includes("application/json")) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function requestPublicJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw await buildRequestError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("Content-Type") ?? "";
  if (!contentType.includes("application/json")) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function listConsumerRobotTemplates() {
  return requestPublicJson<ListResponse<ConsumerRobotTemplateSummary>>("/app/v1/public/robot-templates");
}

export async function getCurrentConsumerAccount() {
  const account = await ensureConsumerSessionInitialized();
  if (!account) {
    throw new Error("HTTP 401: consumer authentication required");
  }
  return account;
}

export async function adoptConsumerRobot(request: CreateConsumerRobotRequest) {
  return requestConsumerJson<ConsumerRobotAdoptionResponse>("/app/v1/consumer/robots/adoptions", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function listConsumerInstances() {
  return requestConsumerJson<ListResponse<ConsumerBoundInstance>>("/app/v1/consumer/instances");
}

export async function listConsumerChatSessions(params?: { instanceId?: string; agentId?: string }) {
  const query = new URLSearchParams();
  if (params?.instanceId) {
    query.set("instanceId", params.instanceId);
  }
  if (params?.agentId) {
    query.set("agentId", params.agentId);
  }
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return requestConsumerJson<ListResponse<ConsumerChatSession>>(`/app/v1/chat/sessions${suffix}`);
}

export async function createConsumerChatSession(request: ConsumerChatSessionCreateRequest) {
  return requestConsumerJson<ConsumerChatSession>("/app/v1/chat/sessions", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function connectConsumerChatSession(sessionId: string, init?: RequestInit) {
  return requestConsumerJson<ConsumerChatSession>(`/app/v1/chat/sessions/${encodeURIComponent(sessionId)}/connect`, {
    ...init,
    method: "POST",
  });
}

export async function closeConsumerChatSession(sessionId: string) {
  return requestConsumerJson<ConsumerChatSession>(`/app/v1/chat/sessions/${encodeURIComponent(sessionId)}/close`, {
    method: "POST",
  });
}

export async function deleteConsumerChatSession(sessionId: string) {
  return requestConsumerJson<void>(`/app/v1/chat/sessions/${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
  });
}

export async function listConsumerChatSessionMessages(sessionId: string, limit?: number, init?: RequestInit) {
  const query = typeof limit === "number" ? `?limit=${encodeURIComponent(String(limit))}` : "";
  return requestConsumerJson<ListResponse<ConsumerChatSessionMessage>>(
    `/app/v1/chat/sessions/${encodeURIComponent(sessionId)}/messages${query}`,
    init,
  );
}
