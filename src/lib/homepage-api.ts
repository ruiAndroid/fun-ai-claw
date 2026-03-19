"use client";

import { appConfig } from "@/config/app-config";
import { listConsumerChatSessions, listConsumerInstances } from "@/lib/consumer-api";
import { listInstanceAgentBindings } from "@/lib/control-api";
import {
  getCachedUserCenterMe,
  getUserCenterAuthSnapshot,
  getUserCenterMe,
  isUserCenterUnauthorizedError,
} from "@/lib/user-center-api";
import type { AgentBaselineSummary, ListResponse } from "@/types/contracts";
import type { ConsumerBoundInstance, ConsumerChatSession } from "@/types/consumer";
import type { UserCenterMe } from "@/types/user-center";

const BASE_URL = appConfig.controlApiBaseUrl;

export type HomepageRecentSessionPreview = {
  id: string;
  title: string;
  href: string;
  robotName?: string;
  robotKey: string;
  robotHref: string;
  status: "thinking" | "connected" | "active" | "closed";
};

export type HomepageRecentSessionGroup = {
  id: string;
  robotName: string;
  href: string;
  sessions: HomepageRecentSessionPreview[];
};

export type HomepageShellSnapshot = {
  authenticated: boolean;
  profile: UserCenterMe | null;
  instances: ConsumerBoundInstance[];
  recentSessions: HomepageRecentSessionPreview[];
  recentSessionGroups: HomepageRecentSessionGroup[];
  supportsXiamiBalance: boolean;
  supportsRecentSessions: boolean;
  xiamiBalance: number | null;
};

export function getInitialHomepageShellSnapshot(): HomepageShellSnapshot {
  const authSnapshot = getUserCenterAuthSnapshot();
  const hasAuth = Boolean(authSnapshot.accessToken || authSnapshot.refreshToken);
  const cachedProfile = hasAuth ? getCachedUserCenterMe() : null;

  return {
    authenticated: hasAuth,
    profile: cachedProfile,
    instances: [],
    recentSessions: [],
    recentSessionGroups: [],
    supportsXiamiBalance: false,
    supportsRecentSessions: false,
    xiamiBalance: null,
  };
}

async function buildRequestError(response: Response): Promise<Error> {
  const body = await response.text();
  let detail = body || response.statusText;

  if (body) {
    try {
      const parsed = JSON.parse(body) as { message?: string; detail?: string; error?: string };
      detail = parsed.message?.trim() || parsed.detail?.trim() || parsed.error?.trim() || detail;
    } catch {
      detail = body;
    }
  }

  return new Error(`HTTP ${response.status}: ${detail}`);
}

async function requestHomepageJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw await buildRequestError(response);
  }

  return (await response.json()) as T;
}

export async function listHomepageAgents() {
  return requestHomepageJson<ListResponse<AgentBaselineSummary>>("/app/v1/public/agents");
}

function buildRecentSessionHref(session: ConsumerChatSession) {
  const params = new URLSearchParams({
    instanceId: session.instanceId,
    agentId: session.agentId,
    sessionId: session.sessionId,
  });
  return `/messages?${params.toString()}`;
}

function buildRecentRobotHref(session: ConsumerChatSession) {
  const params = new URLSearchParams({
    instanceId: session.instanceId,
    agentId: session.agentId,
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

function resolveRecentSessionStatus(session: ConsumerChatSession): HomepageRecentSessionPreview["status"] {
  if (session.generating) {
    return "thinking";
  }
  if (session.connected) {
    return "connected";
  }
  if (session.status === "ACTIVE") {
    return "active";
  }
  return "closed";
}

function buildRecentSessionPreviews(
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
    .map((session) => ({
      id: session.sessionId,
      title: buildRecentSessionTitle(session, instanceNameById),
      href: buildRecentSessionHref(session),
      robotName: agentDisplayNameByKey.get(`${session.instanceId}:${session.agentId}`) ?? session.agentId,
      robotKey: `${session.instanceId}:${session.agentId}`,
      robotHref: buildRecentRobotHref(session),
      status: resolveRecentSessionStatus(session),
    }));
}

function buildRecentSessionGroups(recentSessions: HomepageRecentSessionPreview[]): HomepageRecentSessionGroup[] {
  const groups: HomepageRecentSessionGroup[] = [];
  const groupByRobotKey = new Map<string, HomepageRecentSessionGroup>();

  for (const session of recentSessions) {
    let group = groupByRobotKey.get(session.robotKey);
    if (!group) {
      if (groups.length >= 4) {
        continue;
      }
      group = {
        id: session.robotKey,
        robotName: session.robotName || "未命名机器人",
        href: session.robotHref,
        sessions: [],
      };
      groupByRobotKey.set(session.robotKey, group);
      groups.push(group);
    }
    if (group.sessions.length >= 3) {
      continue;
    }
    group.sessions.push(session);
  }

  return groups;
}

export async function loadHomepageShellSnapshot(): Promise<HomepageShellSnapshot> {
  const initialSnapshot = getInitialHomepageShellSnapshot();

  if (!initialSnapshot.authenticated) {
    return initialSnapshot;
  }

  const [profileResult, instancesResult, recentSessionsResult] = await Promise.allSettled([
    getUserCenterMe(),
    listConsumerInstances(),
    listConsumerChatSessions(),
  ]);

  const profile = profileResult.status === "fulfilled" ? profileResult.value : null;
  const instances = instancesResult.status === "fulfilled" ? instancesResult.value.items : [];
  const agentDisplayNameByKey = recentSessionsResult.status === "fulfilled"
    ? await loadAgentDisplayNameMap(instances, recentSessionsResult.value.items)
    : new Map<string, string>();
  const recentSessionPreviews = recentSessionsResult.status === "fulfilled"
    ? buildRecentSessionPreviews(recentSessionsResult.value.items, instances, agentDisplayNameByKey)
    : [];
  const recentSessions = recentSessionPreviews.slice(0, 6);
  const recentSessionGroups = buildRecentSessionGroups(recentSessionPreviews);

  if (!profile && instances.length === 0) {
    const rejectedReason = profileResult.status === "rejected"
      ? profileResult.reason
      : instancesResult.status === "rejected"
          ? instancesResult.reason
          : recentSessionsResult.status === "rejected"
            ? recentSessionsResult.reason
          : null;

    if (isUserCenterUnauthorizedError(rejectedReason)) {
      return {
        authenticated: false,
        profile: null,
        instances: [],
        recentSessions: [],
        recentSessionGroups: [],
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
    profile,
    instances,
    recentSessions,
    recentSessionGroups,
    supportsXiamiBalance: false,
    supportsRecentSessions: recentSessionsResult.status === "fulfilled",
    xiamiBalance: null,
  };
}
