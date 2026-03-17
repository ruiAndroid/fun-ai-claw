"use client";

import {
  getInstanceOpenSessionOverview,
  listInstanceAgentBindings,
  listInstances,
} from "@/lib/control-api";
import type {
  ClawInstance,
  InstanceAgentBinding,
  InstanceOpenSessionItem,
} from "@/types/contracts";

export type MessageRobotBindingsSnapshot = {
  instances: ClawInstance[];
  bindingsByInstance: Map<string, InstanceAgentBinding[]>;
};

export type MessageSessionOverviewSnapshot = {
  items: InstanceOpenSessionItem[];
  supportsTranscriptReplay: boolean;
};

export async function loadMessageRobotBindings(): Promise<MessageRobotBindingsSnapshot> {
  const instancesResponse = await listInstances();
  const bindingsEntries = await Promise.all(
    instancesResponse.items.map(async (instance) => {
      const bindingsResponse = await listInstanceAgentBindings(instance.id);
      return [instance.id, bindingsResponse.items] as const;
    }),
  );

  return {
    instances: instancesResponse.items,
    bindingsByInstance: new Map(bindingsEntries),
  };
}

export async function loadMessageSessionOverview(
  instanceId: string,
  agentId: string,
): Promise<MessageSessionOverviewSnapshot> {
  const overview = await getInstanceOpenSessionOverview(instanceId);

  return {
    items: overview.items.filter((item) => (item.agentId ?? "") === agentId),
    supportsTranscriptReplay: false,
  };
}
