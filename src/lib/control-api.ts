import {
  AgentBaseline,
  AgentBaselineSummary,
  AgentBaselineUpsertRequest,
  AgentDescriptor,
  AgentSystemPrompt,
  ClawInstance,
  CreateInstanceRequest,
  ImagePreset,
  InstanceConfig,
  InstanceMainAgentGuidance,
  InstanceRoutingConfig,
  InstanceActionType,
  ListResponse,
  OpenClientApp,
  OpenClientAppCreateRequest,
  OpenClientAppCreateResponse,
  OpenClientAppUpdateRequest,
  PairingCodeResponse,
  SkillBaseline,
  SkillBaselineSummary,
  SkillBaselineUpsertRequest,
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

export async function listAgentBaselines() {
  return requestJson<ListResponse<AgentBaselineSummary>>("/v1/agent-baselines");
}

export async function getAgentBaseline(agentKey: string) {
  return requestJson<AgentBaseline>(`/v1/agent-baselines/${encodeURIComponent(agentKey)}`);
}

export async function createAgentBaseline(request: AgentBaselineUpsertRequest) {
  return requestJson<AgentBaseline>("/v1/agent-baselines", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function upsertAgentBaseline(agentKey: string, request: AgentBaselineUpsertRequest) {
  return requestJson<AgentBaseline>(`/v1/agent-baselines/${encodeURIComponent(agentKey)}`, {
    method: "PUT",
    body: JSON.stringify(request),
  });
}

export async function deleteAgentBaseline(agentKey: string) {
  return requestVoid(`/v1/agent-baselines/${encodeURIComponent(agentKey)}`, {
    method: "DELETE",
  });
}

export async function listSkillBaselines() {
  return requestJson<ListResponse<SkillBaselineSummary>>("/v1/skill-baselines");
}

export async function getSkillBaseline(skillKey: string) {
  return requestJson<SkillBaseline>(`/v1/skill-baselines/${encodeURIComponent(skillKey)}`);
}

export async function createSkillBaseline(request: SkillBaselineUpsertRequest) {
  return requestJson<SkillBaseline>("/v1/skill-baselines", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function upsertSkillBaseline(skillKey: string, request: SkillBaselineUpsertRequest) {
  return requestJson<SkillBaseline>(`/v1/skill-baselines/${encodeURIComponent(skillKey)}`, {
    method: "PUT",
    body: JSON.stringify(request),
  });
}

export async function deleteSkillBaseline(skillKey: string) {
  return requestVoid(`/v1/skill-baselines/${encodeURIComponent(skillKey)}`, {
    method: "DELETE",
  });
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
  return requestVoid(`/v1/instances/${instanceId}/actions`, {
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

export async function upsertAgentSystemPrompt(
  instanceId: string,
  agentId: string,
  request: { systemPrompt: string; updatedBy?: string }
) {
  return requestJson<AgentSystemPrompt>(`/v1/instances/${instanceId}/agents/${encodeURIComponent(agentId)}/system-prompt`, {
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

export async function getInstanceConfig(instanceId: string) {
  return requestJson<InstanceConfig>(`/v1/instances/${instanceId}/config`);
}

export async function upsertInstanceConfig(
  instanceId: string,
  request: { configToml: string; updatedBy?: string }
) {
  return requestJson<InstanceConfig>(`/v1/instances/${instanceId}/config`, {
    method: "PUT",
    body: JSON.stringify(request),
  });
}

export async function deleteInstanceConfig(instanceId: string) {
  return requestJson<InstanceConfig>(`/v1/instances/${instanceId}/config`, {
    method: "DELETE",
  });
}

export async function getInstanceRoutingConfig(instanceId: string) {
  return requestJson<InstanceRoutingConfig>(`/v1/instances/${instanceId}/routing-config`);
}

export async function upsertInstanceRoutingConfig(
  instanceId: string,
  request: {
    queryClassificationEnabled: boolean;
    modelRoutes: Array<{ hint: string; provider: string; model: string }>;
    queryClassificationRules: Array<{
      hint: string;
      keywords: string[];
      literals: string[];
      priority?: number | null;
      minLength?: number | null;
      maxLength?: number | null;
    }>;
    updatedBy?: string;
  }
) {
  return requestJson<InstanceRoutingConfig>(`/v1/instances/${instanceId}/routing-config`, {
    method: "PUT",
    body: JSON.stringify(request),
  });
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

export async function listOpenApps() {
  return requestJson<ListResponse<OpenClientApp>>("/v1/open-apps");
}

export async function createOpenApp(request: OpenClientAppCreateRequest) {
  return requestJson<OpenClientAppCreateResponse>("/v1/open-apps", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function updateOpenApp(appId: string, request: OpenClientAppUpdateRequest) {
  return requestJson<OpenClientApp>(`/v1/open-apps/${appId}`, {
    method: "PUT",
    body: JSON.stringify(request),
  });
}

export async function deleteOpenApp(appId: string) {
  return requestVoid(`/v1/open-apps/${appId}`, {
    method: "DELETE",
  });
}
