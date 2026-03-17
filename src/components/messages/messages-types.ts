import type { ClawInstance } from "@/types/contracts";

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
