"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { buildSidebarNavItems, type SidebarMessageItem } from "./homepage-data";
import { getInitialHomepageShellSnapshot, loadHomepageShellSnapshot } from "@/lib/homepage-api";

export type HomepageUserCard = {
  title: string;
  subtitle: string;
  href: string;
  avatarUrl?: string | null;
};

function formatErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "棣栭〉鏁版嵁鍔犺浇澶辫触";
}

export function useHomepageShellData() {
  const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof loadHomepageShellSnapshot>>>(() => getInitialHomepageShellSnapshot());
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
    void loadData();
  }, [loadData]);

  const authenticated = Boolean(snapshot?.authenticated);
  const messagesHref = authenticated ? "/messages" : "/login";
  const rechargeHref = authenticated ? "/recharge" : "/login";

  const userCard = useMemo<HomepageUserCard>(() => {
    if (error) {
      return {
        title: "涓汉涓績",
        subtitle: "鐢ㄦ埛璧勬枡鏆傛椂涓嶅彲鐢紝璇风◢鍚庨噸璇?",
        href: "/me",
      };
    }

    if (!authenticated) {
      return {
        title: "鐧诲綍 / 涓汉涓績",
        subtitle: "鐧诲綍鍚庢煡鐪嬩綘鐨勪細璇濄€佸疄渚嬩笌璐﹀彿璧勬枡",
        href: "/login",
      };
    }

    return {
      title: snapshot?.consumerAccount?.displayName?.trim() || snapshot?.profile?.nickname?.trim() || "涓汉涓績",
      subtitle: snapshot?.consumerAccount?.phoneMasked?.trim() || snapshot?.profile?.phoneMasked?.trim() || "璐﹀彿宸茬櫥褰曪紝娆㈣繋鍥炴潵",
      href: "/me",
      avatarUrl: snapshot?.consumerAccount?.avatarUrl || snapshot?.profile?.avatarUrl,
    };
  }, [authenticated, error, snapshot]);

  const navItems = useMemo(() => {
    const totalInstances = snapshot?.instances.length ?? 0;
    const runningInstances = snapshot?.instances.filter((item) => item.status === "RUNNING").length ?? 0;

    return buildSidebarNavItems({
      robotCount: totalInstances,
      robotSummary: totalInstances > 0 ? `杩愯涓?${runningInstances} / 宸茬粦瀹?${totalInstances}` : undefined,
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
      return "鏈€杩戜細璇濇殏鏃朵笉鍙敤锛岃绋嶅悗閲嶈瘯銆?";
    }
    if (!authenticated) {
      return "鐧诲綍鍚庤繖閲屼細灞曠ず浣犳渶杩戠殑浼氳瘽銆?";
    }
    if (!snapshot?.supportsRecentSessions) {
      return "鏈€杩戜細璇濆姛鑳芥殏鏈紑鏀俱€?";
    }
    return "鏆傛棤鏈€杩戜細璇濄€?";
  }, [authenticated, error, snapshot]);

  const xiamiBalanceLabel = useMemo(() => {
    if (!authenticated) {
      return "--";
    }
    if (!snapshot?.supportsXiamiBalance) {
      return "寰呭紑鏀?";
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
