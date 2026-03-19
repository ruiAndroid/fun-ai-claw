"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { buildSidebarNavItems, type SidebarMessageGroup } from "./homepage-data";
import { getInitialHomepageShellSnapshot, loadHomepageShellSnapshot } from "@/lib/homepage-api";

export type HomepageUserCard = {
  title: string;
  subtitle: string;
  href: string;
  avatarUrl?: string | null;
};

function formatErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "首页数据加载失败";
}

const UNAUTHENTICATED_SNAPSHOT: Awaited<ReturnType<typeof loadHomepageShellSnapshot>> = {
  authenticated: false,
  profile: null,
  instances: [],
  recentSessions: [],
  recentSessionGroups: [],
  supportsXiamiBalance: false,
  supportsRecentSessions: false,
  xiamiBalance: null,
};

export function useHomepageShellData() {
  // Always start with unauthenticated state to avoid SSR/client hydration mismatch.
  // The real auth state is resolved in the effect below.
  const [snapshot, setSnapshot] = useState(UNAUTHENTICATED_SNAPSHOT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    try {
      const nextSnapshot = await loadHomepageShellSnapshot();
      setSnapshot(nextSnapshot);
    } catch (loadError) {
      setError(formatErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Immediately apply cached auth snapshot so UI updates before the async load completes
    const initialSnapshot = getInitialHomepageShellSnapshot();
    if (initialSnapshot.authenticated) {
      setSnapshot(initialSnapshot);
    }
    void loadData();
  }, [loadData]);

  const authenticated = Boolean(snapshot?.authenticated);
  const messagesHref = authenticated ? "/messages" : "/login";
  const rechargeHref = authenticated ? "/recharge" : "/login";

  const userCard = useMemo<HomepageUserCard>(() => {
    if (error) {
      return {
        title: "个人中心",
        subtitle: "用户资料暂时不可用，请稍后重试。",
        href: "/me",
      };
    }

    if (!authenticated) {
      return {
        title: "登录 / 个人中心",
        subtitle: "登录后查看你的会话、实例与账号资料",
        href: "/login",
      };
    }

    return {
      title: snapshot?.profile?.nickname?.trim() || "个人中心",
      subtitle: snapshot?.profile?.phoneMasked?.trim() || "账号已登录，欢迎回来",
      href: "/me",
      avatarUrl: snapshot?.profile?.avatarUrl,
    };
  }, [authenticated, error, snapshot]);

  const navItems = useMemo(() => {
    const totalInstances = snapshot?.instances.length ?? 0;
    const runningInstances = snapshot?.instances.filter((item) => item.status === "RUNNING").length ?? 0;

    return buildSidebarNavItems({
      robotCount: totalInstances,
      robotSummary: totalInstances > 0 ? `运行中 ${runningInstances} / 已绑定 ${totalInstances}` : undefined,
    });
  }, [snapshot]);

  const sidebarMessages = useMemo<SidebarMessageGroup[]>(() => (
    snapshot?.recentSessionGroups.map((group) => ({
      id: group.id,
      robotName: group.robotName,
      href: group.href,
      sessions: group.sessions.map((session) => ({
        id: session.id,
        title: session.title,
        href: session.href,
        status: session.status,
      })),
    })) ?? []
  ), [snapshot]);

  const messageEmptyText = useMemo(() => {
    if (error) {
      return "最近会话暂时不可用，请稍后重试。";
    }
    if (!authenticated) {
      return "登录后这里会展示你最近的会话。";
    }
    if (!snapshot?.supportsRecentSessions) {
      return "最近会话功能暂未开放。";
    }
    return "暂无最近会话。";
  }, [authenticated, error, snapshot]);

  const xiamiBalanceLabel = useMemo(() => {
    if (!authenticated) {
      return "--";
    }
    if (!snapshot?.supportsXiamiBalance) {
      return "待开放";
    }
    return `${snapshot.xiamiBalance ?? 0}`;
  }, [authenticated, snapshot]);

  return {
    authenticated,
    messagesHref,
    rechargeHref,
    instances: snapshot?.instances ?? [],
    recentSessions: snapshot?.recentSessions ?? [],
    navItems,
    sidebarMessages,
    messageEmptyText,
    userCard,
    xiamiBalanceLabel,
    loading,
    error,
    refresh: loadData,
  };
}
