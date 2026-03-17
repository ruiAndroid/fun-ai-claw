"use client";

import { appConfig } from "@/config/app-config";
import type {
  UserCenterAuthResponse,
  UserCenterMe,
  UserCenterRefreshTokenRequest,
  UserCenterSmsSendCodeRequest,
  UserCenterSmsSendCodeResponse,
  UserCenterSmsVerifyRequest,
} from "@/types/user-center";

const USER_CENTER_BASE_URL = appConfig.userCenterBaseUrl;
const ACCESS_TOKEN_KEY = "fun_claw_uc_access_token";
const REFRESH_TOKEN_KEY = "fun_claw_uc_refresh_token";

let accessTokenMemoryCache: string | null = null;
let refreshPromise: Promise<UserCenterAuthResponse> | null = null;

function requireUserCenterBaseUrl(): string {
  if (!USER_CENTER_BASE_URL) {
    throw new Error("未配置用户中心地址，请设置 NEXT_PUBLIC_USER_CENTER_BASE_URL");
  }
  return USER_CENTER_BASE_URL.replace(/\/$/, "");
}

function getStoredValue(key: string): string | null {
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

function getAccessToken() {
  if (accessTokenMemoryCache) {
    return accessTokenMemoryCache;
  }
  const stored = getStoredValue(ACCESS_TOKEN_KEY);
  accessTokenMemoryCache = stored;
  return stored;
}

function getRefreshToken() {
  return getStoredValue(REFRESH_TOKEN_KEY);
}

function storeAuthTokens(response: UserCenterAuthResponse) {
  accessTokenMemoryCache = response.accessToken;
  setStoredValue(ACCESS_TOKEN_KEY, response.accessToken);
  setStoredValue(REFRESH_TOKEN_KEY, response.refreshToken);
}

export function clearUserCenterAuthState() {
  accessTokenMemoryCache = null;
  setStoredValue(ACCESS_TOKEN_KEY, null);
  setStoredValue(REFRESH_TOKEN_KEY, null);
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

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${requireUserCenterBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
    credentials: "include",
  });
  if (!response.ok) {
    throw await buildRequestError(response);
  }
  return (await response.json()) as T;
}

async function requestVoid(path: string, init?: RequestInit): Promise<void> {
  const response = await fetch(`${requireUserCenterBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
    credentials: "include",
  });
  if (!response.ok) {
    throw await buildRequestError(response);
  }
}

async function refreshUserCenterToken(request?: UserCenterRefreshTokenRequest): Promise<UserCenterAuthResponse> {
  if (!refreshPromise) {
    refreshPromise = requestJson<UserCenterAuthResponse>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({
        refreshToken: request?.refreshToken ?? getRefreshToken(),
      }),
    }).then((response) => {
      storeAuthTokens(response);
      return response;
    }).catch((error) => {
      clearUserCenterAuthState();
      throw error;
    }).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function requestAuthedJson<T>(path: string, init?: RequestInit, hasRetried = false): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(init?.headers ?? {});
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${requireUserCenterBaseUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
    credentials: "include",
  });

  if (response.status === 401 && !hasRetried) {
    await refreshUserCenterToken();
    return requestAuthedJson<T>(path, init, true);
  }

  if (!response.ok) {
    throw await buildRequestError(response);
  }

  return (await response.json()) as T;
}

export async function sendUserCenterSmsCode(request: UserCenterSmsSendCodeRequest) {
  return requestJson<UserCenterSmsSendCodeResponse>("/auth/sms/send-code", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function verifyUserCenterSmsCode(request: UserCenterSmsVerifyRequest) {
  const response = await requestJson<UserCenterAuthResponse>("/auth/sms/verify", {
    method: "POST",
    body: JSON.stringify(request),
  });
  storeAuthTokens(response);
  return response;
}

export async function getUserCenterMe() {
  const token = getAccessToken();
  if (!token && getRefreshToken()) {
    await refreshUserCenterToken();
  }
  return requestAuthedJson<UserCenterMe>("/me");
}

export async function logoutUserCenter() {
  try {
    await requestVoid("/auth/logout", {
      method: "POST",
      body: JSON.stringify({
        refreshToken: getRefreshToken(),
      }),
      headers: getAccessToken()
        ? {
            Authorization: `Bearer ${getAccessToken()}`,
          }
        : undefined,
    });
  } finally {
    clearUserCenterAuthState();
  }
}
