"use client";

import { useCallback, useEffect, useState } from "react";
import type { UserCenterVipInfo } from "@/types/user-center";
import {
  getCachedUserCenterVipInfo,
  getUserCenterVipInfo,
  hasUserCenterAuthCredentials,
  refreshUserCenterVipInfo,
  USER_CENTER_VIP_INFO_UPDATED_EVENT,
} from "@/lib/user-center-api";

function extractErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "会员信息加载失败，请稍后重试";
}

export function useUserCenterVipInfo({
  enabled = true,
}: {
  enabled?: boolean;
} = {}) {
  const [vipInfo, setVipInfo] = useState<UserCenterVipInfo | null>(() => (
    enabled ? getCachedUserCenterVipInfo() : null
  ));
  const [loading, setLoading] = useState(Boolean(enabled && !getCachedUserCenterVipInfo()));
  const [error, setError] = useState<string>();

  const loadVipInfo = useCallback(async (forceRefresh = false) => {
    if (!enabled || !hasUserCenterAuthCredentials()) {
      setVipInfo(null);
      setLoading(false);
      setError(undefined);
      return null;
    }

    setLoading(true);
    setError(undefined);

    try {
      const nextVipInfo = forceRefresh
        ? await refreshUserCenterVipInfo()
        : await getUserCenterVipInfo();
      setVipInfo(nextVipInfo);
      return nextVipInfo;
    } catch (loadError) {
      setError(extractErrorMessage(loadError));
      return null;
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setVipInfo(null);
      setLoading(false);
      setError(undefined);
      return;
    }

    setVipInfo(getCachedUserCenterVipInfo());
    void loadVipInfo(false);
  }, [enabled, loadVipInfo]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    const handleVipInfoUpdated = () => {
      setVipInfo(getCachedUserCenterVipInfo());
      setError(undefined);
      setLoading(false);
    };

    window.addEventListener(USER_CENTER_VIP_INFO_UPDATED_EVENT, handleVipInfoUpdated);
    return () => {
      window.removeEventListener(USER_CENTER_VIP_INFO_UPDATED_EVENT, handleVipInfoUpdated);
    };
  }, [enabled]);

  return {
    vipInfo,
    loading,
    error,
    refresh: () => loadVipInfo(true),
  };
}
