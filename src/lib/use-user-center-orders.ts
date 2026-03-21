"use client";

import { useCallback, useEffect, useState } from "react";
import type { UserCenterOrderRecord } from "@/types/user-center";
import {
  getCachedUserCenterOrders,
  getUserCenterOrders,
  hasUserCenterAuthCredentials,
  refreshUserCenterOrders,
} from "@/lib/user-center-api";

function extractErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "购买记录加载失败，请稍后重试";
}

export function useUserCenterOrders({
  enabled = true,
}: {
  enabled?: boolean;
} = {}) {
  const [orders, setOrders] = useState<UserCenterOrderRecord[]>(() => (
    enabled ? getCachedUserCenterOrders() : []
  ));
  const [loading, setLoading] = useState(Boolean(enabled && getCachedUserCenterOrders().length === 0));
  const [error, setError] = useState<string>();

  const loadOrders = useCallback(async (forceRefresh = false) => {
    if (!enabled || !hasUserCenterAuthCredentials()) {
      setOrders([]);
      setLoading(false);
      setError(undefined);
      return [];
    }

    setLoading(true);
    setError(undefined);

    try {
      const nextOrders = forceRefresh
        ? await refreshUserCenterOrders()
        : await getUserCenterOrders();
      setOrders(nextOrders);
      return nextOrders;
    } catch (loadError) {
      setError(extractErrorMessage(loadError));
      return [];
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setOrders([]);
      setLoading(false);
      setError(undefined);
      return;
    }

    setOrders(getCachedUserCenterOrders());
    void loadOrders();
  }, [enabled, loadOrders]);

  return {
    orders,
    loading,
    error,
    refresh: () => loadOrders(true),
  };
}
