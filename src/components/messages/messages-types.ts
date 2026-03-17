import type { ClawInstance } from "@/types/contracts";
import type { AgentChatMessage } from "@/lib/agent-session-protocol";

export type MessageRobotTarget = {
  id: string;
  instanceId: string;
  instanceName: string;
  instanceStatus: ClawInstance["status"];
  agentId: string;
  displayName: string;
  description?: string | null;
  provider?: string | null;
  model?: string | null;
  updatedAt: string;
  isAvailable: boolean;
};

export type MessageInteractionDraft = {
  sourceMessageId: string;
  interactionAction: string;
  stateId?: string;
};

export type MessageSessionArchive = {
  sessionId: string;
  robotId: string;
  messages: AgentChatMessage[];
  updatedAt: string;
};
