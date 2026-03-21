"use client";

import { Modal } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCachedUserCenterMe,
  getUserCenterMe,
  hasUserCenterAuthCredentials,
  logoutUserCenter,
} from "@/lib/user-center-api";
import type { UserCenterMe } from "@/types/user-center";
import type { AccountTabKey } from "./account-data";
import { AccountSidebar } from "./account-sidebar";
import { AccountAssetsPanel } from "./account-assets-panel";
import { AccountSettingsPanel } from "./account-settings-panel";
import { AccountUsagePanel } from "./account-usage-panel";

function extractErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "请求失败，请稍后重试";
}

function isUnauthorizedError(error: unknown): boolean {
  return extractErrorMessage(error).includes("HTTP 401");
}

export function AccountPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AccountTabKey>("settings");
  const [profile, setProfile] = useState<UserCenterMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const loadCurrentUser = useCallback(async (cachedProfile?: UserCenterMe | null) => {
    if (!hasUserCenterAuthCredentials()) {
      router.replace("/login");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const currentProfile = await getUserCenterMe();
      setProfile(currentProfile);
    } catch (requestError) {
      if (isUnauthorizedError(requestError)) {
        router.replace("/login");
        return;
      }
      if (!cachedProfile) {
        setProfile(null);
        setError(extractErrorMessage(requestError));
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const cachedProfile = getCachedUserCenterMe();
    if (cachedProfile) {
      setProfile(cachedProfile);
      setLoading(false);
    }
    void loadCurrentUser(cachedProfile);
  }, [loadCurrentUser]);

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await logoutUserCenter();
    } finally {
      setLogoutConfirmOpen(false);
      setLoggingOut(false);
      router.replace("/login");
    }
  }, [router]);

  const content = useMemo(() => {
    if (!profile) {
      return null;
    }

    switch (activeTab) {
      case "assets":
        return <AccountAssetsPanel />;
      case "usage":
        return <AccountUsagePanel />;
      case "settings":
      default:
        return <AccountSettingsPanel profile={profile} />;
    }
  }, [activeTab, profile]);

  if (loading) {
    return (
      <main className="brand-sunset-theme min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#ffffff_0%,#fffaf7_100%)] px-5 py-4 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-[1800px] rounded-[28px] bg-white/70 px-8 py-12 text-center shadow-[0_20px_48px_rgba(15,23,42,0.05)]">
          <div className="text-3xl font-black tracking-[-0.04em] text-slate-950">正在加载用户中心资料...</div>
        </div>
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="brand-sunset-theme min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#ffffff_0%,#fffaf7_100%)] px-5 py-4 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-[960px] rounded-[28px] bg-white/70 px-8 py-12 text-center shadow-[0_20px_48px_rgba(15,23,42,0.05)]">
          <div className="text-3xl font-black tracking-[-0.04em] text-slate-950">用户中心资料加载失败</div>
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
    <main className="brand-sunset-theme min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#ffffff_0%,#fffaf7_100%)] px-5 py-4 sm:px-6 lg:px-10 xl:h-screen xl:overflow-hidden">
      <div className="mx-auto grid max-w-[1800px] items-start gap-8 xl:h-full xl:grid-cols-[360px_minmax(0,1fr)] xl:items-stretch">
        <AccountSidebar
          activeTab={activeTab}
          onChange={setActiveTab}
          onLogout={() => setLogoutConfirmOpen(true)}
          loggingOut={loggingOut}
        />
        <section
          className="space-y-4 rounded-[28px] bg-white/48 px-6 py-8 sm:px-10 sm:py-10 xl:min-h-0 xl:overflow-y-auto xl:pr-4"
          style={{ scrollbarGutter: "stable" }}
        >
          {content}
        </section>
      </div>

      <Modal
        open={logoutConfirmOpen}
        centered
        title="确认退出登录"
        okText="退出登录"
        cancelText="取消"
        okButtonProps={{
          danger: true,
          loading: loggingOut,
        }}
        cancelButtonProps={{
          disabled: loggingOut,
        }}
        onOk={() => {
          void handleLogout();
        }}
        onCancel={() => {
          if (!loggingOut) {
            setLogoutConfirmOpen(false);
          }
        }}
      >
        <p className="text-base font-semibold text-slate-500">
          退出后会清除当前登录状态，之后需要重新登录才能继续访问当前账号能力。
        </p>
      </Modal>
    </main>
  );
}
