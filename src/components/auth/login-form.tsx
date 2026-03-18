"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { message } from "antd";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { getCurrentConsumerAccount } from "@/lib/consumer-api";
import {
  sendUserCenterSmsCode,
  verifyUserCenterSmsCode,
} from "@/lib/user-center-api";

const DEFAULT_SMS_SEND_COUNTDOWN_SECONDS = 60;

function normalizePhoneInput(value: string) {
  return value.replace(/[^\d]/g, "").slice(0, 11);
}

function extractErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "请求失败，请稍后重试";
}

function resolveSmsSentToastMessage(rawMessage?: string | null) {
  const normalized = rawMessage?.trim();
  if (!normalized || /^success$/i.test(normalized) || /^ok$/i.test(normalized)) {
    return "验证码已发送，请注意查收短信";
  }
  return normalized;
}

function isPhoneValid(phone: string) {
  return /^1[3-9]\d{9}$/.test(phone);
}

export function LoginForm() {
  const router = useRouter();
  const [messageApi, contextHolder] = message.useMessage();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [agreed, setAgreed] = useState(true);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);

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
      return "发送中...";
    }
    if (countdown > 0) {
      return `${countdown}s 后重试`;
    }
    return "获取验证码";
  }, [countdown, sending]);

  const handleSendCode = useCallback(async () => {
    const normalizedPhone = normalizePhoneInput(phone);
    setPhone(normalizedPhone);

    if (!isPhoneValid(normalizedPhone)) {
      void messageApi.warning("请输入正确的 11 位手机号");
      return;
    }

    setSending(true);
    try {
      const response = await sendUserCenterSmsCode({ phone: normalizedPhone });
      setCountdown(DEFAULT_SMS_SEND_COUNTDOWN_SECONDS);
      void messageApi.success(resolveSmsSentToastMessage(response.msg));
    } catch (requestError) {
      void messageApi.error(extractErrorMessage(requestError));
    } finally {
      setSending(false);
    }
  }, [messageApi, phone]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const normalizedPhone = normalizePhoneInput(phone);
      setPhone(normalizedPhone);

      if (!isPhoneValid(normalizedPhone)) {
        void messageApi.warning("请输入正确的 11 位手机号");
        return;
      }

      if (!/^\d{6}$/.test(code.trim())) {
        void messageApi.warning("请输入 6 位验证码");
        return;
      }

      if (!agreed) {
        void messageApi.warning("请先阅读并同意协议");
        return;
      }

      setVerifying(true);
      try {
        await verifyUserCenterSmsCode({
          phone: normalizedPhone,
          code: code.trim(),
          inviteCode: inviteCode.trim() || null,
        });
        await getCurrentConsumerAccount();
        router.replace("/me");
      } catch (requestError) {
        void messageApi.error(extractErrorMessage(requestError));
      } finally {
        setVerifying(false);
      }
    },
    [agreed, code, inviteCode, messageApi, phone, router]
  );

  return (
    <section className="rounded-[32px] border border-white/55 bg-white/48 p-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-10">
      {contextHolder}
      <div className="max-w-[460px]">
        <h1 className="text-4xl font-black tracking-[-0.04em] text-slate-950 sm:text-5xl">登录</h1>
        <p className="mt-3 text-lg font-semibold text-slate-500">
          未注册用户将会自动进行注册
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
              disabled={verifying}
              className="h-18 w-full rounded-[22px] border border-slate-900/18 bg-white/42 px-5 py-4 text-base font-medium text-slate-900 outline-none transition-colors duration-300 placeholder:text-slate-400 focus:border-violet-400 disabled:cursor-not-allowed disabled:opacity-70"
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
                disabled={verifying}
                className="h-18 w-full rounded-[22px] border border-slate-900/18 bg-white/42 px-5 py-4 text-base font-medium text-slate-900 outline-none transition-colors duration-300 placeholder:text-slate-400 focus:border-violet-400 disabled:cursor-not-allowed disabled:opacity-70"
              />
              <button
                type="button"
                onClick={() => void handleSendCode()}
                disabled={verifying || sending || countdown > 0}
                className="h-18 rounded-[22px] bg-violet-100 px-5 py-4 text-base font-black text-violet-800 transition-transform duration-300 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
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
              placeholder="内测阶段，需填写邀请码注册"
              disabled={verifying}
              className="h-18 w-full rounded-[22px] border border-slate-900/18 bg-white/42 px-5 py-4 text-base font-medium uppercase text-slate-900 outline-none transition-colors duration-300 placeholder:text-slate-400 focus:border-violet-400 disabled:cursor-not-allowed disabled:opacity-70"
            />
          </div>

          <button
            type="submit"
            disabled={verifying}
            className="h-18 w-full rounded-[22px] bg-gradient-to-r from-orange-400 via-orange-500 to-violet-500 px-6 py-4 text-xl font-black text-white shadow-[0_24px_48px_rgba(147,51,234,0.24)] transition-transform duration-300 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {verifying ? "登录中..." : "登录 / 注册"}
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
              <Link href="/docs" className="mx-1 font-bold text-violet-500 hover:text-violet-600">
                《用户协议》
              </Link>
              和
              <Link href="/docs" className="mx-1 font-bold text-violet-500 hover:text-violet-600">
                《隐私政策》
              </Link>
              ，相关登录注册能力由外部用户中心统一提供。
            </span>
          </label>
        </form>
      </div>
    </section>
  );
}
