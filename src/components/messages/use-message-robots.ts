"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { loadMessageRobotBindings } from "@/lib/message-page-api";
import type { ClawInstance, InstanceAgentBinding } from "@/types/contracts";
import { messagePageText } from "./messages-data";
import type { MessageRobotTarget } from "./messages-types";

function buildRobotTargets(instances: ClawInstance[], bindingsByInstance: Map<string, InstanceAgentBinding[]>) {
  return instances
    .flatMap((instance) => {
      const bindings = bindingsByInstance.get(instance.id) ?? [];
      return bindings
        .filter((binding) => binding.enabled)
        .map<MessageRobotTarget>((binding) => ({
          id: `${instance.id}:${binding.agentKey}`,
          instanceId: instance.id,
          instanceName: instance.name,
          instanceStatus: instance.status,
          agentId: binding.agentKey,
          displayName: binding.displayName || binding.agentKey,
          description: binding.description,
          provider: binding.provider,
          model: binding.model,
          updatedAt: binding.updatedAt,
          isAvailable: instance.status === "RUNNING",
        }));
    })
    .sort((left, right) => {
      if (left.isAvailable !== right.isAvailable) {
        return left.isAvailable ? -1 : 1;
      }
      return left.displayName.localeCompare(right.displayName, "zh-CN");
    });
}

function resolvePreferredRobotId(
  robots: MessageRobotTarget[],
  preferredInstanceId?: string,
  preferredAgentId?: string,
) {
  if (preferredInstanceId && preferredAgentId) {
    return robots.find((robot) => (
      robot.instanceId === preferredInstanceId && robot.agentId === preferredAgentId
    ))?.id;
  }

  if (preferredInstanceId) {
    return robots.find((robot) => robot.instanceId === preferredInstanceId)?.id;
  }

  if (preferredAgentId) {
    return robots.find((robot) => robot.agentId === preferredAgentId)?.id;
  }

  return undefined;
}

export function useMessageRobots({
  preferredInstanceId,
  preferredAgentId,
  enabled = true,
}: {
  preferredInstanceId?: string;
  preferredAgentId?: string;
  enabled?: boolean;
} = {}) {
  const [robots, setRobots] = useState<MessageRobotTarget[]>([]);
  const [selectedRobotId, setSelectedRobotId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const loadRobots = useCallback(async () => {
    if (!enabled) {
      setRobots([]);
      setSelectedRobotId(undefined);
      setError(undefined);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(undefined);
    try {
      const snapshot = await loadMessageRobotBindings();
      const nextRobots = buildRobotTargets(snapshot.instances, snapshot.bindingsByInstance);
      const preferredRobotId = resolvePreferredRobotId(
        nextRobots,
        preferredInstanceId,
        preferredAgentId,
      );
      setRobots(nextRobots);
      setSelectedRobotId((current) => {
        if (current && nextRobots.some((robot) => robot.id === current)) {
          return current;
        }
        if (preferredRobotId) {
          return preferredRobotId;
        }
        return nextRobots[0]?.id;
      });
    } catch (loadError) {
      setRobots([]);
      setError(loadError instanceof Error ? loadError.message : messagePageText.robotsLoadFailed);
    } finally {
      setLoading(false);
    }
  }, [enabled, preferredAgentId, preferredInstanceId]);

  useEffect(() => {
    void loadRobots();
  }, [loadRobots]);

  const selectedRobot = useMemo(
    () => robots.find((robot) => robot.id === selectedRobotId),
    [robots, selectedRobotId],
  );

  return {
    robots,
    selectedRobot,
    selectedRobotId,
    setSelectedRobotId,
    loading,
    error,
    refresh: loadRobots,
  };
}
