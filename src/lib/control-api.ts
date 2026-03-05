import {
  AgentDescriptor,
  AgentSystemPromptResponse,
  AgentTaskConfirmRequest,
  AgentTaskConfirmResponse,
  AgentTaskPrepareRequest,
  AgentTaskPrepareResponse,
  AgentTaskResponse,
  AcceptedActionResponse,
  ClawInstance,
  CreateInstanceRequest,
  ImagePreset,
  InstanceMainAgentGuidance,
  InstanceActionType,
  ListResponse,
  PairingCodeResponse,
  SkillDescriptor,
} from "@/types/contracts";
import { appConfig } from "@/config/app-config";

const BASE_URL = appConfig.controlApiBaseUrl;

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status}: ${body || response.statusText}`);
  }
  return (await response.json()) as T;
}

async function requestVoid(path: string, init?: RequestInit): Promise<void> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status}: ${body || response.statusText}`);
  }
}

export async function listInstances() {
  return requestJson<ListResponse<ClawInstance>>("/v1/instances");
}

export async function listImages() {
  return requestJson<ListResponse<ImagePreset>>("/v1/images");
}

export async function createInstance(request: CreateInstanceRequest) {
  return requestJson<ClawInstance>("/v1/instances", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function submitInstanceAction(instanceId: string, action: InstanceActionType) {
  return requestJson<AcceptedActionResponse>(`/v1/instances/${instanceId}/actions`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}

export async function deleteInstance(instanceId: string) {
  return requestVoid(`/v1/instances/${instanceId}`, {
    method: "DELETE",
  });
}

export async function getInstancePairingCode(instanceId: string) {
  return requestJson<PairingCodeResponse>(`/v1/instances/${instanceId}/pairing-code`);
}

export async function listInstanceAgents(instanceId: string) {
  return requestJson<ListResponse<AgentDescriptor>>(`/v1/instances/${instanceId}/agents`);
}

export async function upsertInstanceAgentSystemPrompt(
  instanceId: string,
  agentId: string,
  request: { systemPrompt: string }
) {
  return requestJson<AgentSystemPromptResponse>(`/v1/instances/${instanceId}/agents/${encodeURIComponent(agentId)}/system-prompt`, {
    method: "PUT",
    body: JSON.stringify(request),
  });
}

export async function listInstanceSkills(instanceId: string) {
  return requestJson<ListResponse<SkillDescriptor>>(`/v1/instances/${instanceId}/skills`);
}

export async function getInstanceMainAgentGuidance(instanceId: string) {
  return requestJson<InstanceMainAgentGuidance>(`/v1/instances/${instanceId}/main-agent-guidance`);
}

export async function upsertInstanceMainAgentGuidance(
  instanceId: string,
  request: { prompt?: string; enabled?: boolean; updatedBy?: string }
) {
  return requestJson<InstanceMainAgentGuidance>(`/v1/instances/${instanceId}/main-agent-guidance`, {
    method: "PUT",
    body: JSON.stringify(request),
  });
}

export async function deleteInstanceMainAgentGuidance(instanceId: string) {
  return requestJson<InstanceMainAgentGuidance>(`/v1/instances/${instanceId}/main-agent-guidance`, {
    method: "DELETE",
  });
}

export async function prepareAgentTask(request: AgentTaskPrepareRequest) {
  return requestJson<AgentTaskPrepareResponse>("/v1/agent-tasks/prepare", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function confirmAgentTask(request: AgentTaskConfirmRequest) {
  return requestJson<AgentTaskConfirmResponse>("/v1/agent-tasks/confirm", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function getAgentTask(taskId: string) {
  return requestJson<AgentTaskResponse>(`/v1/agent-tasks/tasks/${taskId}`);
}
