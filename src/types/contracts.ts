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

export interface AcceptedActionResponse {
  taskId: string;
  acceptedAt: string;
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
