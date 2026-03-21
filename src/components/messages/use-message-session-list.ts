"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  closeConsumerChatSession,
  createConsumerChatSession,
  deleteConsumerChatSession,
  listConsumerChatSessions,
  renameConsumerChatSession,
} from "@/lib/consumer-api";
import type { ConsumerChatSession } from "@/types/consumer";
import type { MessageRobotTarget } from "./messages-types";

export type MessageSessionListItem = {
  sessionId: string;
  title: string;
  subtitle: string;
  sourceLabel: string;
  statusLabel: string;
  status: string;
  starting?: boolean;
  sending?: boolean;
  updatedAt?: string;
  messageCount?: number;
  connected?: boolean;
  remoteConnected?: boolean;
  generating?: boolean;
  hasTranscript: boolean;
  isCurrent: boolean;
  canClose: boolean;
  canDelete: boolean;
};

type SessionCacheUpdateOptions = {
  preferredRobotKey?: string;
  preferredSessionId?: string;
};

function buildRobotKey(robot?: Pick<MessageRobotTarget, "instanceId" | "agentId"> | Pick<ConsumerChatSession, "instanceId" | "agentId">) {
  if (!robot) {
    return undefined;
  }
  return `${robot.instanceId}:${robot.agentId}`;
}

function buildSessionTitle(item: ConsumerChatSession, index: number) {
  if (item.title?.trim()) {
    return item.title.trim();
  }
  return `\u4f1a\u8bdd ${index + 1}`;
}

function buildSessionSubtitle(item: ConsumerChatSession) {
  return item.agentId;
}

function buildStatusLabel(status: string) {
  return status === "ACTIVE" ? "\u5f85\u5f00\u59cb" : "\u5df2\u5173\u95ed";
}

function toSessionListItem(item: ConsumerChatSession, index: number): MessageSessionListItem {
  return {
    sessionId: item.sessionId,
    title: buildSessionTitle(item, index),
    subtitle: buildSessionSubtitle(item),
    sourceLabel: "\u804a\u5929\u4f1a\u8bdd",
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
  };
}

