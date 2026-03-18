"use client";

import { appConfig } from "@/config/app-config";
import type {
  UserCenterApiEnvelope,
  UserCenterAuthResponse,
  UserCenterAuthSnapshot,
  UserCenterCurrentUserResponseData,
  UserCenterLoginResponseData,
  UserCenterMe,
  UserCenterRefreshTokenRequest,
  UserCenterSmsSendCodeRequest,
  UserCenterSmsSendCodeResponse,
  UserCenterSmsVerifyRequest,
  UserCenterUserInfo,
} from "@/types/user-center";

const USER_CENTER_BASE_URL = appConfig.userCenterBaseUrl;
const ACCESS_TOKEN_KEY = "fun_claw_uc_access_token";
const REFRESH_TOKEN_KEY = "fun_claw_uc_refresh_token";
const TOKEN_TYPE_KEY = "fun_claw_uc_token_type";
const ACCESS_TOKEN_EXPIRES_AT_KEY = "fun_claw_uc_access_token_expires_at";
const REFRESH_TOKEN_EXPIRES_AT_KEY = "fun_claw_uc_refresh_token_expires_at";
const SESSION_KEY = "fun_claw_uc_session_key";
const ME_KEY = "fun_claw_uc_me";
const ME_FETCHED_AT_KEY = "fun_claw_uc_me_fetched_at";
const USER_CENTER_REQUEST_TIMEOUT_MS = 8000;
const USER_CENTER_ME_CACHE_TTL_MS = 30_000;
export const USER_CENTER_AUTH_REQUIRED_EVENT = "fun-claw-user-center-auth-required";

let accessTokenMemoryCache: string | null = null;
let refreshPromise: Promise<UserCenterAuthResponse> | null = null;
let mePromise: Promise<UserCenterMe> | null = null;

function isUserCenterSuccessCode(code?: number | null) {
  return typeof code !== "number" || code === 0 || code === 200;
}

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

function getStoredTokenType() {
  return getStoredValue(TOKEN_TYPE_KEY);
}

function getStoredAccessTokenExpiresAt() {
  return getStoredValue(ACCESS_TOKEN_EXPIRES_AT_KEY);
}

function getStoredRefreshTokenExpiresAt() {
  return getStoredValue(REFRESH_TOKEN_EXPIRES_AT_KEY);
}

function getStoredMe() {
  const raw = getStoredValue(ME_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as UserCenterMe;
  } catch {
    setStoredValue(ME_KEY, null);
    return null;
  }
}

export function getCachedUserCenterMe() {
  return getStoredMe();
}

