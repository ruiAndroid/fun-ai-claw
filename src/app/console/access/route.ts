import { NextResponse } from "next/server";
import {
  CONSOLE_ACCESS_COOKIE_MAX_AGE_SECONDS,
  CONSOLE_ACCESS_COOKIE_NAME,
  getConsoleAccessCookieValue,
  isConsoleAccessPasswordConfigured,
  isConsoleAccessPasswordValid,
} from "@/lib/console-access";

function jsonResponse(status: number, error?: string) {
  return NextResponse.json(
    error ? { success: false, error } : { success: true },
    { status },
  );
}

function shouldUseSecureCookie(requestUrl: string): boolean {
  try {
    return new URL(requestUrl).protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  const isFormRequest = contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded");

  let password = "";

  if (isFormRequest) {
    const formData = await request.formData();
    const passwordEntry = formData.get("password");
    password = typeof passwordEntry === "string" ? passwordEntry : "";
  } else {
    const body = (await request.json().catch(() => null)) as { password?: unknown } | null;
    password = typeof body?.password === "string" ? body.password : "";
  }

  if (!isConsoleAccessPasswordConfigured()) {
    return jsonResponse(500, "控制台访问密码尚未配置，请先在 src/config/console-access.ts 中设置 password。");
  }

  if (!password.trim()) {
    return jsonResponse(400, "请输入访问密码。");
  }

  if (!isConsoleAccessPasswordValid(password)) {
    return jsonResponse(401, "访问密码不正确，请重试。");
  }

  const response = jsonResponse(200);
  response.cookies.set({
    name: CONSOLE_ACCESS_COOKIE_NAME,
    value: getConsoleAccessCookieValue(),
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(request.url),
    path: "/",
    maxAge: CONSOLE_ACCESS_COOKIE_MAX_AGE_SECONDS,
  });

  return response;
}
