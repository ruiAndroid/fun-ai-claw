// Agent session protocol types and utility functions.
// Extracted from dashboard.tsx — no React dependency.

export type AgentChatRole = "user" | "assistant" | "system";
export type AgentInteractionActionKind = "send" | "prefill";
export type AgentInteractionAction = {
  id: string;
  label: string;
  kind: AgentInteractionActionKind;
  payload: string;
};
export type AgentInteraction = {
  version: string;
  type: string;
  stateId?: string;
  title?: string;
  actions: AgentInteractionAction[];
};
export type AgentChatTiming = {
  provider?: string;
  model?: string;
  llmRequestCount?: number;
  firstThinkingDurationMs?: number;
  firstVisibleDurationMs?: number;
  modelDurationMs?: number;
  agentDurationMs?: number;
  totalDurationMs?: number;
  firstThinkingAt?: string;
  firstVisibleAt?: string;
  completedAt?: string;
};
export type AgentChatMessage = {
  id: string;
  role: AgentChatRole;
  content: string;
  thinkingContent?: string;
  pending?: boolean;
  interaction?: AgentInteraction;
  interactionResolved?: boolean;
  interactionResolvedNote?: string;
  createdAt?: string;
  emittedAt?: string;
  timing?: AgentChatTiming;
};
export type AgentSessionStreamMessage = {
  version: string;
  messageId: string;
  instanceId: string;
  sessionId: string;
  sequence: number;
  role: AgentChatRole;
  content: string;
  thinkingContent?: string;
  pending: boolean;
  interaction?: AgentInteraction;
  emittedAt: string;
};
export type AgentSessionDeltaChannel = "content" | "thinking";
export type AgentSessionDeltaOperation = "append" | "clear";
export type AgentSessionDelta = {
  version: string;
  messageId: string;
  instanceId: string;
  sessionId: string;
  sequence: number;
  role: AgentChatRole;
  channel: AgentSessionDeltaChannel;
  operation: AgentSessionDeltaOperation;
  chunk?: string;
  emittedAt: string;
};
export type AgentSessionFrame = {
  version: string;
  eventType: "message" | "debug" | "delta";
  instanceId: string;
  sessionId: string;
  message?: AgentSessionStreamMessage;
  delta?: AgentSessionDelta;
  chunk?: string;
  emittedAt: string;
};
export type AgentSessionDebugEntry = {
  id: string;
  eventType: "message" | "debug" | "raw";
  role?: AgentChatRole;
  emittedAt?: string;
  content: string;
};
export type AgentSessionStarterDraft = {
  scriptType: "小说转剧本" | "一句话剧本";
  scriptContent: string;
  targetAudience: string;
  expectedEpisodeCount: string;
};

export type AgentSessionCoreFields = {
  scriptType: string;
  scriptContent: string;
  targetAudience: string;
  expectedEpisodeCount: string;
};

export type AgentSessionDisconnectNotice = {
  afterConnectionEstablished: boolean;
  hadConversation: boolean;
};

export type AgentTurnTracker = {
  userMessageId: string;
  userSentAt: string;
  startedAtMs: number;
  placeholderAssistantMessageId?: string;
  assistantMessageId?: string;
  assistantEmittedAt?: string;
  firstThinkingAt?: string;
  firstVisibleAt?: string;
  provider?: string;
  model?: string;
  llmRequestCount: number;
  firstThinkingDurationMs?: number;
  firstVisibleDurationMs?: number;
  modelDurationMs: number;
  agentDurationMs?: number;
  totalDurationMs?: number;
  completedAt?: string;
  committed?: boolean;
};

export type AgentComposerInteractionDraft = {
  sourceMessageId: string;
  interactionAction: string;
  stateId?: string;
};

export type ParsedAgentMessageContent = {
  displayContent: string;
  interaction?: AgentInteraction;
};

export type ParsedAgentInteractionPayload = {
  interactionAction?: string;
  stateId?: string;
  feedback?: string;
};

