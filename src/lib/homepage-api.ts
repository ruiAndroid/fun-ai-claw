"use client";

import { getConsumerAccount, listConsumerInstances } from "@/lib/consumer-api";
import { getUserCenterAuthSnapshot } from "@/lib/user-center-api";
import type { ConsumerAccount, ConsumerBoundInstance } from "@/types/consumer";

export type HomepageRecentSessionPreview = {
  id: string;
  title: string;
  href: string;
};

export type HomepageShellSnapshot = {
  authenticated: boolean;
  account: ConsumerAccount | null;
  instances: ConsumerBoundInstance[];
  recentSessions: HomepageRecentSessionPreview[];
  supportsXiamiBalance: boolean;
  supportsRecentSessions: boolean;
  xiamiBalance: number | null;
};

export async function loadHomepageShellSnapshot(): Promise<HomepageShellSnapshot> {
  const authSnapshot = getUserCenterAuthSnapshot();
  const hasAuth = Boolean(authSnapshot.accessToken || authSnapshot.refreshToken);

  if (!hasAuth) {
    return {
      authenticated: false,
      account: null,
      instances: [],
      recentSessions: [],
      supportsXiamiBalance: false,
      supportsRecentSessions: false,
      xiamiBalance: null,
    };
  }

  const [accountResult, instancesResult] = await Promise.allSettled([
    getConsumerAccount(),
    listConsumerInstances(),
  ]);

  const account = accountResult.status === "fulfilled" ? accountResult.value : null;
  const instances = instancesResult.status === "fulfilled" ? instancesResult.value.items : [];

  if (!account && instances.length === 0) {
    const rejectedReason = accountResult.status === "rejected"
      ? accountResult.reason
      : instancesResult.status === "rejected"
        ? instancesResult.reason
        : null;

    if (rejectedReason instanceof Error) {
      throw rejectedReason;
    }
    throw new Error("首页数据加载失败");
  }

  return {
    authenticated: true,
    account,
    instances,
    recentSessions: [],
    supportsXiamiBalance: false,
    supportsRecentSessions: false,
    xiamiBalance: null,
  };
}
