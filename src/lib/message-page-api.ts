"use client";

import { listConsumerInstances } from "@/lib/consumer-api";
import {
  listInstanceAgentBindings,
  listInstances,
} from "@/lib/control-api";
import type {
  ClawInstance,
  InstanceAgentBinding,
} from "@/types/contracts";
import type { ConsumerBoundInstance } from "@/types/consumer";

export type MessageRobotBindingsSnapshot = {
  instances: ClawInstance[];
  bindingsByInstance: Map<string, InstanceAgentBinding[]>;
  source: "consumer" | "control";
};

function mapConsumerInstanceToClawInstance(instance: ConsumerBoundInstance): ClawInstance {
  return {
    id: instance.instanceId,
    hostId: "consumer-bound",
    name: instance.name,
    runtime: instance.runtime,
    image: instance.image,
    status: instance.status,
    desiredState: instance.desiredState,
    gatewayHostPort: instance.gatewayHostPort ?? null,
    gatewayUrl: instance.gatewayUrl ?? null,
    remoteConnectCommand: instance.remoteConnectCommand ?? null,
    createdAt: instance.instanceCreatedAt,
    updatedAt: instance.instanceUpdatedAt,
    restartRequired: instance.restartRequired,
  };
}

async function loadBindingsForInstances(instances: { id: string }[]) {
  const bindingsEntries = await Promise.all(
    instances.map(async (instance) => {
      const bindingsResponse = await listInstanceAgentBindings(instance.id);
      return [instance.id, bindingsResponse.items] as const;
    }),
  );
  return new Map(bindingsEntries);
}

async function loadConsumerRobotBindings(): Promise<MessageRobotBindingsSnapshot | null> {
  const consumerInstancesResponse = await listConsumerInstances();
  if (consumerInstancesResponse.items.length === 0) {
    return null;
  }

  const instances = consumerInstancesResponse.items.map(mapConsumerInstanceToClawInstance);
  const bindingsByInstance = await loadBindingsForInstances(instances);

  return {
    instances,
    bindingsByInstance,
    source: "consumer",
  };
}

async function loadControlRobotBindings(): Promise<MessageRobotBindingsSnapshot> {
  const instancesResponse = await listInstances();
  const bindingsByInstance = await loadBindingsForInstances(instancesResponse.items);

  return {
    instances: instancesResponse.items,
    bindingsByInstance,
    source: "control",
  };
}

export async function loadMessageRobotBindings(): Promise<MessageRobotBindingsSnapshot> {
  try {
    const consumerSnapshot = await loadConsumerRobotBindings();
    if (consumerSnapshot) {
      return consumerSnapshot;
    }
  } catch {
    // Fall through to the control-api fallback for local testing.
  }

  return loadControlRobotBindings();
}