export const AGENT_INTERACTION_BLOCK_PATTERN = /<fun_claw_interaction>\s*([\s\S]*?)\s*<\/fun_claw_interaction>/gi;
export const AGENT_INTERACTION_STATE_LABELS: Record<string, string> = {
  step1_input_parse: "输入解析",
  step2_story_synopsis: "故事梗概",
  step3_character_profile: "角色小传",
  step4_episode_outline: "分集大纲",
  step5_full_script: "完整剧本",
};
export const ACTIVE_IMAGE_PRESET_IDS = ["zeroclaw-shell", "zeroclaw-python"] as const;

// ── Utility functions ────────────────────────────────────────────

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeImagePresetValue(value: string): string {
  let normalized = value.trim().toLowerCase();
  if (!normalized) {
    return "";
  }
  const digestIndex = normalized.indexOf("@");
  if (digestIndex >= 0) {
    normalized = normalized.slice(0, digestIndex);
  }
  const lastSlashIndex = normalized.lastIndexOf("/");
  const repositoryWithTag = lastSlashIndex >= 0 ? normalized.slice(lastSlashIndex + 1) : normalized;
  const tagIndex = repositoryWithTag.lastIndexOf(":");
  return tagIndex >= 0 ? repositoryWithTag.slice(0, tagIndex) : repositoryWithTag;
}

export function isImagePresetAvailable(preset: { id?: string; name?: string; image?: string }): boolean {
  return [preset.id, preset.image]
    .filter((value): value is string => typeof value === "string")
    .map(normalizeImagePresetValue)
    .some((value) => ACTIVE_IMAGE_PRESET_IDS.some((presetId) => presetId === value));
}

export function sanitizeAgentInteractionAction(value: unknown): AgentInteractionAction | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const id = typeof value.id === "string" ? value.id.trim() : "";
  const label = typeof value.label === "string" ? value.label.trim() : "";
  const kind = value.kind === "send" || value.kind === "prefill" ? value.kind : undefined;
  const payload = typeof value.payload === "string" ? value.payload : "";
  if (!id || !label || !kind || !payload.trim()) {
    return undefined;
  }
  return {
    id,
    label,
    kind,
    payload,
  };
}

export function sanitizeAgentInteraction(value: unknown): AgentInteraction | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const version = typeof value.version === "string" && value.version.trim() ? value.version.trim() : "1.0";
  const type = typeof value.type === "string" ? value.type.trim() : "";
  const stateId = typeof value.state_id === "string" && value.state_id.trim()
    ? value.state_id.trim()
    : typeof value.stateId === "string" && value.stateId.trim()
      ? value.stateId.trim()
      : undefined;
  const title = typeof value.title === "string" && value.title.trim() ? value.title.trim() : undefined;
  const rawActions = Array.isArray(value.actions) ? value.actions : [];
  const actions = rawActions
    .map((item) => sanitizeAgentInteractionAction(item))
    .filter((item): item is AgentInteractionAction => Boolean(item));
  if (!type || actions.length === 0) {
    return undefined;
  }
  return {
    version,
    type,
    stateId,
    title,
    actions,
  };
}

export function sanitizeAgentChatRole(value: unknown): AgentChatRole | undefined {
  if (value === "user" || value === "assistant" || value === "system") {
    return value;
  }
  return undefined;
}

export function escapeMultilineJsonStrings(input: string): string {
  let result = "";
  let inString = false;
  let escaping = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (escaping) {
      result += char;
      escaping = false;
      continue;
    }

    if (char === "\\") {
      result += char;
      escaping = true;
      continue;
    }

    if (char === "\"") {
      result += char;
      inString = !inString;
      continue;
    }

    if (inString && char === "\n") {
      result += "\\n";
      continue;
    }

    if (inString && char === "\r") {
      result += "\\r";
      continue;
    }

    result += char;
  }

  return result;
}

export function parseStructuredAgentInteractionBlock(jsonBlock: string): AgentInteraction | undefined {
  const candidates = [jsonBlock, escapeMultilineJsonStrings(jsonBlock)];
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      const sanitized = sanitizeAgentInteraction(parsed);
      if (sanitized) {
        return sanitized;
      }
    } catch {
      // Try next candidate.
    }
  }
  return undefined;
}

export function getAgentInteractionStateLabel(stateId?: string): string | undefined {
  if (!stateId) {
    return undefined;
  }
  return AGENT_INTERACTION_STATE_LABELS[stateId] ?? stateId;
}

