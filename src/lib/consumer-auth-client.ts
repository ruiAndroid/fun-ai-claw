"use client";

import { getUserCenterAuthSnapshot } from "@/lib/user-center-api";

const CONSUMER_PROTECTED_ROUTE_PREFIXES = ["/me", "/messages", "/recharge", "/tasks"] as const;

export function hasUserCenterSession() {
  const snapshot = getUserCenterAuthSnapshot();
  return Boolean(snapshot.accessToken || snapshot.refreshToken);
}

export function isConsumerUnauthorizedError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /HTTP 401|authentication failed|consumer authentication required|missing Authorization header/i.test(message);
}

export function resolveSafeConsumerNextPath(rawTarget?: string | null) {
  const normalized = rawTarget?.trim();
  if (!normalized || !normalized.startsWith("/") || normalized.startsWith("//")) {
    return "/me";
  }
  return normalized;
}

export function buildConsumerLoginHref(target?: string | null) {
  const next = resolveSafeConsumerNextPath(target);
  return `/login?next=${encodeURIComponent(next)}`;
}

export function isConsumerProtectedRoute(target: string) {
  const normalized = target.split("#", 1)[0]?.split("?", 1)[0]?.trim() || "/";
  return CONSUMER_PROTECTED_ROUTE_PREFIXES.some((prefix) => (
    normalized === prefix || normalized.startsWith(`${prefix}/`)
  ));
}

export function resolveConsumerProtectedHref(target: string, authenticated: boolean) {
  if (authenticated || !isConsumerProtectedRoute(target)) {
    return target;
  }
  return buildConsumerLoginHref(target);
}
