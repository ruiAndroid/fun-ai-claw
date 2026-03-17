"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { getConsumerMe, sendConsumerSmsCode, verifyConsumerSmsCode } from "@/lib/control-api";

function normalizePhoneInput(value: string) {
  return value.replace(/[^\d]/g, "").slice(0, 11);
}

function extractErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "请求失败，请稍后重试";
}

function isUnauthorizedError(error: unknown): boolean {
  return extractErrorMessage(error).includes("HTTP 401");
}

function isPhoneValid(phone: string) {
  return /^1[3-9]\d{9}$/.test(phone);
}

export function LoginForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [agreed, setAgreed] = useState(true);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [debugCode, setDebugCode] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function detectLogin() {
      try {
        await getConsumerMe();
        if (active) {
          router.replace("/me");
        }
      } catch (requestError) {
        if (!isUnauthorizedError(requestError)) {
          setError(extractErrorMessage(requestError));
        }
      } finally {
        if (active) {
          setCheckingSession(false);
        }
      }
    }

    void detectLogin();

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (countdown <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setCountdown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [countdown]);

  const sendButtonLabel = useMemo(() => {
    if (sending) {
      return "发送中…";
    }
    if (countdown > 0) {
      return `${countdown}s 后重试`;
    }
    return "获取验证码";
  }, [countdown, sending]);

  const handleSendCode = useCallback(async () => {
    setError(null);
    setNotice(null);
    setDebugCode(null);

    const normalizedPhone = normalizePhoneInput(phone);
    setPhone(normalizedPhone);

    if (!isPhoneValid(normalizedPhone)) {
      setError("请输入正确的 11 位手机号");
      return;
    }

    setSending(true);
    try {
      const response = await sendConsumerSmsCode({ phone: normalizedPhone });
      setCountdown(response.cooldownSeconds);
      setNotice(`验证码已发送至 ${response.phoneMasked}`);
      setDebugCode(response.debugCode ?? null);
    } catch (requestError) {
      setError(extractErrorMessage(requestError));
    } finally {
      setSending(false);
    }
  }, [phone]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError(null);
      setNotice(null);

      const normalizedPhone = normalizePhoneInput(phone);
      setPhone(normalizedPhone);

      if (!isPhoneValid(normalizedPhone)) {
        setError("请输入正确的 11 位手机号");
        return;
      }

      if (!/^\d{6}$/.test(code.trim())) {
        setError("请输入 6 位验证码");
        return;
      }

      if (!agreed) {
        setError("请先阅读并同意协议");
        return;
      }

      setVerifying(true);
      try {
        await verifyConsumerSmsCode({
          phone: normalizedPhone,
          code: code.trim(),
          inviteCode: inviteCode.trim() || null,
        });
        router.replace("/me");
      } catch (requestError) {
        setError(extractErrorMessage(requestError));
      } finally {
        setVerifying(false);
      }
    },
    [agreed, code, inviteCode, phone, router]
  );

  return (
    <section className="rounded-[32px] border border-white/55 bg-white/48 p-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-10">
      <div className="max-w-[460px]">
        <h1 className="text-4xl font-black tracking-[-0.04em] text-slate-950 sm:text-5xl">手机号登录</h1>
        <p className="mt-3 text-lg font-semibold text-slate-500">
          未注册手机号在验证码校验成功后会自动注册并登录。
        </p>

        <form className="mt-12 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="mb-3 block text-base font-bold text-slate-950">手机号</label>
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(event) => setPhone(normalizePhoneInput(event.target.value))}
              placeholder="请输入 11 位手机号"
              disabled={checkingSession || verifying}
              className="h-18 w-full rounded-[22px] border border-slate-900/18 bg-white/42 px-5 py-4 text-base font-medium text-slate-900 outline-none transition-colors duration-300 placeholder:text-slate-400 focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
            />
          </div>

          <div>
            <label className="mb-3 block text-base font-bold text-slate-950">验证码</label>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
              <input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/[^\d]/g, "").slice(0, 6))}
                placeholder="请输入 6 位验证码"
                disabled={checkingSession || verifying}
                className="h-18 w-full rounded-[22px] border border-slate-900/18 bg-white/42 px-5 py-4 text-base font-medium text-slate-900 outline-none transition-colors duration-300 placeholder:text-slate-400 focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
              />
              <button
                type="button"
                onClick={() => void handleSendCode()}
                disabled={checkingSession || verifying || sending || countdown > 0}
                className="h-18 rounded-[22px] bg-cyan-200 px-5 py-4 text-base font-black text-teal-800 transition-transform duration-300 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {sendButtonLabel}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-3 block text-base font-bold text-slate-950">邀请码</label>
            <input
              type="text"
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value.toUpperCase().replace(/\s+/g, "").slice(0, 32))}
              placeholder="内测阶段新用户必填，老用户可留空"
              disabled={checkingSession || verifying}
              className="h-18 w-full rounded-[22px] border border-slate-900/18 bg-white/42 px-5 py-4 text-base font-medium uppercase text-slate-900 outline-none transition-colors duration-300 placeholder:text-slate-400 focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
            />
          </div>

          {(notice || error || debugCode) && (
            <div className="space-y-3">
              {notice ? (
                <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  {notice}
                </div>
              ) : null}
              {error ? (
                <div className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                  {error}
                </div>
              ) : null}
              {debugCode ? (
                <div className="rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                  当前环境返回了调试验证码：{debugCode}
                </div>
              ) : null}
            </div>
          )}

          <button
            type="submit"
            disabled={checkingSession || verifying}
            className="h-18 w-full rounded-[22px] bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 px-6 py-4 text-xl font-black text-white shadow-[0_24px_48px_rgba(45,212,191,0.28)] transition-transform duration-300 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {checkingSession ? "检测登录状态…" : verifying ? "登录中…" : "登录 / 注册"}
          </button>

          <label className="flex items-start gap-3 text-sm leading-6 text-slate-500">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
              className="mt-1 h-5 w-5 rounded border-slate-300"
            />
            <span>
              我已阅读并同意
              <Link href="/docs" className="mx-1 font-bold text-cyan-500 hover:text-cyan-600">
                《用户协议》
              </Link>
              和
              <Link href="/docs" className="mx-1 font-bold text-cyan-500 hover:text-cyan-600">
                《隐私政策》
              </Link>
              ，未注册手机号会在验证码通过后自动创建账号；内测阶段新用户需填写有效邀请码。
            </span>
          </label>
        </form>
      </div>
    </section>
  );
}
