"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { loadMessageSessionOverview } from "@/lib/message-page-api";
import type { InstanceOpenSessionItem } from "@/types/contracts";
import type { MessageRobotTarget, MessageSessionArchive } from "./messages-types";

export type MessageSessionListItem = {
  sessionId: string;
  title: string;
  subtitle: string;
  sourceLabel: string;
  statusLabel: string;
  updatedAt?: string;
  messageCount?: number;
  connected?: boolean;
  hasTranscript: boolean;
  isCurrent: boolean;
  isDraft: boolean;
  externalSessionKey?: string | null;
};

function buildSessionTitle(item: InstanceOpenSessionItem) {
  return item.externalSessionKey?.trim() || item.sessionId;
}

function buildSessionSubtitle(item: InstanceOpenSessionItem) {
  return [item.appName || item.appId, item.sourceType].filter(Boolean).join(" · ");
}

function buildStatusLabel(item: InstanceOpenSessionItem) {
  if (item.connected) {
    return "连接中";
  }
  return item.status === "ACTIVE" ? "活跃" : "已关闭";
}

export function useMessageSessionList({
  selectedRobot,
  currentSessionId,
  hasConversation,
  sessionArchives,
}: {
  selectedRobot?: MessageRobotTarget;
  currentSessionId?: string;
  hasConversation: boolean;
  sessionArchives: MessageSessionArchive[];
}) {
  const [remoteSessions, setRemoteSessions] = useState<InstanceOpenSessionItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const loadSessions = useCallback(async () => {
    if (!selectedRobot) {
      setRemoteSessions([]);
      setError(undefined);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(undefined);
    try {
      const overview = await loadMessageSessionOverview(selectedRobot.instanceId, selectedRobot.agentId);
      setRemoteSessions(overview.items);
    } catch (loadError) {
      setRemoteSessions([]);
      setError(loadError instanceof Error ? loadError.message : "加载会话列表失败");
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

  const sessionItems = useMemo(() => {
    const items = new Map<string, MessageSessionListItem>();

    remoteSessions.forEach((session) => {
      items.set(session.sessionId, {
        sessionId: session.sessionId,
        title: buildSessionTitle(session),
        subtitle: buildSessionSubtitle(session),
        sourceLabel: session.sourceType === "agent_session" ? "Agent Session" : "Open Session",
        statusLabel: buildStatusLabel(session),
        updatedAt: session.updatedAt,
        messageCount: session.messageCount,
        connected: session.connected,
        hasTranscript: sessionArchives.some((archive) => archive.sessionId === session.sessionId),
        isCurrent: session.sessionId === currentSessionId,
        isDraft: false,
        externalSessionKey: session.externalSessionKey,
      });
    });

    sessionArchives.forEach((archive) => {
      if (items.has(archive.sessionId)) {
        const current = items.get(archive.sessionId)!;
        items.set(archive.sessionId, {
          ...current,
          hasTranscript: true,
          updatedAt: archive.updatedAt,
        });
        return;
      }
      items.set(archive.sessionId, {
        sessionId: archive.sessionId,
        title: archive.sessionId,
        subtitle: "本页已打开的会话",
        sourceLabel: "Local Cache",
        statusLabel: "已归档",
        updatedAt: archive.updatedAt,
        messageCount: archive.messages.length,
        connected: false,
        hasTranscript: true,
        isCurrent: archive.sessionId === currentSessionId,
        isDraft: false,
      });
    });

    if (hasConversation && !currentSessionId && selectedRobot) {
      items.set(`draft:${selectedRobot.id}`, {
        sessionId: `draft:${selectedRobot.id}`,
        title: "当前新会话",
        subtitle: "会话已开始，等待后端返回 sessionId",
        sourceLabel: "Draft",
        statusLabel: "建立中",
        updatedAt: new Date().toISOString(),
        messageCount: undefined,
        connected: true,
        hasTranscript: true,
        isCurrent: true,
        isDraft: true,
      });
    }

    return [...items.values()].sort((left, right) => {
      const leftTime = left.updatedAt ? new Date(left.updatedAt).getTime() : 0;
      const rightTime = right.updatedAt ? new Date(right.updatedAt).getTime() : 0;
      return rightTime - leftTime;
    });
  }, [currentSessionId, hasConversation, remoteSessions, selectedRobot, sessionArchives]);

  useEffect(() => {
    const preferredSessionId = currentSessionId
      ?? (hasConversation && selectedRobot ? `draft:${selectedRobot.id}` : undefined)
      ?? sessionItems[0]?.sessionId;

    setSelectedSessionId((current) => {
      if (current && sessionItems.some((item) => item.sessionId === current)) {
        return current;
      }
      return preferredSessionId;
    });
  }, [currentSessionId, hasConversation, selectedRobot, sessionItems]);

  const selectedSession = useMemo(
    () => sessionItems.find((item) => item.sessionId === selectedSessionId),
    [selectedSessionId, sessionItems],
  );

  return {
    sessionItems,
    selectedSessionId,
    setSelectedSessionId,
    selectedSession,
    loading,
    error,
    refresh: loadSessions,
  };
}