export function parseAgentInteractionPayload(rawInput: string): ParsedAgentInteractionPayload | undefined {
  const normalizedInput = rawInput.replace(/\r\n/g, "\n").trim();
  if (!normalizedInput) {
    return undefined;
  }
  const flattenedInput = normalizedInput.replace(/\n+/g, " ");
  const interactionActionMatch = flattenedInput.match(/(?:^|\s)interaction_action=([^\s]+)/i);
  if (!interactionActionMatch) {
    return undefined;
  }
  const stateIdMatch = flattenedInput.match(/(?:^|\s)(?:stateId|state_id)=([^\s]+)/i);
  const feedbackMatch = flattenedInput.match(/(?:^|\s)(?:step_feedback|user_feedback|feedback)=(.*?)(?=\s+[A-Za-z_][A-Za-z0-9_]*=|$)/i);
  return {
    interactionAction: interactionActionMatch[1]?.trim(),
    stateId: stateIdMatch?.[1]?.trim(),
    feedback: feedbackMatch?.[1]?.trim(),
  };
}

export function parseAgentSessionCoreFields(rawInput: string): AgentSessionCoreFields | undefined {
  const normalizedInput = rawInput.replace(/\r\n/g, "\n").trim();
  if (!normalizedInput) {
    return undefined;
  }
  const flattenedInput = normalizedInput.replace(/\n+/g, " ");
  const scriptTypeMatch = flattenedInput.match(/(?:^|\s)script_type=(.*?)(?=\s+[A-Za-z_][A-Za-z0-9_]*=|$)/i);
  const scriptContentMatch = flattenedInput.match(/(?:^|\s)script_content=(.*?)(?=\s+[A-Za-z_][A-Za-z0-9_]*=|$)/i);
  const targetAudienceMatch = flattenedInput.match(/(?:^|\s)target_audience=(.*?)(?=\s+[A-Za-z_][A-Za-z0-9_]*=|$)/i);
  const expectedEpisodeCountMatch = flattenedInput.match(/(?:^|\s)expected_episode_count=(.*?)(?=\s+[A-Za-z_][A-Za-z0-9_]*=|$)/i);
  if (!scriptTypeMatch || !scriptContentMatch || !targetAudienceMatch || !expectedEpisodeCountMatch) {
    return undefined;
  }
  return {
    scriptType: scriptTypeMatch[1]?.trim(),
    scriptContent: scriptContentMatch[1]?.trim(),
    targetAudience: targetAudienceMatch[1]?.trim(),
    expectedEpisodeCount: expectedEpisodeCountMatch[1]?.trim(),
  };
}

export function isAgentSessionPlaceholderValue(value?: string): boolean {
  if (!value) {
    return true;
  }
  return /^<[^>]+>$/.test(value.trim());
}

export function formatAgentInteractionPayloadForDisplay(rawInput: string): string | undefined {
  const parsed = parseAgentInteractionPayload(rawInput);
  if (!parsed?.interactionAction) {
    return undefined;
  }

  const stateLabel = getAgentInteractionStateLabel(parsed.stateId) ?? "当前内容";
  if (parsed.interactionAction === "confirm") {
    return `已提交确认：${stateLabel}，继续下一步`;
  }
  if (parsed.interactionAction === "revise") {
    if (parsed.feedback) {
      return `已提交修改：${stateLabel}\n要求：${parsed.feedback}`;
    }
    return `已提交修改：${stateLabel}`;
  }
  if (parsed.interactionAction === "start") {
    return "已开始新的多轮交互";
  }
  return `已提交交互：${parsed.interactionAction}`;
}

export function getAgentInteractionResolvedNote(rawInput: string, uiText: { agentSessionInteractionConfirmed: string; agentSessionInteractionRevised: string; agentSessionInteractionSubmitted: string }): string | undefined {
  const parsed = parseAgentInteractionPayload(rawInput);
  if (!parsed?.interactionAction) {
    return undefined;
  }
  if (parsed.interactionAction === "confirm") {
    return uiText.agentSessionInteractionConfirmed;
  }
  if (parsed.interactionAction === "revise") {
    return uiText.agentSessionInteractionRevised;
  }
  return uiText.agentSessionInteractionSubmitted;
}

