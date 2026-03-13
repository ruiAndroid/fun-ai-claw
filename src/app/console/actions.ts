"use server";

import { cookies } from "next/headers";
import {
  CONSOLE_ACCESS_COOKIE_MAX_AGE_SECONDS,
  CONSOLE_ACCESS_COOKIE_NAME,
  getConsoleAccessCookieValue,
  isConsoleAccessPasswordConfigured,
  isConsoleAccessPasswordValid,
} from "@/lib/console-access";

export type ConsoleAccessActionState = {
  success: boolean;
  error?: string;
};

export const initialConsoleAccessActionState: ConsoleAccessActionState = {
  success: false,
};

export async function submitConsoleAccessPassword(
  _previousState: ConsoleAccessActionState,
  formData: FormData,
): Promise<ConsoleAccessActionState> {
  const passwordEntry = formData.get("password");
  const password = typeof passwordEntry === "string" ? passwordEntry : "";

  if (!isConsoleAccessPasswordConfigured()) {
    return {
      success: false,
      error: "控制台访问密码尚未配置，请先在 src/config/console-access.ts 中设置 password。",
    };
  }

  if (!password.trim()) {
    return {
      success: false,
      error: "请输入访问密码。",
    };
  }

  if (!isConsoleAccessPasswordValid(password)) {
    return {
      success: false,
      error: "访问密码不正确，请重试。",
    };
  }

  const cookieStore = await cookies();
  cookieStore.set({
    name: CONSOLE_ACCESS_COOKIE_NAME,
    value: getConsoleAccessCookieValue(),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CONSOLE_ACCESS_COOKIE_MAX_AGE_SECONDS,
  });

  return {
    success: true,
  };
}
