"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getConsumerAccount } from "@/lib/consumer-api";
import { logoutUserCenter } from "@/lib/user-center-api";
import type { ConsumerAccount } from "@/types/consumer";
import type { AccountTabKey } from "./account-data";
import { AccountSidebar } from "./account-sidebar";
import { AccountSettingsPanel } from "./account-settings-panel";
import { AccountUsagePanel } from "./account-usage-panel";
import { AccountWorksPanel } from "./account-works-panel";

function extractErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "请求失败，请稍后重试";
}

function isUnauthorizedError(error: unknown): boolean {
  return extractErrorMessage(error).includes("HTTP 401");
}

export function AccountPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AccountTabKey>("settings");
  const [account, setAccount] = useState<ConsumerAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const loadCurrentUser = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const current = await getConsumerAccount();
      setAccount(current);
    } catch (requestError) {
      if (isUnauthorizedError(requestError)) {
        router.replace("/login");
        return;
      }
      setError(extractErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadCurrentUser();
  }, [loadCurrentUser]);

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await logoutUserCenter();
    } finally {
      setLoggingOut(false);
      router.replace("/login");
    }
  }, [router]);

  const content = useMemo(() => {
    if (!account) {
      return null;
    }

    switch (activeTab) {
      case "usage":
        return <AccountUsagePanel />;
      case "works":
        return <AccountWorksPanel />;
      case "settings":
      default:
        return <AccountSettingsPanel account={account} />;
    }
  }, [account, activeTab]);

  if (loading) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f9fffe_100%)] px-5 py-4 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-[1800px] rounded-[28px] bg-white/70 px-8 py-12 text-center shadow-[0_20px_48px_rgba(15,23,42,0.05)]">
          <div className="text-3xl font-black tracking-[-0.04em] text-slate-950">正在加载账号信息…</div>
        </div>
      </main>
    );
  }

  if (error || !account) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f9fffe_100%)] px-5 py-4 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-[960px] rounded-[28px] bg-white/70 px-8 py-12 text-center shadow-[0_20px_48px_rgba(15,23,42,0.05)]">
          <div className="text-3xl font-black tracking-[-0.04em] text-slate-950">账号信息加载失败</div>
          <div className="mt-4 text-lg font-semibold text-slate-500">{error ?? "请重新登录后再试"}</div>
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => void loadCurrentUser()}
              className="inline-flex h-14 items-center justify-center rounded-full bg-slate-900 px-8 text-base font-black text-white transition-transform duration-300 hover:scale-[1.01]"
            >
              重新加载
            </button>
            <button
              type="button"
              onClick={() => router.replace("/login")}
              className="inline-flex h-14 items-center justify-center rounded-full border border-slate-300 bg-white px-8 text-base font-black text-slate-700 transition-transform duration-300 hover:scale-[1.01]"
            >
              去登录
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f9fffe_100%)] px-5 py-4 sm:px-6 lg:px-10">
      <div className="mx-auto grid max-w-[1800px] gap-8 xl:grid-cols-[360px_minmax(0,1fr)]">
        <AccountSidebar
          activeTab={activeTab}
          onChange={setActiveTab}
          onLogout={() => void handleLogout()}
          loggingOut={loggingOut}
        />
        <section className="rounded-[28px] bg-white/48 px-6 py-8 sm:px-10 sm:py-10">{content}</section>
      </div>
    </main>
  );
}
