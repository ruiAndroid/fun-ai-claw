"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  closeConsumerChatSession,
  createConsumerChatSession,
  deleteConsumerChatSession,
  listConsumerChatSessions,
} from "@/lib/consumer-api";
import type { ConsumerChatSession } from "@/types/consumer";
import type { MessageRobotTarget } from "./messages-types";

export type MessageSessionListItem = {
  sessionId: string;
  openSessionId: string;
  title: string;
  subtitle: string;
  sourceLabel: string;
  statusLabel: string;
  status: string;
  updatedAt?: string;
  messageCount?: number;
  connected?: boolean;
  remoteConnected?: boolean;
  generating?: boolean;
  hasTranscript: boolean;
  isCurrent: boolean;
  canClose: boolean;
  canDelete: boolean;
  externalSessionKey?: string | null;
};

function buildSessionTitle(item: ConsumerChatSession, index: number) {
  if (item.title?.trim()) {
    return item.title.trim();
  }
  return `会话 ${index + 1}`;
}

function buildSessionSubtitle(item: ConsumerChatSession) {
  return [item.agentId, item.externalSessionKey].filter(Boolean).join(" · ");
}

function buildStatusLabel(status: string) {
  return status === "ACTIVE" ? "待开始" : "已关闭";
}

function toSessionListItem(item: ConsumerChatSession, index: number): MessageSessionListItem {
  return {
    sessionId: item.sessionId,
    openSessionId: item.openSessionId,
    title: buildSessionTitle(item, index),
    subtitle: buildSessionSubtitle(item),
    sourceLabel: "聊天会话",
    statusLabel: buildStatusLabel(item.status),
    status: item.status,
    updatedAt: item.lastMessageAt ?? item.updatedAt,
    messageCount: item.messageCount,
    connected: item.connected,
    remoteConnected: item.connected,
    generating: item.generating,
    hasTranscript: item.messageCount > 0,
    isCurrent: false,
    canClose: item.status === "ACTIVE",
    canDelete: item.status === "CLOSED",
    externalSessionKey: item.externalSessionKey,
  };
}

function pickNextSessionId(sessions: ConsumerChatSession[]) {
  const remaining = [...sessions]
    .sort((left, right) => {
      if (left.status !== right.status) {
        return left.status === "ACTIVE" ? -1 : 1;
      }
      const rightTime = new Date(right.lastMessageAt ?? right.updatedAt).getTime();
      const leftTime = new Date(left.lastMessageAt ?? left.updatedAt).getTime();
      return rightTime - leftTime;
    });
  return remaining[0]?.sessionId;
}

export function useMessageSessionList({
  selectedRobot,
  preferredSessionId,
}: {
  selectedRobot?: MessageRobotTarget;
  preferredSessionId?: string;
}) {
  const [remoteSessions, setRemoteSessions] = useState<ConsumerChatSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const loadSessions = useCallback(async () => {
    if (!selectedRobot) {
      setRemoteSessions([]);
      setSelectedSessionId(undefined);
      setError(undefined);
      setLoading(false);
      return [] as ConsumerChatSession[];
    }

    setLoading(true);
    setError(undefined);
    try {
      const response = await listConsumerChatSessions({
        instanceId: selectedRobot.instanceId,
        agentId: selectedRobot.agentId,
      });
      setRemoteSessions(response.items);
      return response.items;
    } catch (loadError) {
      setRemoteSessions([]);
      setError(loadError instanceof Error ? loadError.message : "加载会话列表失败");
      return [];
    } finally {
      setLoading(false);
    }
  }, [selectedRobot]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (!selectedRobot) {
      return;
    }
    const timer = window.setInterval(() => {
      void loadSessions();
    }, 10000);
    return () => window.clearInterval(timer);
  }, [loadSessions, selectedRobot]);

  const sessionItems = useMemo(
    () => remoteSessions.map((session, index) => toSessionListItem(session, index)),
    [remoteSessions],
  );

  useEffect(() => {
    const nextPreferredSessionId = sessionItems.find((item) => item.sessionId === preferredSessionId)?.sessionId
      ?? sessionItems.find((item) => item.status === "ACTIVE")?.sessionId
      ?? sessionItems[0]?.sessionId;

    setSelectedSessionId((current) => {
      if (current && sessionItems.some((item) => item.sessionId === current)) {
        return current;
      }
      return nextPreferredSessionId;
    });
  }, [preferredSessionId, sessionItems]);

  const selectedSession = useMemo(
    () => sessionItems.find((item) => item.sessionId === selectedSessionId),
    [selectedSessionId, sessionItems],
  );

  const createSession = useCallback(async () => {
    if (!selectedRobot) {
      return undefined;
    }

    setError(undefined);
    try {
      const created = await createConsumerChatSession({
        instanceId: selectedRobot.instanceId,
        agentId: selectedRobot.agentId,
        title: undefined,
        remark: undefined,
      });
      await loadSessions();
      setSelectedSessionId(created.sessionId);
      return {
        ...toSessionListItem(created, remoteSessions.length),
        title: created.title?.trim() || "新会话",
      } satisfies MessageSessionListItem;
    } catch (createError) {
      const nextError = createError instanceof Error ? createError.message : "创建会话失败";
      setError(nextError);
      throw createError;
    }
  }, [loadSessions, remoteSessions.length, selectedRobot]);

  const closeSession = useCallback(async (sessionId: string) => {
    setError(undefined);
    try {
      await closeConsumerChatSession(sessionId);
      const nextSessions = await loadSessions();
      setSelectedSessionId((current) => {
        if (current !== sessionId) {
          return current;
        }
        return pickNextSessionId(nextSessions);
      });
    } catch (closeError) {
      const nextError = closeError instanceof Error ? closeError.message : "关闭会话失败";
      setError(nextError);
      throw closeError;
    }
  }, [loadSessions]);

  const deleteSession = useCallback(async (sessionId: string) => {
    setError(undefined);
    try {
      await deleteConsumerChatSession(sessionId);
      const nextSessions = await loadSessions();
      setSelectedSessionId((current) => {
        if (current !== sessionId) {
          return current;
        }
        return pickNextSessionId(nextSessions.filter((item) => item.sessionId !== sessionId));
      });
    } catch (deleteError) {
      const nextError = deleteError instanceof Error ? deleteError.message : "删除会话失败";
      setError(nextError);
      throw deleteError;
    }
  }, [loadSessions]);

  const ensureSession = useCallback(async () => {
    if (selectedSession) {
      return selectedSession;
    }
    return createSession();
  }, [createSession, selectedSession]);

  return {
    sessionItems,
    selectedSessionId,
    setSelectedSessionId,
    selectedSession,
    loading,
    error,
    refresh: loadSessions,
    createSession,
    closeSession,
    deleteSession,
    ensureSession,
  };
}