function sortSessions(sessions: ConsumerChatSession[]) {
  return [...sessions].sort((left, right) => {
    const rightTime = new Date(right.lastMessageAt ?? right.updatedAt).getTime();
    const leftTime = new Date(left.lastMessageAt ?? left.updatedAt).getTime();
    if (rightTime !== leftTime) {
      return rightTime - leftTime;
    }
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

function pickNextSessionId(sessions: ConsumerChatSession[]) {
  const remaining = [...sessions].sort((left, right) => {
    if (left.status !== right.status) {
      return left.status === "ACTIVE" ? -1 : 1;
    }
    const rightTime = new Date(right.lastMessageAt ?? right.updatedAt).getTime();
    const leftTime = new Date(left.lastMessageAt ?? left.updatedAt).getTime();
    return rightTime - leftTime;
  });
  return remaining[0]?.sessionId;
}

function resolveSelectedSessionId(
  sessions: ConsumerChatSession[],
  currentSelectedSessionId?: string,
  preferredSessionId?: string,
) {
  if (currentSelectedSessionId && sessions.some((item) => item.sessionId === currentSelectedSessionId)) {
    return currentSelectedSessionId;
  }
  if (preferredSessionId && sessions.some((item) => item.sessionId === preferredSessionId)) {
    return preferredSessionId;
  }
  return sessions.find((item) => item.status === "ACTIVE")?.sessionId ?? sessions[0]?.sessionId;
}

function groupSessionsByRobotKey(sessions: ConsumerChatSession[], robotKeys: string[]) {
  const grouped = robotKeys.reduce<Record<string, ConsumerChatSession[]>>((accumulator, robotKey) => {
    accumulator[robotKey] = [];
    return accumulator;
  }, {});

  sessions.forEach((session) => {
    const robotKey = buildRobotKey(session);
    if (!robotKey || !(robotKey in grouped)) {
      return;
    }
    grouped[robotKey].push(session);
  });

  Object.keys(grouped).forEach((robotKey) => {
    grouped[robotKey] = sortSessions(grouped[robotKey]);
  });

  return grouped;
}

function normalizeCreateSessionError(error: unknown) {
  const fallbackMessage = "创建会话失败，请稍后再试";
  if (!(error instanceof Error)) {
    return fallbackMessage;
  }
  const normalizedMessage = error.message.replace(/^HTTP\s+\d+\s*:\s*/i, "").trim();
  if (!normalizedMessage) {
    return fallbackMessage;
  }
  if (normalizedMessage.includes("active session limit reached")) {
    return "当前机器人最多只能保留 3 个会话，请先删除一个旧会话后再新建";
  }
  return normalizedMessage;
}

export function useMessageSessionList({
  robots = [],
  selectedRobot,
  preferredSessionId,
}: {
  robots?: MessageRobotTarget[];
  selectedRobot?: MessageRobotTarget;
  preferredSessionId?: string;
}) {
  const [sessionCacheByRobotKey, setSessionCacheByRobotKey] = useState<Record<string, ConsumerChatSession[]>>({});
  const [selectedSessionIdByRobotKey, setSelectedSessionIdByRobotKey] = useState<Record<string, string | undefined>>({});
  const [loadingByRobotKey, setLoadingByRobotKey] = useState<Record<string, boolean>>({});
  const [errorByRobotKey, setErrorByRobotKey] = useState<Record<string, string | undefined>>({});
  const loadRequestSeqByRobotKeyRef = useRef<Map<string, number>>(new Map());
  const preloadingAllSessionsRef = useRef(false);

  const selectedRobotKey = buildRobotKey(selectedRobot);
  const knownRobotKeys = useMemo(
    () => robots
      .map((robot) => buildRobotKey(robot))
      .filter((robotKey): robotKey is string => Boolean(robotKey)),
    [robots],
  );

  const applySessionCacheUpdates = useCallback((nextSessionsByRobotKey: Record<string, ConsumerChatSession[]>, options?: SessionCacheUpdateOptions) => {
    const normalizedEntries = Object.entries(nextSessionsByRobotKey).map(([robotKey, sessions]) => [robotKey, sortSessions(sessions)] as const);

    setSessionCacheByRobotKey((current) => {
      const next = { ...current };
      normalizedEntries.forEach(([robotKey, sessions]) => {
        next[robotKey] = sessions;
      });
      return next;
    });

    setSelectedSessionIdByRobotKey((current) => {
      const next = { ...current };
      normalizedEntries.forEach(([robotKey, sessions]) => {
        next[robotKey] = resolveSelectedSessionId(
          sessions,
          current[robotKey],
          robotKey === options?.preferredRobotKey ? options.preferredSessionId : undefined,
        );
      });
      return next;
    });
  }, []);

  const loadSessions = useCallback(async (targetRobot = selectedRobot) => {
    if (!targetRobot) {
      return [] as ConsumerChatSession[];
    }

    const robotKey = buildRobotKey(targetRobot);
    if (!robotKey) {
      return [] as ConsumerChatSession[];
    }

    const nextRequestSeq = (loadRequestSeqByRobotKeyRef.current.get(robotKey) ?? 0) + 1;
    loadRequestSeqByRobotKeyRef.current.set(robotKey, nextRequestSeq);
    setLoadingByRobotKey((current) => ({ ...current, [robotKey]: true }));
    setErrorByRobotKey((current) => ({ ...current, [robotKey]: undefined }));

    try {
      const response = await listConsumerChatSessions({
        instanceId: targetRobot.instanceId,
        agentId: targetRobot.agentId,
      });
      if (loadRequestSeqByRobotKeyRef.current.get(robotKey) !== nextRequestSeq) {
        return [] as ConsumerChatSession[];
      }

      const nextSessions = sortSessions(response.items);
      applySessionCacheUpdates(
        { [robotKey]: nextSessions },
        {
          preferredRobotKey: robotKey === selectedRobotKey ? robotKey : undefined,
          preferredSessionId: robotKey === selectedRobotKey ? preferredSessionId : undefined,
        },
      );
      return nextSessions;
    } catch (loadError) {
      if (loadRequestSeqByRobotKeyRef.current.get(robotKey) !== nextRequestSeq) {
        return [] as ConsumerChatSession[];
      }
      setErrorByRobotKey((current) => ({
        ...current,
        [robotKey]: loadError instanceof Error ? loadError.message : "\u52a0\u8f7d\u4f1a\u8bdd\u5217\u8868\u5931\u8d25",
      }));
      return [];
    } finally {
      if (loadRequestSeqByRobotKeyRef.current.get(robotKey) === nextRequestSeq) {
        setLoadingByRobotKey((current) => ({ ...current, [robotKey]: false }));
      }
    }
  }, [applySessionCacheUpdates, preferredSessionId, selectedRobot, selectedRobotKey]);

  const preloadAllSessions = useCallback(async () => {
    if (preloadingAllSessionsRef.current || knownRobotKeys.length <= 0) {
      return;
    }

    preloadingAllSessionsRef.current = true;
    try {
      const response = await listConsumerChatSessions();
      applySessionCacheUpdates(
        groupSessionsByRobotKey(response.items, knownRobotKeys),
        {
          preferredRobotKey: selectedRobotKey,
          preferredSessionId,
        },
      );
    } catch {
      // Warm-up failures should not interrupt the current robot flow.
    } finally {
      preloadingAllSessionsRef.current = false;
    }
  }, [applySessionCacheUpdates, knownRobotKeys, preferredSessionId, selectedRobotKey]);

  useEffect(() => {
    if (!selectedRobot) {
      return;
    }
    void loadSessions(selectedRobot);
  }, [loadSessions, selectedRobot]);

  useEffect(() => {
    if (knownRobotKeys.length <= 0) {
      return;
    }
    const hasMissingCache = knownRobotKeys.some((robotKey) => !(robotKey in sessionCacheByRobotKey));
    if (!hasMissingCache) {
      return;
    }
    void preloadAllSessions();
  }, [knownRobotKeys, preloadAllSessions, sessionCacheByRobotKey]);

  useEffect(() => {
    if (!selectedRobot) {
      return;
    }
    const timer = window.setInterval(() => {
      void loadSessions(selectedRobot);
    }, 10000);
    return () => window.clearInterval(timer);
  }, [loadSessions, selectedRobot]);

  const remoteSessions = useMemo(
    () => (selectedRobotKey ? sessionCacheByRobotKey[selectedRobotKey] ?? [] : []),
    [selectedRobotKey, sessionCacheByRobotKey],
  );

  const loading = selectedRobotKey ? Boolean(loadingByRobotKey[selectedRobotKey]) : false;
  const error = selectedRobotKey ? errorByRobotKey[selectedRobotKey] : undefined;

  const sessionItems = useMemo(
    () => remoteSessions.map((session, index) => toSessionListItem(session, index)),
    [remoteSessions],
  );

  useEffect(() => {
    if (!selectedRobotKey) {
      return;
    }
    const nextPreferredSessionId = sessionItems.find((item) => item.sessionId === preferredSessionId)?.sessionId
      ?? sessionItems.find((item) => item.status === "ACTIVE")?.sessionId
      ?? sessionItems[0]?.sessionId;

    setSelectedSessionIdByRobotKey((current) => {
      const currentSelectedSessionId = current[selectedRobotKey];
      if (currentSelectedSessionId && sessionItems.some((item) => item.sessionId === currentSelectedSessionId)) {
        return current;
      }
      if (currentSelectedSessionId === nextPreferredSessionId) {
        return current;
      }
      return {
        ...current,
        [selectedRobotKey]: nextPreferredSessionId,
      };
    });
  }, [preferredSessionId, selectedRobotKey, sessionItems]);

  const selectedSessionId = selectedRobotKey ? selectedSessionIdByRobotKey[selectedRobotKey] : undefined;

  const setSelectedSessionId = useCallback((sessionId: string) => {
    if (!selectedRobotKey) {
      return;
    }
    setSelectedSessionIdByRobotKey((current) => (
      current[selectedRobotKey] === sessionId
        ? current
        : { ...current, [selectedRobotKey]: sessionId }
    ));
  }, [selectedRobotKey]);

  const selectedSession = useMemo(
    () => sessionItems.find((item) => item.sessionId === selectedSessionId),
    [selectedSessionId, sessionItems],
  );

  const createSession = useCallback(async () => {
    if (!selectedRobot || !selectedRobotKey) {
      return undefined;
    }

    setErrorByRobotKey((current) => ({ ...current, [selectedRobotKey]: undefined }));
    try {
      const created = await createConsumerChatSession({
        instanceId: selectedRobot.instanceId,
        agentId: selectedRobot.agentId,
        title: undefined,
        remark: undefined,
      });
      const nextSessions = await loadSessions(selectedRobot);
      setSelectedSessionIdByRobotKey((current) => ({ ...current, [selectedRobotKey]: created.sessionId }));
      const createdIndex = nextSessions.findIndex((item) => item.sessionId === created.sessionId);
      return {
        ...toSessionListItem(created, createdIndex >= 0 ? createdIndex : nextSessions.length),
        title: created.title?.trim() || "\u65b0\u4f1a\u8bdd",
      } satisfies MessageSessionListItem;
    } catch (createError) {
      setErrorByRobotKey((current) => ({ ...current, [selectedRobotKey]: undefined }));
      throw new Error(normalizeCreateSessionError(createError));
    }
  }, [loadSessions, selectedRobot, selectedRobotKey]);

  const closeSession = useCallback(async (sessionId: string) => {
    if (!selectedRobot || !selectedRobotKey) {
      return;
    }

    setErrorByRobotKey((current) => ({ ...current, [selectedRobotKey]: undefined }));
    try {
      await closeConsumerChatSession(sessionId);
      const nextSessions = await loadSessions(selectedRobot);
      setSelectedSessionIdByRobotKey((current) => {
        if (current[selectedRobotKey] !== sessionId) {
          return current;
        }
        return {
          ...current,
          [selectedRobotKey]: pickNextSessionId(nextSessions),
        };
      });
    } catch (closeError) {
      const nextError = closeError instanceof Error ? closeError.message : "\u5173\u95ed\u4f1a\u8bdd\u5931\u8d25";
      setErrorByRobotKey((current) => ({ ...current, [selectedRobotKey]: nextError }));
      throw closeError;
    }
  }, [loadSessions, selectedRobot, selectedRobotKey]);

  const deleteSession = useCallback(async (sessionId: string) => {
    if (!selectedRobot || !selectedRobotKey) {
      return;
    }

    setErrorByRobotKey((current) => ({ ...current, [selectedRobotKey]: undefined }));
    try {
      await deleteConsumerChatSession(sessionId);
      const nextSessions = await loadSessions(selectedRobot);
      setSelectedSessionIdByRobotKey((current) => {
        if (current[selectedRobotKey] !== sessionId) {
          return current;
        }
        return {
          ...current,
          [selectedRobotKey]: pickNextSessionId(nextSessions.filter((item) => item.sessionId !== sessionId)),
        };
      });
    } catch (deleteError) {
      const nextError = deleteError instanceof Error ? deleteError.message : "\u5220\u9664\u4f1a\u8bdd\u5931\u8d25";
      setErrorByRobotKey((current) => ({ ...current, [selectedRobotKey]: nextError }));
      throw deleteError;
    }
  }, [loadSessions, selectedRobot, selectedRobotKey]);

  const renameSession = useCallback(async (sessionId: string, title: string) => {
    if (!selectedRobotKey) {
      throw new Error("\u5f53\u524d\u672a\u9009\u4e2d\u673a\u5668\u4eba");
    }

    setErrorByRobotKey((current) => ({ ...current, [selectedRobotKey]: undefined }));
    try {
      const renamed = await renameConsumerChatSession(sessionId, { title });
      setSessionCacheByRobotKey((current) => {
        const currentSessions = current[selectedRobotKey] ?? [];
        return {
          ...current,
          [selectedRobotKey]: sortSessions(
            currentSessions.map((session) => (session.sessionId === sessionId ? { ...session, ...renamed } : session)),
          ),
        };
      });
      return renamed;
    } catch (renameError) {
      const nextError = renameError instanceof Error ? renameError.message : "\u4fee\u6539\u4f1a\u8bdd\u540d\u5931\u8d25";
      setErrorByRobotKey((current) => ({ ...current, [selectedRobotKey]: nextError }));
      throw renameError;
    }
  }, [selectedRobotKey]);

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
    renameSession,
    ensureSession,
  };
}
