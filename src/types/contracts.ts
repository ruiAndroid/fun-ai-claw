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

export type AgentTaskStatus = "PREPARED" | "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED";

export interface AgentTaskPrepareRequest {
  instanceId: string;
  agentId: string;
  message: string;
}

export interface AgentTaskPrepareResponse {
  taskId: string;
  confirmToken: string;
  summary: string;
  expiresAt: string;
}

export interface AgentTaskConfirmRequest {
  confirmToken: string;
}

export interface AgentTaskConfirmResponse {
  taskId: string;
  status: AgentTaskStatus | string;
  acceptedAt: string;
}

export interface AgentTaskResponse {
  taskId: string;
  agentId: string;
  status: AgentTaskStatus | string;
  responseBody?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
}
