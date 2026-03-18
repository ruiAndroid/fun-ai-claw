"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { buildSidebarNavItems, type SidebarMessageItem } from "./homepage-data";
import { loadHomepageShellSnapshot } from "@/lib/homepage-api";

export type HomepageUserCard = {
  title: string;
  subtitle: string;
  href: string;
  avatarUrl?: string | null;
};

function formatErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "首页数据加载失败";
}

export function useHomepageShellData() {
  const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof loadHomepageShellSnapshot>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    try {
      const nextSnapshot = await loadHomepageShellSnapshot();
      setSnapshot(nextSnapshot);
    } catch (loadError) {
      setSnapshot(null);
      setError(formatErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const authenticated = Boolean(snapshot?.authenticated);
  const messagesHref = authenticated ? "/messages" : "/login";
  const rechargeHref = authenticated ? "/recharge" : "/login";

  const userCard = useMemo<HomepageUserCard>(() => {
    if (error) {
      return {
        title: "个人中心",
        subtitle: "用户资料暂时不可用，请稍后重试",
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

  const sidebarMessages = useMemo<SidebarMessageItem[]>(() => (
    snapshot?.recentSessions.map((item) => ({
      id: item.id,
      title: item.title,
      href: item.href,
      robotName: item.robotName,
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
