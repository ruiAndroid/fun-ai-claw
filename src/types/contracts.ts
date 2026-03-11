export type InstanceStatus = "CREATING" | "RUNNING" | "STOPPED" | "ERROR";
export type DesiredState = "RUNNING" | "STOPPED";
export type RuntimeType = "ZEROCLAW";
export type InstanceActionType = "START" | "STOP" | "RESTART" | "ROLLBACK";

export interface ClawInstance {
  id: string;
  name: string;
  hostId: string;
  image: string;
  gatewayHostPort?: number | null;
  gatewayUrl?: string | null;
  remoteConnectCommand?: string | null;
  runtime: RuntimeType;
  status: InstanceStatus;
  desiredState: DesiredState;
  createdAt: string;
  updatedAt: string;
}

export interface PairingCodeResponse {
  instanceId: string;
  pairingCode?: string | null;
  pairingLink?: string | null;
  sourceLine?: string | null;
  note?: string | null;
  fetchedAt: string;
}

export interface ListResponse<T> {
  items: T[];
}

export interface AgentDescriptor {
  id: string;
  provider?: string | null;
  model?: string | null;
  agentic?: boolean | null;
  allowedTools?: string[] | null;
  systemPrompt?: string | null;
  configPath?: string | null;
}

export interface AgentSystemPrompt {
  instanceId: string;
  agentId: string;
  systemPrompt?: string | null;
  configPath?: string | null;
}

export interface AgentBaselineSummary {
  agentKey: string;
  displayName: string;
  runtime: string;
  sourceType: string;
  sourceRef?: string | null;
  enabled: boolean;
  provider?: string | null;
  model?: string | null;
  temperature?: number | null;
  agentic?: boolean | null;
  entrySkill?: string | null;
  allowedToolCount: number;
  skillCount: number;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentBaseline {
  agentKey: string;
  displayName: string;
  description?: string | null;
  runtime: string;
  sourceType: string;
  sourceRef?: string | null;
  enabled: boolean;
  provider?: string | null;
  model?: string | null;
  temperature?: number | null;
  agentic?: boolean | null;
  entrySkill?: string | null;
  allowedTools: string[];
  skillIds: string[];
  systemPrompt?: string | null;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentBaselineUpsertRequest {
  agentKey?: string;
  displayName?: string;
  description?: string | null;
  runtime?: string | null;
  sourceType?: string | null;
  sourceRef?: string | null;
  enabled?: boolean | null;
  provider?: string | null;
  model?: string | null;
  temperature?: number | null;
  agentic?: boolean | null;
  entrySkill?: string | null;
  allowedTools?: string[];
  skillIds?: string[];
  systemPrompt?: string | null;
  updatedBy?: string | null;
}

export interface SkillDescriptor {
  id: string;
  path: string;
  prompt: string;
}

export interface ImagePreset {
  id: string;
  name: string;
  image: string;
  runtime: RuntimeType;
  description?: string;
  recommended: boolean;
}

export interface CreateInstanceRequest {
  name: string;
  hostId: string;
  image: string;
  desiredState: DesiredState;
}

export interface InstanceMainAgentGuidance {
  instanceId: string;
  workspacePath: string;
  source: "INSTANCE_OVERRIDE" | "GLOBAL_FILE" | "GLOBAL_INLINE" | "NONE" | string;
  effectivePrompt?: string | null;
  overwriteOnStart: boolean;
  overrideExists: boolean;
  overrideEnabled?: boolean | null;
  overridePrompt?: string | null;
  globalDefaultPath?: string | null;
  overrideUpdatedAt?: string | null;
  overrideUpdatedBy?: string | null;
}

export interface InstanceConfig {
  instanceId: string;
  runtimeConfigPath: string;
  source: "INSTANCE_OVERRIDE" | "DEFAULT_TEMPLATE" | string;
  configToml: string;
  overwriteOnStart: boolean;
  overrideExists: boolean;
  defaultTemplatePath?: string | null;
  overrideUpdatedAt?: string | null;
  overrideUpdatedBy?: string | null;
}

export interface OpenClientApp {
  appId: string;
  name: string;
  enabled: boolean;
  appSecret: string;
  defaultInstanceId?: string | null;
  defaultAgentId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OpenClientAppCreateRequest {
  name: string;
  defaultInstanceId?: string | null;
  defaultAgentId?: string | null;
}

export interface OpenClientAppUpdateRequest {
  name?: string | null;
  defaultInstanceId?: string | null;
  defaultAgentId?: string | null;
  enabled?: boolean | null;
}

export interface OpenClientAppCreateResponse extends OpenClientApp {
  plainSecret: string;
}
