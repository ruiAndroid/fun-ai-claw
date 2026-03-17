"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { listInstanceAgentBindings, listInstances } from "@/lib/control-api";
import type { ClawInstance } from "@/types/contracts";
import { messagePageText } from "./messages-data";
import type { MessageRobotTarget } from "./messages-types";

function buildRobotTargets(instances: ClawInstance[], bindingsByInstance: Map<string, Awaited<ReturnType<typeof listInstanceAgentBindings>>["items"]>) {
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

export function useMessageRobots() {
  const [robots, setRobots] = useState<MessageRobotTarget[]>([]);
  const [selectedRobotId, setSelectedRobotId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const loadRobots = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const instancesResponse = await listInstances();
      const bindingsEntries = await Promise.all(
        instancesResponse.items.map(async (instance) => {
          const bindingsResponse = await listInstanceAgentBindings(instance.id);
          return [instance.id, bindingsResponse.items] as const;
        }),
      );
      const bindingsByInstance = new Map(bindingsEntries);
      const nextRobots = buildRobotTargets(instancesResponse.items, bindingsByInstance);
      setRobots(nextRobots);
      setSelectedRobotId((current) => {
        if (current && nextRobots.some((robot) => robot.id === current)) {
          return current;
        }
        return nextRobots[0]?.id;
      });
    } catch (loadError) {
      setRobots([]);
      setError(loadError instanceof Error ? loadError.message : messagePageText.robotsLoadFailed);
    } finally {
      setLoading(false);
    }
  }, []);

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
