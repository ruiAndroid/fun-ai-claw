"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { listConsumerChatSessions } from "@/lib/consumer-api";

export type MessageRobotActivity = {
  activeSessionCount: number;
  connectedSessionCount: number;
  generatingSessionCount: number;
};

function emptyActivity(): MessageRobotActivity {
  return {
    activeSessionCount: 0,
    connectedSessionCount: 0,
    generatingSessionCount: 0,
  };
}

export function useMessageSessionActivity() {
  const [activityByRobotId, setActivityByRobotId] = useState<Record<string, MessageRobotActivity>>({});

  const loadActivity = useCallback(async () => {
    try {
      const response = await listConsumerChatSessions();
      const nextActivity = response.items.reduce<Record<string, MessageRobotActivity>>((accumulator, session) => {
        const robotId = `${session.instanceId}:${session.agentId}`;
        const current = accumulator[robotId] ?? emptyActivity();
        accumulator[robotId] = {
          activeSessionCount: current.activeSessionCount + (session.status === "ACTIVE" ? 1 : 0),
          connectedSessionCount: current.connectedSessionCount + (session.connected ? 1 : 0),
          generatingSessionCount: current.generatingSessionCount + (session.generating ? 1 : 0),
        };
        return accumulator;
      }, {});
      setActivityByRobotId(nextActivity);
    } catch {
      setActivityByRobotId({});
    }
  }, []);

  useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadActivity();
    }, 10000);
    return () => window.clearInterval(timer);
  }, [loadActivity]);

  const hasBackgroundActivity = useMemo(
    () => Object.values(activityByRobotId).some((item) => item.connectedSessionCount > 0 || item.generatingSessionCount > 0),
    [activityByRobotId],
  );

  return {
    activityByRobotId,
    hasBackgroundActivity,
    refreshActivity: loadActivity,
  };
}
