import {
  AgentBaseline,
  AgentBaselineSummary,
  AgentBaselineUpsertRequest,
  AgentDescriptor,
  AgentSystemPrompt,
  AgentToolCatalog,
  ClawInstance,
  CreateInstanceRequest,
  ImagePreset,
  InstanceAgentBinding,
  InstanceChannelsConfig,
  InstanceConfig,
  InstanceDefaultModelConfig,
  InstanceMainAgentGuidance,
  InstanceRoutingConfig,
  InstanceSkillBinding,
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

async function requestFormJson<T>(path: string, formData: FormData, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    method: init?.method ?? "POST",
    body: formData,
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status}: ${body || response.statusText}`);
  }
  return (await response.json()) as T;
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

export async function getAgentToolCatalog() {
  return requestJson<AgentToolCatalog>("/v1/agent-tools/catalog");
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

export async function uploadSkillBaselinePackage(request: {
  skillKey: string;
  displayName?: string;
  description?: string;
  enabled?: boolean;
  updatedBy?: string;
  file: File;
}) {
  const formData = new FormData();
  formData.append("skillKey", request.skillKey);
  if (request.displayName) {
    formData.append("displayName", request.displayName);
  }
  if (request.description) {
    formData.append("description", request.description);
  }
  if (request.enabled !== undefined) {
    formData.append("enabled", String(request.enabled));
  }
  if (request.updatedBy) {
    formData.append("updatedBy", request.updatedBy);
  }
  formData.append("file", request.file);
  return requestFormJson<SkillBaseline>("/v1/skill-baselines/upload", formData);
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

export async function listInstanceAgentBindings(instanceId: string) {
  return requestJson<ListResponse<InstanceAgentBinding>>(`/v1/instances/${instanceId}/agent-bindings`);
}

export async function upsertInstanceAgentBinding(
  instanceId: string,
  agentKey: string,
  request: {
    provider?: string | null;
    model?: string | null;
    temperature?: number | null;
    agentic?: boolean | null;
    systemPrompt?: string | null;
    allowedTools?: string[] | null;
    updatedBy?: string | null;
  }
) {
  return requestJson<InstanceAgentBinding>(`/v1/instances/${instanceId}/agent-bindings/${encodeURIComponent(agentKey)}`, {
    method: "PUT",
    body: JSON.stringify(request),
  });
}

export async function uninstallInstanceAgentBinding(instanceId: string, agentKey: string) {
  return requestVoid(`/v1/instances/${instanceId}/agent-bindings/${encodeURIComponent(agentKey)}`, {
    method: "DELETE",
  });
}

export async function listInstanceSkills(instanceId: string) {
  return requestJson<ListResponse<SkillDescriptor>>(`/v1/instances/${instanceId}/skills`);
}

export async function listInstanceSkillBindings(instanceId: string) {
  return requestJson<ListResponse<InstanceSkillBinding>>(`/v1/instances/${instanceId}/skill-bindings`);
}

export async function installInstanceSkill(instanceId: string, skillKey: string, updatedBy = "console") {
  return requestJson<InstanceSkillBinding>(`/v1/instances/${instanceId}/skill-bindings/${encodeURIComponent(skillKey)}`, {
    method: "PUT",
    body: JSON.stringify({ updatedBy }),
  });
}

export async function uninstallInstanceSkill(instanceId: string, skillKey: string) {
  return requestVoid(`/v1/instances/${instanceId}/skill-bindings/${encodeURIComponent(skillKey)}`, {
    method: "DELETE",
  });
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

export async function getInstanceDefaultModelConfig(instanceId: string) {
  return requestJson<InstanceDefaultModelConfig>(`/v1/instances/${instanceId}/default-model-config`);
}

export async function getInstanceChannelsConfig(instanceId: string) {
  return requestJson<InstanceChannelsConfig>(`/v1/instances/${instanceId}/channels-config`);
}

export async function upsertInstanceChannelsConfig(
  instanceId: string,
  request: {
    cliEnabled: boolean;
    messageTimeoutSecs: number;
    dingtalkEnabled: boolean;
    dingtalkClientId?: string;
    dingtalkClientSecret?: string;
    dingtalkAllowedUsers?: string[];
    qqEnabled: boolean;
    qqAppId?: string;
    qqAppSecret?: string;
    qqAllowedUsers?: string[];
    updatedBy?: string;
  }
) {
  return requestJson<InstanceChannelsConfig>(`/v1/instances/${instanceId}/channels-config`, {
    method: "PUT",
    body: JSON.stringify(request),
  });
}

export async function upsertInstanceDefaultModelConfig(
  instanceId: string,
  request: {
    apiKey: string;
    defaultProvider: string;
    defaultModel: string;
    defaultTemperature: number;
    updatedBy?: string;
  }
) {
  return requestJson<InstanceDefaultModelConfig>(`/v1/instances/${instanceId}/default-model-config`, {
    method: "PUT",
    body: JSON.stringify(request),
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
      patterns: string[];
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

/* ── Gateway proxy (zeroclaw instance gateway via UiControllerProxy) ── */

const GATEWAY_BASE = appConfig.uiControllerBaseUrl;

async function gatewayRequestJson<T>(instanceId: string, path: string, init?: RequestInit): Promise<T> {
  const url = `${GATEWAY_BASE}/${instanceId}${path}`;
  const response = await fetch(url, {
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

async function gatewayRequestVoid(instanceId: string, path: string, init?: RequestInit): Promise<void> {
  const url = `${GATEWAY_BASE}/${instanceId}${path}`;
  const response = await fetch(url, {
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

/* ── Cron Jobs (via gateway) ── */

export interface CronJob {
  id: string;
  name: string | null;
  command: string;
  enabled: boolean;
  next_run: string | null;
  last_run: string | null;
  last_status: string | null;
}

export interface CronJobCreateRequest {
  name?: string;
  schedule: string;
  command: string;
}

export async function listInstanceCronJobs(instanceId: string) {
  return gatewayRequestJson<{ jobs: CronJob[] }>(instanceId, "/api/cron");
}

export async function createInstanceCronJob(instanceId: string, request: CronJobCreateRequest) {
  return gatewayRequestJson<{ status: string; job: CronJob }>(instanceId, "/api/cron", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function deleteInstanceCronJob(instanceId: string, jobId: string) {
  return gatewayRequestVoid(instanceId, `/api/cron/${encodeURIComponent(jobId)}`, {
    method: "DELETE",
  });
}

/* ── Open Apps ── */

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
