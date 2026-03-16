export type InstanceStatus = "CREATING" | "RUNNING" | "STOPPED" | "ERROR";
export type DesiredState = "RUNNING" | "STOPPED";
export type RuntimeType = "ZEROCLAW";
export type InstanceActionType = "START" | "STOP" | "RESTART" | "RESTART_ZEROCLAW" | "ROLLBACK";

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
  allowedSkills?: string[] | null;
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
  toolPresetKey?: string | null;
  allowedToolsExtra?: string[] | null;
  deniedTools?: string[] | null;
  allowedTools?: string[] | null;
  allowedSkills?: string[] | null;
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
  toolPresetKey?: string | null;
  allowedToolsExtra: string[];
  deniedTools: string[];
  allowedTools: string[];
  allowedSkills: string[];
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
  toolPresetKey?: string | null;
  allowedToolsExtra?: string[] | null;
  deniedTools?: string[] | null;
  allowedTools?: string[] | null;
  allowedSkills?: string[] | null;
  systemPrompt?: string | null;
  updatedBy?: string | null;
}

export interface AgentToolDefinition {
  value: string;
  description: string;
}

export interface AgentToolPreset {
  key: string;
  displayName: string;
  description?: string | null;
  tools: string[];
}

export interface AgentToolCatalog {
  tools: AgentToolDefinition[];
  presets: AgentToolPreset[];
}

export interface InstanceAgentBinding {
  instanceId: string;
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
  systemPrompt?: string | null;
  allowedTools: string[];
  allowedSkills: string[];
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SkillDescriptor {
  id: string;
  path: string;
  prompt: string;
}

export interface SkillBaselineSummary {
  skillKey: string;
  displayName: string;
  description?: string | null;
  sourceType: string;
  sourceRef?: string | null;
  enabled: boolean;
  lineCount: number;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InstanceSkillBinding {
  instanceId: string;
  skillKey: string;
  displayName: string;
  description?: string | null;
  baselineEnabled: boolean;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SkillBaseline {
  skillKey: string;
  displayName: string;
  description?: string | null;
  sourceType: string;
  sourceRef?: string | null;
  enabled: boolean;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SkillBaselineUpsertRequest {
  skillKey?: string;
  displayName?: string;
  description?: string | null;
  sourceType?: string | null;
  sourceRef?: string | null;
  enabled?: boolean | null;
  updatedBy?: string | null;
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

export interface ModelRouteConfigItem {
  hint: string;
  provider: string;
  model: string;
}

export interface QueryClassificationRuleConfigItem {
  hint: string;
  keywords: string[];
  patterns: string[];
  priority?: number | null;
  minLength?: number | null;
  maxLength?: number | null;
}

export interface InstanceRoutingConfig {
  instanceId: string;
  runtimeConfigPath: string;
  source: "INSTANCE_OVERRIDE" | "DEFAULT_TEMPLATE" | string;
  overwriteOnStart: boolean;
  overrideExists: boolean;
  queryClassificationEnabled: boolean;
  modelRoutes: ModelRouteConfigItem[];
  queryClassificationRules: QueryClassificationRuleConfigItem[];
  overrideUpdatedAt?: string | null;
  overrideUpdatedBy?: string | null;
}

export interface InstanceDefaultModelConfig {
  instanceId: string;
  runtimeConfigPath: string;
  source: "INSTANCE_OVERRIDE" | "DEFAULT_TEMPLATE" | string;
  overwriteOnStart: boolean;
  overrideExists: boolean;
  apiKey: string;
  defaultProvider: string;
  defaultModel: string;
  defaultTemperature: number;
  overrideUpdatedAt?: string | null;
  overrideUpdatedBy?: string | null;
}

export interface InstanceChannelsConfig {
  instanceId: string;
  runtimeConfigPath: string;
  source: "INSTANCE_OVERRIDE" | "DEFAULT_TEMPLATE" | string;
  overwriteOnStart: boolean;
  overrideExists: boolean;
  cliEnabled: boolean;
  messageTimeoutSecs: number;
  dingtalkEnabled: boolean;
  dingtalkClientId: string;
  dingtalkClientSecret: string;
  dingtalkAllowedUsers: string[];
  qqEnabled: boolean;
  qqAppId: string;
  qqAppSecret: string;
  qqAllowedUsers: string[];
  overrideUpdatedAt?: string | null;
  overrideUpdatedBy?: string | null;
}

export interface InstanceTemplateAgentBinding {
  agentKey: string;
  provider?: string | null;
  model?: string | null;
  temperature?: number | null;
  agentic?: boolean | null;
  systemPrompt?: string | null;
  allowedTools: string[];
  allowedSkills: string[];
}

export interface InstanceTemplateChannelsConfig {
  cliEnabled: boolean;
  messageTimeoutSecs: number;
  dingtalkEnabled: boolean;
  dingtalkClientId?: string | null;
  dingtalkClientSecret?: string | null;
  dingtalkAllowedUsers: string[];
  qqEnabled: boolean;
  qqAppId?: string | null;
  qqAppSecret?: string | null;
  qqAllowedUsers: string[];
}

export interface InstanceTemplateDefaultModelConfig {
  apiKey?: string | null;
  defaultProvider?: string | null;
  defaultModel?: string | null;
  defaultTemperature?: number | null;
}

export interface InstanceTemplateRoutingConfig {
  queryClassificationEnabled: boolean;
  modelRoutes: ModelRouteConfigItem[];
  queryClassificationRules: QueryClassificationRuleConfigItem[];
}

export interface InstanceTemplateMainAgentGuidance {
  prompt?: string | null;
  enabled?: boolean | null;
}

export interface InstanceTemplate {
  templateKey: string;
  displayName: string;
  description?: string | null;
  summary?: string | null;
  enabled: boolean;
  imagePresetId: string;
  desiredState: DesiredState;
  mainAgent: InstanceTemplateAgentBinding;
  agentKeys: string[];
  skillKeys: string[];
  lockedScopes: string[];
  tags: string[];
  runtimeConfigToml?: string | null;
  channelsConfig?: InstanceTemplateChannelsConfig | null;
  defaultModelConfig?: InstanceTemplateDefaultModelConfig | null;
  routingConfig?: InstanceTemplateRoutingConfig | null;
  mainAgentGuidance?: InstanceTemplateMainAgentGuidance | null;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InstanceTemplateUpsertRequest {
  templateKey?: string | null;
  displayName?: string | null;
  description?: string | null;
  summary?: string | null;
  enabled?: boolean | null;
  imagePresetId?: string | null;
  desiredState?: DesiredState | null;
  mainAgent?: {
    agentKey: string;
    provider?: string | null;
    model?: string | null;
    temperature?: number | null;
    agentic?: boolean | null;
    systemPrompt?: string | null;
    allowedTools?: string[] | null;
    allowedSkills?: string[] | null;
  } | null;
  agentKeys?: string[] | null;
  skillKeys?: string[] | null;
  lockedScopes?: string[] | null;
  tags?: string[] | null;
  runtimeConfigToml?: string | null;
  channelsConfig?: InstanceTemplateChannelsConfig | null;
  defaultModelConfig?: InstanceTemplateDefaultModelConfig | null;
  routingConfig?: InstanceTemplateRoutingConfig | null;
  mainAgentGuidance?: InstanceTemplateMainAgentGuidance | null;
  updatedBy?: string | null;
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