export function sanitizeAgentSessionMessage(value: unknown): AgentSessionStreamMessage | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const version = typeof value.version === "string" && value.version.trim() ? value.version.trim() : "1.0";
  const messageId = typeof value.messageId === "string" ? value.messageId.trim() : "";
  const instanceId = typeof value.instanceId === "string" ? value.instanceId.trim() : "";
  const sessionId = typeof value.sessionId === "string" ? value.sessionId.trim() : "";
  const sequence = typeof value.sequence === "number" && Number.isInteger(value.sequence) && value.sequence > 0
    ? value.sequence
    : undefined;
  const role = sanitizeAgentChatRole(value.role);
  const content = typeof value.content === "string" ? value.content : "";
  const thinkingContent = typeof value.thinkingContent === "string" ? value.thinkingContent : undefined;
  const pending = typeof value.pending === "boolean" ? value.pending : false;
  const interaction = sanitizeAgentInteraction(value.interaction);
  const emittedAt = typeof value.emittedAt === "string" ? value.emittedAt.trim() : "";
  if (!messageId || !instanceId || !sessionId || !sequence || !role || !emittedAt) {
    return undefined;
  }
  return {
    version,
    messageId,
    instanceId,
    sessionId,
    sequence,
    role,
    content,
    thinkingContent,
    pending,
    interaction,
    emittedAt,
  };
}

export function sanitizeAgentSessionDelta(value: unknown): AgentSessionDelta | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const version = typeof value.version === "string" && value.version.trim() ? value.version.trim() : "1.0";
  const messageId = typeof value.messageId === "string" ? value.messageId.trim() : "";
  const instanceId = typeof value.instanceId === "string" ? value.instanceId.trim() : "";
  const sessionId = typeof value.sessionId === "string" ? value.sessionId.trim() : "";
  const sequence = typeof value.sequence === "number" && Number.isInteger(value.sequence) && value.sequence > 0
    ? value.sequence
    : undefined;
  const role = sanitizeAgentChatRole(value.role);
  const channel = value.channel === "content" || value.channel === "thinking"
    ? value.channel
    : undefined;
  const operation = value.operation === "append" || value.operation === "clear"
    ? value.operation
    : undefined;
  const chunk = typeof value.chunk === "string" ? value.chunk : undefined;
  const emittedAt = typeof value.emittedAt === "string" ? value.emittedAt.trim() : "";
  if (!messageId || !instanceId || !sessionId || !sequence || !role || !channel || !operation || !emittedAt) {
    return undefined;
  }
  return {
    version,
    messageId,
    instanceId,
    sessionId,
    sequence,
    role,
    channel,
    operation,
    chunk,
    emittedAt,
  };
}

export function parseAgentSessionFrame(content: string): AgentSessionFrame | undefined {
  const normalizedContent = content.trim();
  if (!normalizedContent.startsWith("{")) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(normalizedContent) as unknown;
    if (!isRecord(parsed)) {
      return undefined;
    }
    const version = typeof parsed.version === "string" && parsed.version.trim() ? parsed.version.trim() : "1.0";
    const eventType = parsed.eventType === "message" || parsed.eventType === "debug" || parsed.eventType === "delta"
      ? parsed.eventType
      : undefined;
    const instanceId = typeof parsed.instanceId === "string" ? parsed.instanceId.trim() : "";
    const sessionId = typeof parsed.sessionId === "string" ? parsed.sessionId.trim() : "";
    const emittedAt = typeof parsed.emittedAt === "string" ? parsed.emittedAt.trim() : "";
    if (!eventType || !instanceId || !sessionId || !emittedAt) {
      return undefined;
    }

    const frame: AgentSessionFrame = {
      version,
      eventType,
      instanceId,
      sessionId,
      emittedAt,
    };

    if (eventType === "message") {
      const message = sanitizeAgentSessionMessage(parsed.message);
      if (!message) {
        return undefined;
      }
      frame.message = message;
      return frame;
    }

    if (eventType === "delta") {
      const delta = sanitizeAgentSessionDelta(parsed.delta);
      if (!delta) {
        return undefined;
      }
      frame.delta = delta;
      return frame;
    }

    const chunk = typeof parsed.chunk === "string" ? parsed.chunk : undefined;
    if (typeof chunk !== "string") {
      return undefined;
    }
    frame.chunk = chunk;
    return frame;
  } catch {
    return undefined;
  }
}

