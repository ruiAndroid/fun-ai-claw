import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { consoleAccessConfig } from "@/config/console-access";

export const CONSOLE_ACCESS_COOKIE_NAME = "fun_claw_console_access";
export const CONSOLE_ACCESS_COOKIE_MAX_AGE_SECONDS = consoleAccessConfig.sessionMaxAgeSeconds;

function normalizePassword(value: string | undefined): string {
  return value?.trim() ?? "";
}

function createConsoleAccessToken(password: string): string {
  return createHash("sha256")
    .update(`fun-ai-claw-console:${password}`)
    .digest("hex");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function getConsoleAccessPassword(): string {
  return normalizePassword(consoleAccessConfig.password);
}

export function isConsoleAccessPasswordConfigured(): boolean {
  return getConsoleAccessPassword().length > 0;
}

export function getConsoleAccessCookieValue(): string {
  const password = getConsoleAccessPassword();

  if (!password) {
    return "";
  }

  return createConsoleAccessToken(password);
}

export function hasConsoleAccess(cookieValue: string | undefined): boolean {
  const expectedValue = getConsoleAccessCookieValue();
  const actualValue = cookieValue?.trim() ?? "";

  if (!expectedValue || !actualValue) {
    return false;
  }

  return safeEqual(actualValue, expectedValue);
}

export function isConsoleAccessPasswordValid(submittedPassword: string): boolean {
  const configuredPassword = getConsoleAccessPassword();
  const normalizedSubmittedPassword = normalizePassword(submittedPassword);

  if (!configuredPassword || !normalizedSubmittedPassword) {
    return false;
  }

  return safeEqual(normalizedSubmittedPassword, configuredPassword);
}
