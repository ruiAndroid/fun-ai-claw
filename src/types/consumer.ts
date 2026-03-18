import type { DesiredState, InstanceStatus, RuntimeType } from "@/types/contracts";

export interface ConsumerAccount {
  accountId: string;
  externalUserId: string;
  externalUid?: string | null;
  sourceSystem: string;
  phoneE164?: string | null;
  phoneMasked?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  status: string;
  externalCreatedAt?: string | null;
  linkedAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
  lastVerifiedAt: string;
  activeSessionCount: number;
  activeInstanceCount: number;
}

export interface ConsumerBoundInstance {
  bindingId: string;
  instanceId: string;
  name: string;
  image: string;
  gatewayHostPort?: number | null;
  gatewayUrl?: string | null;
  remoteConnectCommand?: string | null;
  runtime: RuntimeType;
  status: InstanceStatus;
  desiredState: DesiredState;
  restartRequired: boolean;
  bindingStatus: string;
  sourceType: string;
  remark?: string | null;
  boundAt: string;
  bindingUpdatedAt: string;
  instanceCreatedAt: string;
  instanceUpdatedAt: string;
}

export interface ConsumerRobotTemplateSummary {
  templateKey: string;
  displayName: string;
  description?: string | null;
  summary?: string | null;
  imagePresetId: string;
  agentCount: number;
  skillCount: number;
  primaryAgentKey?: string | null;
  tags: string[];
  updatedAt: string;
}

export interface CreateConsumerRobotRequest {
  templateKey: string;
  name: string;
  autoStart?: boolean;
}

export interface ConsumerRobotAdoptionResponse {
  templateKey: string;
  templateDisplayName: string;
  primaryAgentKey?: string | null;
  instance: ConsumerBoundInstance;
}

export interface ConsumerChatSession {
  sessionId: string;
  instanceId: string;
  agentId: string;
  title?: string | null;
  status: string;
  openSessionId: string;
  externalSessionKey: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string | null;
  closedAt?: string | null;
  connected: boolean;
  generating: boolean;
  websocketPath?: string | null;
  websocketToken?: string | null;
  websocketTokenExpiresAt?: string | null;
}

export interface ConsumerChatSessionCreateRequest {
  instanceId: string;
  agentId: string;
  title?: string | null;
  remark?: string | null;
}

export interface ConsumerChatSessionMessage {
  id: string;
  sessionId: string;
  eventType: string;
  role: string;
  content: string;
  thinkingContent?: string | null;
  interaction?: Record<string, unknown> | null;
  providerMessageId?: string | null;
  providerSequence?: number | null;
  pending: boolean;
  emittedAt?: string | null;
  createdAt: string;
  rawPayload?: string | null;
}