export function extractStructuredAgentInteraction(content: string): ParsedAgentMessageContent {
  const normalizedContent = content.replace(/\r\n/g, "\n");
  let extractedInteraction: AgentInteraction | undefined;
  const displayContent = normalizedContent.replace(AGENT_INTERACTION_BLOCK_PATTERN, (_, jsonBlock: string) => {
    const sanitized = parseStructuredAgentInteractionBlock(jsonBlock);
    if (sanitized) {
      extractedInteraction = sanitized;
      return "";
    }
    return _;
  }).trim();
  return {
    displayContent,
    interaction: extractedInteraction,
  };
}

export function parseAgentMessageContent(content: string): ParsedAgentMessageContent {
  return extractStructuredAgentInteraction(content);
}

export function normalizeAgentChatMessage(role: AgentChatRole, content: string, pending = false): Omit<AgentChatMessage, "id"> | undefined {
  const normalizedContent = content.trim();
  if (!normalizedContent) {
    return undefined;
  }
  if (role !== "assistant" || pending) {
    return {
      role,
      content: normalizedContent,
      pending,
    };
  }
  const parsedContent = parseAgentMessageContent(normalizedContent);
  const displayContent = parsedContent.displayContent.trim() || parsedContent.interaction?.title || normalizedContent;
  return {
    role,
    content: displayContent,
    pending: false,
    interaction: parsedContent.interaction,
  };
}

export function normalizeStructuredAgentChatMessage(message: AgentSessionStreamMessage): AgentChatMessage | undefined {
  const normalizedContent = message.content.trim();
  const normalizedThinkingContent = message.thinkingContent?.trim();
  if (message.role !== "assistant" || message.pending) {
    if (!normalizedContent && !normalizedThinkingContent) {
      return undefined;
    }
    return {
      id: message.messageId,
      role: message.role,
      content: normalizedContent,
      thinkingContent: normalizedThinkingContent,
      pending: message.pending,
      emittedAt: message.emittedAt,
    };
  }

  const parsedContent = parseAgentMessageContent(message.content);
  const displayContent = parsedContent.displayContent.trim() || message.interaction?.title || normalizedContent;
  if (!displayContent && !normalizedThinkingContent) {
    return undefined;
  }
  return {
    id: message.messageId,
    role: "assistant",
    content: displayContent,
    thinkingContent: normalizedThinkingContent,
    pending: false,
    interaction: message.interaction ?? parsedContent.interaction,
    emittedAt: message.emittedAt,
  };
}

export function formatAgentSessionDebugTimestamp(emittedAt?: string): string | undefined {
  if (!emittedAt) {
    return undefined;
  }
  const parsed = new Date(emittedAt);
  if (Number.isNaN(parsed.getTime())) {
    return emittedAt;
  }
  return parsed.toLocaleTimeString("zh-CN", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatAgentTimingDuration(ms?: number): string | undefined {
  if (typeof ms !== "number" || !Number.isFinite(ms) || ms < 0) {
    return undefined;
  }
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  if (ms < 60000) {
    const seconds = ms / 1000;
    return `${seconds >= 10 ? seconds.toFixed(0) : seconds.toFixed(1)}s`;
  }
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

export function getAgentTimingNow() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

export function formatAgentTimingTooltip(timing?: AgentChatTiming): string | undefined {
  if (!timing) {
    return undefined;
  }
  const details = [
    timing.model ? `模型: ${timing.model}` : "",
    timing.provider ? `提供方: ${timing.provider}` : "",
    typeof timing.firstThinkingDurationMs === "number" ? `思考首字: ${formatAgentTimingDuration(timing.firstThinkingDurationMs)}` : "",
    typeof timing.firstVisibleDurationMs === "number" ? `首个可见字: ${formatAgentTimingDuration(timing.firstVisibleDurationMs)}` : "",
    timing.llmRequestCount && timing.llmRequestCount > 1 ? `模型调用: ${timing.llmRequestCount}次` : "",
  ].filter((item) => item.length > 0);
  return details.length > 0 ? details.join(" | ") : undefined;
}
