"use client";

import { getConsumerAccount, listConsumerChatSessions, listConsumerInstances } from "@/lib/consumer-api";
import { listInstanceAgentBindings } from "@/lib/control-api";
import { getUserCenterAuthSnapshot, isUserCenterUnauthorizedError } from "@/lib/user-center-api";
import type { ConsumerAccount, ConsumerBoundInstance, ConsumerChatSession } from "@/types/consumer";

export type HomepageRecentSessionPreview = {
  id: string;
  title: string;
  href: string;
  robotName?: string;
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

function buildRecentSessionHref(session: ConsumerChatSession) {
  const params = new URLSearchParams({
    instanceId: session.instanceId,
    agentId: session.agentId,
    sessionId: session.sessionId,
  });
  return `/messages?${params.toString()}`;
}

function buildRecentSessionTitle(session: ConsumerChatSession, instanceNameById: Map<string, string>) {
  const sessionTitle = session.title?.trim();
  if (sessionTitle) {
    return sessionTitle;
  }
  const instanceName = instanceNameById.get(session.instanceId)?.trim();
  if (instanceName) {
    return instanceName;
  }
  return "新会话";
}

async function loadAgentDisplayNameMap(instances: ConsumerBoundInstance[], sessions: ConsumerChatSession[]) {
  const targetInstanceIds = [...new Set(
    sessions
      .map((session) => session.instanceId)
      .filter((instanceId) => instances.some((instance) => instance.instanceId === instanceId)),
  )];
  if (targetInstanceIds.length === 0) {
    return new Map<string, string>();
  }

  const bindingResults = await Promise.allSettled(
    targetInstanceIds.map(async (instanceId) => {
      const response = await listInstanceAgentBindings(instanceId);
      return response.items.map((binding) => [
        `${instanceId}:${binding.agentKey}`,
        binding.displayName?.trim() || binding.agentKey,
      ] as const);
    }),
  );

  const displayNameByAgent = new Map<string, string>();
  bindingResults.forEach((result) => {
    if (result.status !== "fulfilled") {
      return;
    }
    result.value.forEach(([key, displayName]) => {
      displayNameByAgent.set(key, displayName);
    });
  });
  return displayNameByAgent;
}

function buildRecentSessions(
  sessions: ConsumerChatSession[],
  instances: ConsumerBoundInstance[],
  agentDisplayNameByKey: Map<string, string>,
): HomepageRecentSessionPreview[] {
  const instanceNameById = new Map(instances.map((item) => [item.instanceId, item.name]));
  return [...sessions]
    .sort((left, right) => {
      const rightTime = new Date(right.lastMessageAt ?? right.updatedAt).getTime();
      const leftTime = new Date(left.lastMessageAt ?? left.updatedAt).getTime();
      return rightTime - leftTime;
    })
    .slice(0, 6)
    .map((session) => ({
      id: session.sessionId,
      title: buildRecentSessionTitle(session, instanceNameById),
      href: buildRecentSessionHref(session),
      robotName: agentDisplayNameByKey.get(`${session.instanceId}:${session.agentId}`) ?? session.agentId,
    }));
}

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

  const [accountResult, instancesResult, recentSessionsResult] = await Promise.allSettled([
    getConsumerAccount(),
    listConsumerInstances(),
    listConsumerChatSessions(),
  ]);

  const account = accountResult.status === "fulfilled" ? accountResult.value : null;
  const instances = instancesResult.status === "fulfilled" ? instancesResult.value.items : [];
  const agentDisplayNameByKey = recentSessionsResult.status === "fulfilled"
    ? await loadAgentDisplayNameMap(instances, recentSessionsResult.value.items)
    : new Map<string, string>();
  const recentSessions = recentSessionsResult.status === "fulfilled"
    ? buildRecentSessions(recentSessionsResult.value.items, instances, agentDisplayNameByKey)
    : [];

  if (!account && instances.length === 0) {
    const rejectedReason = accountResult.status === "rejected"
      ? accountResult.reason
      : instancesResult.status === "rejected"
        ? instancesResult.reason
        : recentSessionsResult.status === "rejected"
          ? recentSessionsResult.reason
          : null;

    if (isUserCenterUnauthorizedError(rejectedReason)) {
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

    if (rejectedReason instanceof Error) {
      throw rejectedReason;
    }
    throw new Error("首页数据加载失败");
  }

  return {
    authenticated: true,
    account,
    instances,
    recentSessions,
    supportsXiamiBalance: false,
    supportsRecentSessions: recentSessionsResult.status === "fulfilled",
    xiamiBalance: null,
  };
}