function getStoredMeFetchedAt() {
  const raw = getStoredValue(ME_FETCHED_AT_KEY);
  if (!raw) {
    return 0;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function setStoredMeFetchedAt(timestamp: number) {
  setStoredValue(ME_FETCHED_AT_KEY, timestamp > 0 ? String(timestamp) : null);
}

function hasFreshCachedMe() {
  const cachedMe = getStoredMe();
  const fetchedAt = getStoredMeFetchedAt();
  if (!cachedMe || fetchedAt <= 0) {
    return false;
  }
  return Date.now() - fetchedAt < USER_CENTER_ME_CACHE_TTL_MS;
}

function generateSessionKey() {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `uc-${Date.now()}-${Math.random().toString(16).slice(2, 12)}`;
}

function getOrCreateSessionKey() {
  const stored = getStoredValue(SESSION_KEY);
  if (stored) {
    return stored;
  }
  const created = generateSessionKey();
  setStoredValue(SESSION_KEY, created);
  return created;
}

function maskPhone(phone?: string | null) {
  const normalized = phone?.trim() || "";
  if (!/^1\d{10}$/.test(normalized)) {
    return normalized || null;
  }
  return `${normalized.slice(0, 3)}****${normalized.slice(-4)}`;
}

function addSecondsToNow(seconds?: number | null) {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) {
    return "";
  }
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function normalizeUserCenterProfile(
  payload: UserCenterUserInfo,
  previousProfile?: UserCenterMe | null,
): UserCenterMe {
  const resolvedUserId = String(payload.id ?? "").trim();
  const resolvedPhone = payload.phone?.trim() || "";
  const payUserId = payload.payUserId == null ? "" : String(payload.payUserId).trim();
  const nickname = payload.username?.trim()
    || payload.userName?.trim()
    || previousProfile?.nickname?.trim()
    || maskPhone(resolvedPhone)
    || resolvedUserId;

  return {
    userId: resolvedUserId,
    uid: payUserId || previousProfile?.uid || resolvedUserId,
    nickname,
    avatarUrl: payload.avatar?.trim() || previousProfile?.avatarUrl || null,
    phone: resolvedPhone || previousProfile?.phone || null,
    phoneMasked: maskPhone(resolvedPhone) || previousProfile?.phoneMasked || null,
    phoneE164: resolvedPhone || previousProfile?.phoneE164 || null,
    userType: payload.type == null ? previousProfile?.userType || null : String(payload.type),
    invitationCode: payload.invitationCode?.trim() || previousProfile?.invitationCode || null,
    payUserId: payUserId || previousProfile?.payUserId || null,
    status: payload.status == null ? previousProfile?.status || "" : String(payload.status),
    createdAt: previousProfile?.createdAt || new Date().toISOString(),
    lastLoginAt: payload.lastLogin?.trim() || previousProfile?.lastLoginAt || null,
  };
}

function mapLoginResponseToAuthResponse(payload: UserCenterLoginResponseData): UserCenterAuthResponse {
  return {
    me: normalizeUserCenterProfile(payload.userInfo),
    newUser: false,
    tokenType: payload.tokenType?.trim() || "Bearer",
    accessToken: payload.accessToken,
    accessTokenExpiresAt: addSecondsToNow(payload.expiresIn),
    refreshToken: payload.refreshToken,
    refreshTokenExpiresAt: "",
  };
}

function storeAuthTokens(response: UserCenterAuthResponse) {
  accessTokenMemoryCache = response.accessToken;
  setStoredValue(ACCESS_TOKEN_KEY, response.accessToken);
  setStoredValue(REFRESH_TOKEN_KEY, response.refreshToken);
  setStoredValue(TOKEN_TYPE_KEY, response.tokenType);
  setStoredValue(ACCESS_TOKEN_EXPIRES_AT_KEY, response.accessTokenExpiresAt);
  setStoredValue(REFRESH_TOKEN_EXPIRES_AT_KEY, response.refreshTokenExpiresAt);
  setStoredValue(ME_KEY, JSON.stringify(response.me));
  setStoredMeFetchedAt(Date.now());
  getOrCreateSessionKey();
}

export function clearUserCenterAuthState() {
  accessTokenMemoryCache = null;
  mePromise = null;
  setStoredValue(ACCESS_TOKEN_KEY, null);
  setStoredValue(REFRESH_TOKEN_KEY, null);
  setStoredValue(TOKEN_TYPE_KEY, null);
  setStoredValue(ACCESS_TOKEN_EXPIRES_AT_KEY, null);
  setStoredValue(REFRESH_TOKEN_EXPIRES_AT_KEY, null);
  setStoredValue(ME_KEY, null);
  setStoredMeFetchedAt(0);
}

export function getUserCenterAuthSnapshot(): UserCenterAuthSnapshot {
  return {
    tokenType: getStoredTokenType(),
    accessToken: getAccessToken(),
    accessTokenExpiresAt: getStoredAccessTokenExpiresAt(),
    refreshToken: getRefreshToken(),
    refreshTokenExpiresAt: getStoredRefreshTokenExpiresAt(),
    sessionKey: getOrCreateSessionKey(),
  };
}

function buildRequestHeaders(init?: RequestInit) {
  const headers = new Headers(init?.headers ?? {});
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return headers;
}

async function buildRequestError(response: Response): Promise<Error> {
  const body = await response.text();
  let detail = body || response.statusText;

  if (body) {
    try {
      const parsed = JSON.parse(body) as {
        message?: string;
        detail?: string;
        error?: string;
        msg?: string;
        code?: number;
      };
      detail = parsed.message?.trim()
        || parsed.detail?.trim()
        || parsed.error?.trim()
        || parsed.msg?.trim()
        || detail;
      if (!isUserCenterSuccessCode(parsed.code)) {
        detail = `${detail} (code: ${parsed.code})`;
      }
    } catch {
      detail = body;
    }
  }

  return new Error(`HTTP ${response.status}: ${detail}`);
}

async function fetchUserCenter(path: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, USER_CENTER_REQUEST_TIMEOUT_MS);

  try {
    return await fetch(`${requireUserCenterBaseUrl()}${path}`, {
      ...init,
      headers: buildRequestHeaders(init),
      signal: controller.signal,
      cache: "no-store",
      credentials: "include",
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("请求超时，请稍后重试");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetchUserCenter(path, init);
  if (!response.ok) {
    throw await buildRequestError(response);
  }
  return (await response.json()) as T;
}

async function requestEnvelope<T>(path: string, init?: RequestInit): Promise<UserCenterApiEnvelope<T>> {
  const response = await fetchUserCenter(path, init);
  if (!response.ok) {
    throw await buildRequestError(response);
  }

  const payload = (await response.json()) as UserCenterApiEnvelope<T>;
  if (!isUserCenterSuccessCode(payload?.code)) {
    throw new Error(payload.msg?.trim() || `用户中心请求失败 (code: ${payload.code})`);
  }
  return payload;
}

async function requestVoid(path: string, init?: RequestInit): Promise<void> {
  const response = await fetchUserCenter(path, init);
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

export async function refreshUserCenterAuth(request?: UserCenterRefreshTokenRequest) {
  return refreshUserCenterToken(request);
}

async function requestAuthedEnvelope<T>(
  path: string,
  init?: RequestInit,
  hasRetried = false,
): Promise<UserCenterApiEnvelope<T>> {
  const token = getAccessToken();
  const headers = buildRequestHeaders(init);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetchUserCenter(path, {
    ...init,
    headers,
  });

  if (response.status === 401 && !hasRetried) {
    await refreshUserCenterToken();
    return requestAuthedEnvelope<T>(path, init, true);
  }

  if (!response.ok) {
    throw await buildRequestError(response);
  }

  const payload = (await response.json()) as UserCenterApiEnvelope<T>;
  if (!isUserCenterSuccessCode(payload?.code)) {
    const code = typeof payload?.code === "number" ? payload.code : undefined;
    const message = payload?.msg?.trim() || `用户中心请求失败 (code: ${payload.code})`;

    if ((code === 401 || code === 403) && !hasRetried && getRefreshToken()) {
      await refreshUserCenterToken();
      return requestAuthedEnvelope<T>(path, init, true);
    }

    if (code === 401 || code === 403) {
      clearUserCenterAuthState();
      notifyUserCenterAuthRequired();
      throw new Error(`HTTP 401: ${message}`);
    }

    throw new Error(message);
  }
  return payload;
}

export function isUserCenterUnauthorizedError(error: unknown) {
  if (typeof error === "string") {
    return /HTTP 401|authentication failed|访问令牌无效|令牌无效|令牌已过期|token invalid|token expired/i.test(error);
  }
  return error instanceof Error
    && /HTTP 401|authentication failed|访问令牌无效|令牌无效|令牌已过期|token invalid|token expired/i.test(error.message);
}

export function hasUserCenterAuthCredentials() {
  const snapshot = getUserCenterAuthSnapshot();
  return Boolean(snapshot.accessToken || snapshot.refreshToken);
}

export function notifyUserCenterAuthRequired() {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(USER_CENTER_AUTH_REQUIRED_EVENT));
}

export async function sendUserCenterSmsCode(request: UserCenterSmsSendCodeRequest) {
  const response = await requestEnvelope<Record<string, never>>("/auth/sms/send", {
    method: "POST",
    body: JSON.stringify(request),
  });
  return {
    requestId: response.requestId,
    msg: response.msg,
  } satisfies UserCenterSmsSendCodeResponse;
}

export async function verifyUserCenterSmsCode(request: UserCenterSmsVerifyRequest) {
  const envelope = await requestEnvelope<UserCenterLoginResponseData>("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      phone: request.phone,
      smsCode: request.code,
    }),
  });
  const response = mapLoginResponseToAuthResponse(envelope.data);
  storeAuthTokens(response);
  return response;
}

export async function getUserCenterMe() {
  const cachedMe = getStoredMe();
  const token = getAccessToken();

  if (cachedMe && hasFreshCachedMe()) {
    return cachedMe;
  }

  if (!token && getRefreshToken()) {
    await refreshUserCenterToken();
  }

  if (!mePromise) {
    mePromise = (async () => {
      try {
        const envelope = await requestAuthedEnvelope<UserCenterCurrentUserResponseData>("/auth/current-user");
        const remoteMe = normalizeUserCenterProfile(envelope.data, cachedMe);
        setStoredValue(ME_KEY, JSON.stringify(remoteMe));
        setStoredMeFetchedAt(Date.now());
        return remoteMe;
      } catch (error) {
        if (cachedMe && !isUserCenterUnauthorizedError(error)) {
          return cachedMe;
        }
        throw error;
      } finally {
        mePromise = null;
      }
    })();
  }

  return mePromise;
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
