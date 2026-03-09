"use client";

import {
  createInstance,
  deleteInstanceMainAgentGuidance,
  deleteInstance,
  getInstanceMainAgentGuidance,
  getInstancePairingCode,
  listImages,
  listInstanceAgents,
  listInstanceSkills,
  listInstances,
  submitInstanceAction,
  upsertInstanceMainAgentGuidance,
} from "@/lib/control-api";
import { Badge } from "@/components/ui/badge";
import { Card as ShadCard, CardContent as ShadCardContent, CardHeader as ShadCardHeader, CardTitle as ShadCardTitle } from "@/components/ui/card";
import { appConfig } from "@/config/app-config";
import { AgentDescriptor, ClawInstance, CreateInstanceRequest, ImagePreset, InstanceActionType, InstanceMainAgentGuidance, PairingCodeResponse, SkillDescriptor } from "@/types/contracts";
import { ArrowLeft, Bot, ChevronLeft, ChevronRight, Server, Wrench } from "lucide-react";
import { Alert, Button, Card, Descriptions, Form, Input, Layout, Modal, Segmented, Select, Space, Spin, Switch, Tabs, Tag, Typography, message } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
type CreateInstanceFormValues = Omit<CreateInstanceRequest, "hostId">;
type ConsoleView = "instances" | "agents" | "skills" | "instance-detail";
type InstanceDetailTabKey = "claw" | "agents" | "skills";
type AgentSessionMode = "auto" | "direct";
type AgentChatRole = "user" | "assistant" | "system";
type AgentInteractionActionKind = "send" | "prefill";
type AgentInteractionAction = {
  id: string;
  label: string;
  kind: AgentInteractionActionKind;
  payload: string;
};
type AgentInteraction = {
  version: string;
  type: string;
  stateId?: string;
  title?: string;
  actions: AgentInteractionAction[];
};
type AgentChatTiming = {
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
type AgentChatMessage = {
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
type AgentSessionStreamMessage = {
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
type AgentSessionFrame = {
  version: string;
  eventType: "message" | "debug";
  instanceId: string;
  sessionId: string;
  message?: AgentSessionStreamMessage;
  chunk?: string;
  emittedAt: string;
};
type AgentSessionDebugEntry = {
  id: string;
  eventType: "message" | "debug" | "raw";
  role?: AgentChatRole;
  emittedAt?: string;
  content: string;
};
type AgentSessionStarterDraft = {
  scriptType: "小说转剧本" | "一句话剧本";
  scriptContent: string;
  targetAudience: string;
  expectedEpisodeCount: string;
};

type AgentSessionCoreFields = {
  scriptType: string;
  scriptContent: string;
  targetAudience: string;
  expectedEpisodeCount: string;
};

type AgentTurnTracker = {
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

type AgentComposerInteractionDraft = {
  sourceMessageId: string;
  interactionAction: string;
  stateId?: string;
};

type ParsedAgentMessageContent = {
  displayContent: string;
  interaction?: AgentInteraction;
};

const AGENT_INTERACTION_BLOCK_PATTERN = /<fun_claw_interaction>\s*([\s\S]*?)\s*<\/fun_claw_interaction>/gi;
const AGENT_INTERACTION_STATE_LABELS: Record<string, string> = {
  step1_input_parse: "输入解析",
  step2_story_synopsis: "故事梗概",
  step3_character_profile: "角色小传",
  step4_episode_outline: "分集大纲",
  step5_full_script: "完整剧本",
};

type ParsedAgentInteractionPayload = {
  interactionAction?: string;
  stateId?: string;
  feedback?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizeAgentInteractionAction(value: unknown): AgentInteractionAction | undefined {
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

function sanitizeAgentInteraction(value: unknown): AgentInteraction | undefined {
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

function sanitizeAgentChatRole(value: unknown): AgentChatRole | undefined {
  if (value === "user" || value === "assistant" || value === "system") {
    return value;
  }
  return undefined;
}

function escapeMultilineJsonStrings(input: string): string {
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

function parseStructuredAgentInteractionBlock(jsonBlock: string): AgentInteraction | undefined {
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

function getAgentInteractionStateLabel(stateId?: string): string | undefined {
  if (!stateId) {
    return undefined;
  }
  return AGENT_INTERACTION_STATE_LABELS[stateId] ?? stateId;
}

function parseAgentInteractionPayload(rawInput: string): ParsedAgentInteractionPayload | undefined {
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

function parseAgentSessionCoreFields(rawInput: string): AgentSessionCoreFields | undefined {
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

function isAgentSessionPlaceholderValue(value?: string): boolean {
  if (!value) {
    return true;
  }
  return /^<[^>]+>$/.test(value.trim());
}

function formatAgentInteractionPayloadForDisplay(rawInput: string): string | undefined {
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

function getAgentInteractionResolvedNote(rawInput: string): string | undefined {
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

function sanitizeAgentSessionMessage(value: unknown): AgentSessionStreamMessage | undefined {
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

function parseAgentSessionFrame(content: string): AgentSessionFrame | undefined {
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
    const eventType = parsed.eventType === "message" || parsed.eventType === "debug"
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

function extractStructuredAgentInteraction(content: string): ParsedAgentMessageContent {
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

function parseAgentMessageContent(content: string): ParsedAgentMessageContent {
  return extractStructuredAgentInteraction(content);
}

function normalizeAgentChatMessage(role: AgentChatRole, content: string, pending = false): Omit<AgentChatMessage, "id"> | undefined {
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

function normalizeStructuredAgentChatMessage(message: AgentSessionStreamMessage): AgentChatMessage | undefined {
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

function formatAgentSessionDebugTimestamp(emittedAt?: string): string | undefined {
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

function formatAgentTimingDuration(ms?: number): string | undefined {
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

function getAgentTimingNow() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function formatAgentTimingTooltip(timing?: AgentChatTiming): string | undefined {
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

const uiText = {
  loadFailed: "\u52a0\u8f7dclaw\u5b9e\u4f8b\u5931\u8d25",
  loadImagesFailed: "\u52a0\u8f7d\u955c\u50cf\u5217\u8868\u5931\u8d25",
  createInstanceFailed: "\u521b\u5efa\u5b9e\u4f8b\u5931\u8d25",
  actionSubmittedPrefix: "\u52a8\u4f5c\u5df2\u63d0\u4ea4\uff1a",
  instanceCreatedPrefix: "\u5b9e\u4f8b\u521b\u5efa\u6210\u529f\uff1a",
  actionFailed: "\u63d0\u4ea4\u52a8\u4f5c\u5931\u8d25",
  pageTitle: "fun-ai-claw claw\u5b9e\u4f8b\u7ba1\u7406\u53f0",
  menuCollapse: "\u6536\u8d77\u83dc\u5355",
  menuExpand: "\u5c55\u5f00\u83dc\u5355",
  menuInstances: "\u5b9e\u4f8b\u5217\u8868",
  menuAgents: "Agents",
  menuSkills: "Skills",
  backToInstances: "\u8fd4\u56de\u5b9e\u4f8b\u5217\u8868",
  listTitle: "claw\u5b9e\u4f8b\u5217\u8868",
  listSubtitle: "\u70b9\u51fb\u4efb\u610f claw \u5b9e\u4f8b\u8fdb\u5165\u8be6\u60c5",
  instanceDetailTitle: "\u5b9e\u4f8b\u8be6\u60c5",
  totalInstances: "\u5b9e\u4f8b\u603b\u6570",
  runningInstances: "\u8fd0\u884c\u4e2d",
  stoppedInstances: "\u5df2\u505c\u6b62",
  errorInstances: "\u5f02\u5e38\u5b9e\u4f8b",
  loadingInstances: "\u5b9e\u4f8b\u52a0\u8f7d\u4e2d...",
  refresh: "\u5237\u65b0",
  create: "\u65b0\u589e\u5b9e\u4f8b",
  image: "\u955c\u50cf",
  gatewayHostPort: "\u7f51\u5173\u7aef\u53e3",
  gatewayUrl: "\u8bbf\u95ee\u5730\u5740",
  gatewayUrlUnavailable: "\u672a\u5206\u914d",
  instanceName: "\u5b9e\u4f8b\u540d",
  status: "\u72b6\u6001",
  desiredState: "\u671f\u671b\u72b6\u6001",
  updatedAt: "\u66f4\u65b0\u65f6\u95f4",
  detailTitlePrefix: "\u5b9e\u4f8b\u8be6\u60c5\uff1a",
  selectInstance: "\u8bf7\u9009\u62e9\u5b9e\u4f8b",
  instanceId: "\u5b9e\u4f8bID",
  hostId: "\u5bbf\u4e3b\u673aID",
  currentStatus: "\u5f53\u524d\u72b6\u6001",
  createdAt: "\u521b\u5efa\u65f6\u95f4",
  start: "\u542f\u52a8",
  stop: "\u505c\u6b62",
  restartInstance: "\u91cd\u542f\u5b9e\u4f8b",
  rollback: "\u56de\u6eda",
  delete: "\u5220\u9664",
  actionProgressTitle: "\u5b9e\u4f8b\u52a8\u4f5c\u6267\u884c\u4e2d",
  actionProgressHint: "\u8bf7\u4fdd\u6301\u5f53\u524d\u7a97\u53e3\u5728\u524d\u53f0\uff0c\u7cfb\u7edf\u6b63\u5728\u5904\u7406\u6307\u4ee4\u3002",
  actionProgressCurrent: "\u5f53\u524d\u52a8\u4f5c",
  actionProgressWaiting: "\u52a8\u4f5c\u5b8c\u6210\u540e\u5c06\u81ea\u52a8\u5173\u95ed\u6b64\u7a97\u53e3\u3002",
  remoteConnect: "\u8fdc\u7a0b\u8fde\u63a5",
  remoteConnectTitle: "\u8fdc\u7a0b\u547d\u4ee4\u884c\u8fde\u63a5",
  remoteConnectHint: "\u590d\u5236\u4e0b\u65b9\u547d\u4ee4\u540e\uff0c\u5728\u4f60\u7684\u7ec8\u7aef\u6267\u884c\u5373\u53ef\u8fdb\u5165\u5b9e\u4f8b\u3002",
  remoteConnectUnavailable: "\u672a\u914d\u7f6e\u8fdc\u7a0b\u8fde\u63a5\u547d\u4ee4\u6a21\u677f",
  remoteConnectCommand: "\u8fde\u63a5\u547d\u4ee4",
  webTerminal: "Web\u7ec8\u7aef",
  connectTerminal: "\u8fde\u63a5\u7ec8\u7aef",
  disconnectTerminal: "\u65ad\u5f00\u7ec8\u7aef",
  openVisualUi: "UI\u53ef\u89c6\u5316\u64cd\u4f5c",
  openVisualUiUnavailable: "\u5f53\u524d\u5b9e\u4f8b\u6682\u65e0\u53ef\u8bbf\u95ee\u5730\u5740",
  pairingCode: "\u56fa\u5b9a\u914d\u5bf9\u7801",
  pairingLink: "\u914d\u5bf9\u94fe\u63a5",
  fetchPairingCode: "\u914d\u5bf9\u4fe1\u606f",
  pairingCodeTitle: "\u5b9e\u4f8b\u56fa\u5b9a\u914d\u5bf9",
  pairingCodeHint: "\u4f18\u5148\u70b9\u51fb\u4e0b\u65b9\u914d\u5bf9\u94fe\u63a5\uff0c\u7cfb\u7edf\u4f1a\u81ea\u52a8\u5e26\u4e0a\u8bbf\u95ee\u4ee4\u724c\u5b8c\u6210\u767b\u5f55\u3002",
  pairingCodeUnavailable: "\u6682\u65f6\u65e0\u6cd5\u83b7\u53d6\u914d\u5bf9\u7801\uff0c\u8bf7\u7a0d\u540e\u5237\u65b0\u3002",
  pairingCodeFetchFailed: "\u83b7\u53d6\u914d\u5bf9\u7801\u5931\u8d25",
  refreshPairingCode: "\u5237\u65b0\u914d\u5bf9\u4fe1\u606f",
  pairingCodeFetchedAt: "\u83b7\u53d6\u65f6\u95f4",
  pairingCodeSource: "\u624b\u52a8\u914d\u5bf9\u8bf7\u6c42",
  sendCommand: "\u53d1\u9001",
  terminalInputPlaceholder: "\u8f93\u5165\u547d\u4ee4\uff0c\u56de\u8f66\u53ef\u53d1\u9001",
  terminalNotRunning: "\u5b9e\u4f8b\u672a\u8fd0\u884c\uff0c\u65e0\u6cd5\u6253\u5f00Web\u7ec8\u7aef",
  terminalConnectFailed: "Web\u7ec8\u7aef\u8fde\u63a5\u5931\u8d25",
  terminalConnected: "Web\u7ec8\u7aef\u5df2\u8fde\u63a5",
  terminalDisconnected: "Web\u7ec8\u7aef\u5df2\u65ad\u5f00",
  terminalOutput: "\u7ec8\u7aef\u8f93\u51fa",
  copyCommand: "\u590d\u5236\u547d\u4ee4",
  copyCommandSuccess: "\u8fde\u63a5\u547d\u4ee4\u5df2\u590d\u5236",
  copyCommandFailed: "\u590d\u5236\u5931\u8d25\uff0c\u8bf7\u624b\u52a8\u590d\u5236",
  confirmActionTitle: "\u786e\u8ba4\u64cd\u4f5c",
  confirmActionContentPrefix: "\u786e\u8ba4\u5bf9\u5b9e\u4f8b\u6267\u884c\u64cd\u4f5c\uff1a",
  confirmActionOk: "\u786e\u8ba4\u6267\u884c",
  deleteConfirmTitle: "\u5220\u9664\u5b9e\u4f8b",
  deleteConfirmContentPrefix: "\u5220\u9664\u540e\u4e0d\u53ef\u6062\u590d\uff0c\u786e\u8ba4\u5220\u9664\uff1a",
  deleteSuccessPrefix: "\u5b9e\u4f8b\u5df2\u5220\u9664\uff1a",
  deleteFailed: "\u5220\u9664\u5b9e\u4f8b\u5931\u8d25",
  instanceNotFound: "\u5b9e\u4f8b\u4e0d\u5b58\u5728\uff0c\u5df2\u5237\u65b0\u5217\u8868",
  instanceIdCopied: "\u5b9e\u4f8bID\u5df2\u590d\u5236",
  cancel: "\u53d6\u6d88",
  noInstances: "\u5f53\u524d\u6ca1\u6709\u53ef\u7ba1\u7406\u7684claw\u5b9e\u4f8b\u3002",
  noAgentsSection: "Agents \u533a\u57df\u6682\u672a\u5f00\u653e\uff0c\u4e0b\u4e00\u6b65\u518d\u5bf9\u63a5\u5206\u9875\u529f\u80fd\u3002",
  noSkillsSection: "Skills \u533a\u57df\u6682\u672a\u5f00\u653e\uff0c\u4e0b\u4e00\u6b65\u518d\u5bf9\u63a5\u5206\u9875\u529f\u80fd\u3002",
  selectInstanceFirst: "\u8bf7\u5148\u5728\u5de6\u4fa7\u5b9e\u4f8b\u5217\u8868\u9009\u62e9\u4e00\u4e2a claw \u5b9e\u4f8b\u3002",
  createModalTitle: "\u521b\u5efa\u65b0\u5b9e\u4f8b",
  desiredStateRunning: "\u8fd0\u884c",
  desiredStateStopped: "\u505c\u6b62",
  noPresetImage: "\u5f53\u524d\u6ca1\u6709\u53ef\u9009\u9884\u7f6e\u955c\u50cf\uff0c\u8bf7\u5148\u5728API\u914d\u7f6e app.images.presets",
  requiredName: "\u8bf7\u8f93\u5165\u5b9e\u4f8b\u540d",
  nameAlreadyExists: "\u5b9e\u4f8b\u540d\u5df2\u5b58\u5728\uff0c\u8bf7\u66f4\u6362",
  requiredImage: "\u8bf7\u9009\u62e9\u955c\u50cf",
  fixedHostTipPrefix: "\u5f53\u524d\u5bbf\u4e3b\u673aID\u5df2\u56fa\u5b9a\uff1a",
  agentChatTitle: "\u5b9e\u4f8b\u804a\u5929",
  loadAgentsFailed: "\u52a0\u8f7d Agent \u5217\u8868\u5931\u8d25",
  noAgents: "\u8be5\u5b9e\u4f8b\u6682\u65e0\u53ef\u7528 Agent",
  refreshAgents: "\u5237\u65b0 Agent \u5217\u8868",
  loadSkillsFailed: "\u52a0\u8f7d Skill \u5217\u8868\u5931\u8d25",
  noSkills: "\u8be5\u5b9e\u4f8b\u6682\u65e0\u53ef\u7528 Skill",
  tabClaw: "claw\u8be6\u60c5",
  tabAgent: "Agent",
  tabSkill: "Skill",
  agentSkillPanelTitle: "Agent / Skill",
  refreshSkills: "\u5237\u65b0 Skill \u5217\u8868",
  selectSkill: "\u9009\u62e9 Skill",
  skillListHint: "\u70b9\u51fb Skill \u5361\u7247\u67e5\u770b\u8be6\u60c5",
  skillAllowed: "\u53ef\u8c03\u7528",
  skillNotAllowed: "\u672a\u6388\u6743",
  skillPath: "Skill \u8def\u5f84",
  skillPrompt: "Skill \u63d0\u793a\u8bcd",
  noSkillPrompt: "\u8bf7\u9009\u62e9 Skill \u67e5\u770b\u63d0\u793a\u8bcd",
  skillScopeHint: "Skill \u5c5e\u4e8e\u5b9e\u4f8b\u5de5\u4f5c\u533a\u5171\u4eab\u80fd\u529b\uff0c\u5f53\u524d Agent \u80fd\u5426\u8c03\u7528\u7531 allowed_tools \u9650\u5236",
  agentAllowedTools: "allowed_tools",
  agentSystemPromptTitle: "Agent system_prompt",
  agentSystemPromptPath: "\u914d\u7f6e\u8def\u5f84",
  agentSystemPromptPreview: "system_prompt \u9884\u89c8",
  agentSystemPromptPlaceholder: "当前未配置 system_prompt",
  agentSkillNotAllowed: "\u5f53\u524d Agent \u7684 allowed_tools \u672a\u5305\u542b\u8be5 Skill ID\uff0c\u53ef\u80fd\u65e0\u6cd5\u76f4\u63a5\u8c03\u7528",
  selectAgent: "\u9009\u62e9 Agent",
  agentModel: "\u6a21\u578b",
  agentProvider: "\u63d0\u4f9b\u65b9",
  agenticMode: "Agentic",
  agentMessage: "\u6d88\u606f",
  agentMessagePlaceholder: "\u8f93\u5165\u53d1\u7ed9\u5f53\u524d\u6240\u9009 Agent \u7684\u6d88\u606f\uff1b\u591a\u884c\u5185\u5bb9\u4f1a\u5728\u53d1\u9001\u65f6\u81ea\u52a8\u5408\u5e76\u4e3a\u540c\u4e00\u6761\u56de\u5408",
  sendAgentMessage: "\u53d1\u9001\u5230\u4f1a\u8bdd",
  missingAgentOrMessage: "\u8bf7\u5148\u9009\u62e9 Agent \u5e76\u8f93\u5165\u6d88\u606f",
  agentChatLegacyDisabled: "\u65e7 agent-task \u6a21\u5f0f\u5df2\u79fb\u9664\uff0c\u7b49\u5f85 Agent Session \u6a21\u5f0f\u63a5\u5165",
  agentChatLegacyHint: "\u5f53\u524d\u4ec5\u4fdd\u7559 UI\uff0c\u540e\u7eed\u5c06\u6539\u4e3a\u957f\u4f1a\u8bdd Agent Session \u9a71\u52a8",
  agentSessionConnect: "\u542f\u52a8\u4f1a\u8bdd",
  agentSessionDisconnect: "\u7ed3\u675f\u4f1a\u8bdd",
  agentSessionOutput: "\u4f1a\u8bdd\u8f93\u51fa",
  agentSessionOutputPlaceholder: "\u8fde\u63a5 Agent Session \u540e\uff0c\u5b9e\u4f8b\u5185 zeroclaw agent \u7684\u8f93\u51fa\u4f1a\u5b9e\u65f6\u663e\u793a\u5728\u8fd9\u91cc\u3002",
  agentSessionConnectFailed: "Agent Session \u8fde\u63a5\u5931\u8d25",
  agentSessionConnected: "Agent Session \u5df2\u8fde\u63a5",
  agentSessionDisconnected: "Agent Session \u5df2\u65ad\u5f00",
  agentSessionConnectFirst: "\u8bf7\u5148\u542f\u52a8\u4f1a\u8bdd\uff0c\u518d\u8fdb\u884c\u586b\u5199\u3001\u53d1\u9001\u6216\u4ea4\u4e92\u64cd\u4f5c",
  agentSessionNotRunning: "\u8bf7\u5148\u542f\u52a8\u5b9e\u4f8b\uff0c\u518d\u6253\u5f00 Agent Session",
  agentSessionModeHint: "\u5f53\u524d\u4e3a\u957f\u4f1a\u8bdd\u6a21\u5f0f\uff0c\u7528\u6237\u7684\u201c\u786e\u8ba4\u7b2cN\u6b65 / \u91cd\u751f\u6210\u201d\u5fc5\u987b\u5728\u540c\u4e00\u6761\u8fde\u63a5\u5185\u7ee7\u7eed\u53d1\u9001\u3002\u591a\u884c\u8f93\u5165\u4f1a\u88ab\u5408\u5e76\u4e3a\u5355\u6761\u6d88\u606f\uff0c\u907f\u514d\u88ab REPL \u62c6\u6210\u591a\u4e2a\u56de\u5408\u3002",
  agentSessionMainAgentHint: "\u4f1a\u8bdd\u6a21\u5f0f\u51b3\u5b9a\u7531 claw \u81ea\u52a8\u8def\u7531\uff0c\u8fd8\u662f\u76f4\u63a5\u8fdb\u5165\u4f60\u6307\u5b9a\u7684 Agent\u3002\u4e00\u65e6\u5173\u95ed\u8fde\u63a5\uff0c\u4e0a\u4e0b\u6587\u4f1a\u7acb\u5373\u6e05\u7a7a\u3002",
  agentSessionRouteMode: "\u4f1a\u8bdd\u6a21\u5f0f",
  agentSessionRouteModeAuto: "\u81ea\u52a8\u8def\u7531",
  agentSessionRouteModeDirect: "\u6307\u5b9a Agent",
  agentSessionRouteModeAutoHint: "\u4e0d\u4f20 agentId\uff0c\u7531 claw \u5148\u8fdb\u5165\u4e3b Agent\uff0c\u518d\u81ea\u4e3b\u9009\u62e9\u6216 delegate \u7ed9\u5408\u9002\u7684 Agent\u3002",
  agentSessionRouteModeDirectHint: "\u4f20\u5165 agentId\uff0c\u4f1a\u8bdd\u76f4\u63a5\u8fdb\u5165\u5f53\u524d\u6240\u9009 Agent\uff0c\u9002\u5408\u5df2\u77e5\u76ee\u6807 Agent \u7684\u5feb\u901f\u8def\u5f84\u3002",
  agentSessionCurrentAgent: "\u5f53\u524d Agent",
  agentSessionCurrentAgentHint: "\u4f1a\u8bdd\u4f1a\u76f4\u63a5\u8fdb\u5165\u5f53\u524d\u6240\u9009 Agent\u3002\u8fde\u63a5\u5efa\u7acb\u540e\u5982\u9700\u5207\u6362\uff0c\u8bf7\u5148\u7ed3\u675f\u5f53\u524d\u4f1a\u8bdd\u3002",
  agentSessionSelectAgentRequired: "\u8bf7\u5148\u9009\u62e9\u4e00\u4e2a Agent \u518d\u542f\u52a8\u4f1a\u8bdd",
  agentSessionNoAgentsAvailable: "\u5f53\u524d\u5b9e\u4f8b\u6ca1\u6709\u53ef\u7528 Agent\uff0c\u65e0\u6cd5\u542f\u52a8\u76f4\u8fde Agent \u4f1a\u8bdd",
  agentSessionStarterTitle: "\u53d1\u8d77\u521b\u4f5c\u9700\u6c42",
  agentSessionStarterHint: "\u5148\u7528\u8868\u5355\u544a\u8bc9 Agent \u4f60\u8981\u751f\u6210\u4ec0\u4e48\uff0c\u540e\u7eed\u518d\u50cf\u804a\u5929\u4e00\u6837\u7ee7\u7eed\u786e\u8ba4\u6216\u4fee\u6539\u3002",
  agentSessionScriptType: "\u5267\u672c\u7c7b\u578b",
  agentSessionScriptContent: "\u6545\u4e8b\u5185\u5bb9",
  agentSessionTargetAudience: "\u76ee\u6807\u53d7\u4f17",
  agentSessionEpisodeCount: "\u9884\u671f\u96c6\u6570",
  agentSessionSendStarter: "\u53d1\u9001\u521b\u4f5c\u9700\u6c42",
  agentSessionNeedStarterFields: "\u8bf7\u5148\u586b\u5199\u5b8c\u6574\u7684\u521b\u4f5c\u9700\u6c42",
  agentSessionStarterContentPlaceholder: "\u4f8b\u5982\uff1a\u4e00\u4e2a\u88ab\u9677\u5bb3\u7684\u5973\u5f8b\u5e08\u91cd\u751f\u56de\u5ead\u5ba1\u524d\u591c\uff0c\u53cd\u6740\u5e55\u540e\u9ed1\u624b\u5e76\u9006\u88ad\u6210\u5f8b\u6240\u5408\u4f19\u4eba\u3002",
  agentSessionFollowUpPlaceholder: "\u7ee7\u7eed\u50cf\u804a\u5929\u4e00\u6837\u8bf4\u51fa\u4f60\u7684\u786e\u8ba4\u3001\u4fee\u6539\u6216\u8ffd\u52a0\u8981\u6c42",
  agentSessionConversationEmpty: "\u4f1a\u8bdd\u542f\u52a8\u540e\uff0cAgent \u7684\u56de\u590d\u4f1a\u4ee5\u5bf9\u8bdd\u5f62\u5f0f\u663e\u793a\u5728\u8fd9\u91cc\u3002",
  agentSessionReviseModeTitle: "\u5f53\u524d\u6b63\u5728\u4fee\u6539",
  agentSessionReviseModeHint: "\u8bf7\u76f4\u63a5\u8f93\u5165\u4f60\u7684\u4fee\u6539\u8981\u6c42\uff0c\u7cfb\u7edf\u4f1a\u81ea\u52a8\u8865\u9f50\u4ea4\u4e92\u534f\u8bae\u5b57\u6bb5\u3002",
  agentSessionReviseModeCancel: "\u53d6\u6d88\u4fee\u6539",
  agentSessionCopyOutput: "\u590d\u5236\u4ea7\u51fa",
  agentSessionCopyOutputSuccess: "\u4ea7\u51fa\u5185\u5bb9\u5df2\u590d\u5236",
  agentSessionCopyOutputFailed: "\u590d\u5236\u4ea7\u51fa\u5931\u8d25\uff0c\u8bf7\u624b\u52a8\u590d\u5236",
  agentSessionInteractionConfirmed: "\u5df2\u63d0\u4ea4\u786e\u8ba4",
  agentSessionInteractionRevised: "\u5df2\u63d0\u4ea4\u4fee\u6539",
  agentSessionInteractionSubmitted: "\u5df2\u63d0\u4ea4\u4ea4\u4e92",
  agentSessionQuickApprove: "\u786e\u8ba4\u5f53\u524d\u6b65\u9aa4",
  agentSessionQuickRevise: "\u91cd\u751f\u6210\u5f53\u524d\u6b65\u9aa4",
  agentSessionShowDebug: "\u663e\u793a\u8c03\u8bd5\u65e5\u5fd7",
  agentSessionHideDebug: "\u9690\u85cf\u8c03\u8bd5\u65e5\u5fd7",
  agentSessionDebugTitle: "\u8c03\u8bd5\u65e5\u5fd7",
  agentSessionActiveSession: "\u5f53\u524d\u4f1a\u8bdd",
  agentSessionPendingReply: "Agent \u6b63\u5728\u7ec4\u7ec7\u56de\u590d...",
  agentSessionConnectedHint: "\u5df2\u8fde\u63a5\u5230\u5f53\u524d\u5b9e\u4f8b\u4f1a\u8bdd",
  agentSessionIdleHint: "\u672a\u8fde\u63a5",
  agentSessionComposerShortcutHint: "Enter 发送，Shift + Enter 换行",
  mainAgentGuidanceTitle: "\u4e3b Agent \u63d0\u793a\u8bcd",
  mainAgentGuidanceExpand: "\u5c55\u5f00",
  mainAgentGuidanceCollapse: "\u6536\u8d77",
  mainAgentGuidanceRefresh: "\u5237\u65b0\u63d0\u793a\u8bcd",
  mainAgentGuidanceEdit: "\u7f16\u8f91",
  mainAgentGuidanceCancel: "\u53d6\u6d88",
  mainAgentGuidanceSave: "\u4fdd\u5b58\u8986\u76d6",
  mainAgentGuidanceDelete: "\u5220\u9664\u8986\u76d6",
  mainAgentGuidanceLoadingFailed: "\u52a0\u8f7d\u4e3b Agent \u63d0\u793a\u8bcd\u5931\u8d25",
  mainAgentGuidanceSaveFailed: "\u4fdd\u5b58\u4e3b Agent \u63d0\u793a\u8bcd\u5931\u8d25",
  mainAgentGuidanceDeleteFailed: "\u5220\u9664\u4e3b Agent \u63d0\u793a\u8bcd\u8986\u76d6\u5931\u8d25",
  mainAgentGuidanceSaved: "\u4e3b Agent \u63d0\u793a\u8bcd\u5df2\u4fdd\u5b58",
  mainAgentGuidanceDeleted: "\u4e3b Agent \u63d0\u793a\u8bcd\u8986\u76d6\u5df2\u5220\u9664",
  mainAgentGuidanceSource: "\u751f\u6548\u6765\u6e90",
  mainAgentGuidanceWorkspacePath: "\u8fd0\u884c\u8def\u5f84",
  mainAgentGuidanceGlobalPath: "\u5168\u5c40\u9ed8\u8ba4\u8def\u5f84",
  mainAgentGuidanceOverwriteOnStart: "\u542f\u52a8\u65f6\u8986\u76d6",
  mainAgentGuidanceOverrideEnabled: "\u5b9e\u4f8b\u8986\u76d6\u542f\u7528",
  mainAgentGuidanceOverridePrompt: "\u5b9e\u4f8b\u8986\u76d6\u5185\u5bb9",
  mainAgentGuidanceOverridePromptPlaceholder: "\u8f93\u5165\u6216\u7c98\u8d34\u8be5\u5b9e\u4f8b\u7684\u4e3b Agent \u63d0\u793a\u8bcd",
  mainAgentGuidanceEffectivePrompt: "\u5f53\u524d\u751f\u6548\u5185\u5bb9\u9884\u89c8",
  mainAgentGuidanceNoEffectivePrompt: "\u5f53\u524d\u65e0\u751f\u6548\u4e3b Agent \u63d0\u793a\u8bcd",
  mainAgentGuidancePromptRequired: "\u9996\u6b21\u4fdd\u5b58\u5b9e\u4f8b\u8986\u76d6\u65f6\uff0c\u8bf7\u5148\u586b\u5199\u63d0\u793a\u8bcd\u5185\u5bb9",
} as const;

function statusColor(status: ClawInstance["status"]) {
  if (status === "RUNNING") {
    return "green";
  }
  if (status === "ERROR") {
    return "red";
  }
  if (status === "CREATING") {
    return "blue";
  }
  return "default";
}

function resolveUiControllerUrl(instance: Pick<ClawInstance, "id" | "gatewayUrl">) {
  const configuredBaseUrl = appConfig.uiControllerBaseUrl?.trim();
  if (configuredBaseUrl) {
    const normalizedBaseUrl = configuredBaseUrl.replace(/\/+$/, "");
    return `${normalizedBaseUrl}/${instance.id}`;
  }

  const gatewayUrl = instance.gatewayUrl?.trim();
  return gatewayUrl || undefined;
}

function shortInstanceId(id: string) {
  if (!id || id.length <= 14) {
    return id;
  }
  return `${id.slice(0, 8)}...${id.slice(-4)}`;
}

export function Dashboard() {
  const [messageApi, messageContext] = message.useMessage();
  const [createForm] = Form.useForm<CreateInstanceFormValues>();
  const [instances, setInstances] = useState<ClawInstance[]>([]);
  const [images, setImages] = useState<ImagePreset[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>();
  const [activeView, setActiveView] = useState<ConsoleView>("instances");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loadingInstances, setLoadingInstances] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [actionConfirmOpen, setActionConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<Exclude<InstanceActionType, "START">>();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [remoteModalOpen, setRemoteModalOpen] = useState(false);
  const [creatingInstance, setCreatingInstance] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [activeInstanceAction, setActiveInstanceAction] = useState<{ action: InstanceActionType; instanceName?: string }>();
  const [deletingInstance, setDeletingInstance] = useState(false);
  const [error, setError] = useState<string>();
  const [pairingCodeModalOpen, setPairingCodeModalOpen] = useState(false);
  const [pairingCodeLoading, setPairingCodeLoading] = useState(false);
  const [pairingCodeData, setPairingCodeData] = useState<PairingCodeResponse>();
  const [pairingCodeInstanceName, setPairingCodeInstanceName] = useState<string>();
  const [agents, setAgents] = useState<AgentDescriptor[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [agentsError, setAgentsError] = useState<string>();
  const [selectedAgentId, setSelectedAgentId] = useState<string>();
  const [agentSessionMode, setAgentSessionMode] = useState<AgentSessionMode>("auto");
  const [skills, setSkills] = useState<SkillDescriptor[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [skillsError, setSkillsError] = useState<string>();
  const [selectedSkillId, setSelectedSkillId] = useState<string>();
  const [agentMessageInput, setAgentMessageInput] = useState("");
  const [agentComposerInteractionDraft, setAgentComposerInteractionDraft] = useState<AgentComposerInteractionDraft>();
  const agentSessionSocketRef = useRef<WebSocket | null>(null);
  const agentQueuedMessageRef = useRef<string | null>(null);
  const agentMessageComposingRef = useRef(false);
  const agentSessionLineBufferRef = useRef("");
  const agentPendingAssistantMessageIdRef = useRef<string | null>(null);
  const agentTurnQueueRef = useRef<AgentTurnTracker[]>([]);
  const agentChatMessageSeqRef = useRef(0);
  const agentSessionDebugEntrySeqRef = useRef(0);
  const [agentSessionOutput, setAgentSessionOutput] = useState("");
  const [agentSessionConnecting, setAgentSessionConnecting] = useState(false);
  const [agentSessionConnected, setAgentSessionConnected] = useState(false);
  const agentSessionOutputRef = useRef<HTMLDivElement | null>(null);
  const agentSessionSuppressCloseMessageRef = useRef(false);
  const [agentChatMessages, setAgentChatMessages] = useState<AgentChatMessage[]>([]);
  const [agentSessionDebugVisible, setAgentSessionDebugVisible] = useState(false);
  const [agentSessionDebugEntries, setAgentSessionDebugEntries] = useState<AgentSessionDebugEntry[]>([]);
  const [agentSessionStarterDraft, setAgentSessionStarterDraft] = useState<AgentSessionStarterDraft>({
    scriptType: "一句话剧本",
    scriptContent: "",
    targetAudience: "女频",
    expectedEpisodeCount: "3",
  });
  const [agentSessionCoreFields, setAgentSessionCoreFields] = useState<AgentSessionCoreFields>();
  const [mainAgentGuidance, setMainAgentGuidance] = useState<InstanceMainAgentGuidance>();
  const [mainAgentGuidanceLoading, setMainAgentGuidanceLoading] = useState(false);
  const [mainAgentGuidanceSaving, setMainAgentGuidanceSaving] = useState(false);
  const [mainAgentGuidanceDeleting, setMainAgentGuidanceDeleting] = useState(false);
  const [mainAgentGuidanceError, setMainAgentGuidanceError] = useState<string>();
  const [mainAgentPromptDraft, setMainAgentPromptDraft] = useState("");
  const [mainAgentOverrideEnabledDraft, setMainAgentOverrideEnabledDraft] = useState(true);
  const [mainAgentGuidanceEditing, setMainAgentGuidanceEditing] = useState(false);
  const [mainAgentGuidanceCollapsed, setMainAgentGuidanceCollapsed] = useState(true);
  const [instanceDetailTab, setInstanceDetailTab] = useState<InstanceDetailTabKey>("claw");
  const terminalSocketRef = useRef<WebSocket | null>(null);
  const [terminalOutput, setTerminalOutput] = useState("");
  const [terminalCommand, setTerminalCommand] = useState("");
  const [terminalConnecting, setTerminalConnecting] = useState(false);
  const [terminalConnected, setTerminalConnected] = useState(false);
  const terminalOutputRef = useRef<HTMLDivElement | null>(null);

  const selectedInstance = useMemo(
    () => instances.find((item) => item.id === selectedInstanceId),
    [instances, selectedInstanceId]
  );
  const selectedAgent = useMemo(
    () => agents.find((item) => item.id === selectedAgentId),
    [agents, selectedAgentId]
  );
  const selectedSkill = useMemo(
    () => skills.find((item) => item.id === selectedSkillId),
    [skills, selectedSkillId]
  );
  const selectedAgentAllowedTools = useMemo(
    () => (selectedAgent?.allowedTools ?? []).filter((item): item is string => typeof item === "string" && item.trim().length > 0),
    [selectedAgent]
  );
  const selectedSkillNotAllowed = useMemo(() => {
    if (!selectedSkill) {
      return false;
    }
    if (selectedAgentAllowedTools.length === 0) {
      return false;
    }
    return !selectedAgentAllowedTools.includes(selectedSkill.id);
  }, [selectedAgentAllowedTools, selectedSkill]);
  const selectedStatus = selectedInstance?.status;
  const actionBusy = submittingAction || deletingInstance;
  const disableStart = !selectedInstance || actionBusy || selectedStatus === "RUNNING" || selectedStatus === "CREATING";
  const disableStop = !selectedInstance || actionBusy || selectedStatus === "STOPPED" || selectedStatus === "CREATING";
  const disableRestartInstance = !selectedInstance || actionBusy || selectedStatus === "CREATING";
  const disableRollback = !selectedInstance || actionBusy || selectedStatus === "CREATING";
  const disableDelete = !selectedInstance || actionBusy;
  const disableRemoteConnect = !selectedInstance;
  const disableSendAgentMessage = !selectedInstance || !agentSessionConnected || !agentMessageInput.trim();
  const agentSessionInputLocked = !agentSessionConnected || agentSessionConnecting;
  const agentSessionRequiresDirectAgent = agentSessionMode === "direct";
  const agentSessionTargetAgentId = agentSessionRequiresDirectAgent ? selectedAgentId : undefined;
  const disableConnectAgentSession = !selectedInstance
    || selectedStatus !== "RUNNING"
    || agentSessionConnecting
    || agentSessionConnected
    || agentsLoading
    || (agentSessionRequiresDirectAgent && !selectedAgentId);
  const disableSendAgentStarter = !selectedInstance
    || agentSessionInputLocked
    || (agentSessionRequiresDirectAgent && !selectedAgentId);
  const selectedRemoteConnectCommand = selectedInstance?.remoteConnectCommand?.trim();
  const selectedGatewayUrl = selectedInstance ? resolveUiControllerUrl(selectedInstance) : undefined;
  const agentSessionRenderedLines = useMemo(() => agentSessionOutput.split("\n"), [agentSessionOutput]);
  const hasAgentSessionDebugData = useMemo(
    () => agentSessionDebugEntries.length > 0 || agentSessionOutput.trim().length > 0,
    [agentSessionDebugEntries, agentSessionOutput]
  );
  const latestInteractiveAgentMessage = useMemo(
    () => [...agentChatMessages].reverse().find((item) => item.role === "assistant" && !item.interactionResolved && (item.interaction?.actions.length ?? 0) > 0),
    [agentChatMessages]
  );
  const pendingAgentApprovalMessageId = latestInteractiveAgentMessage?.interaction ? latestInteractiveAgentMessage.id : undefined;
  const agentMessageComposerPlaceholder = agentComposerInteractionDraft?.interactionAction === "revise"
    ? `请补充你对“${getAgentInteractionStateLabel(agentComposerInteractionDraft.stateId) ?? "当前内容"}”的修改要求`
    : agentSessionInputLocked
      ? uiText.agentSessionConnectFirst
      : uiText.agentSessionFollowUpPlaceholder;
  const agentComposerDraftStateLabel = getAgentInteractionStateLabel(agentComposerInteractionDraft?.stateId) ?? "当前内容";
  const terminalRenderedLines = useMemo(() => terminalOutput.split("\n"), [terminalOutput]);
  const selectedPairingCode = pairingCodeData?.pairingCode?.trim();
  const selectedPairingLink = pairingCodeData?.pairingLink?.trim();
  const actionLabelMap: Record<InstanceActionType, string> = {
    START: uiText.start,
    STOP: uiText.stop,
    RESTART: uiText.restartInstance,
    ROLLBACK: uiText.rollback,
  };
  const activeActionLabel = activeInstanceAction ? actionLabelMap[activeInstanceAction.action] : "";
  const baselineMainAgentPrompt = mainAgentGuidance?.overridePrompt ?? "";
  const baselineMainAgentOverrideEnabled = mainAgentGuidance?.overrideEnabled ?? true;
  const mainAgentGuidanceDirty = mainAgentPromptDraft !== baselineMainAgentPrompt
    || mainAgentOverrideEnabledDraft !== baselineMainAgentOverrideEnabled;
  const dashboardStats = useMemo(() => {
    const running = instances.filter((item) => item.status === "RUNNING").length;
    const stopped = instances.filter((item) => item.status === "STOPPED").length;
    const errorCount = instances.filter((item) => item.status === "ERROR").length;
    return {
      total: instances.length,
      running,
      stopped,
      errorCount,
    };
  }, [instances]);
  const activeMenuView: Exclude<ConsoleView, "instance-detail"> =
    activeView === "instance-detail" ? "instances" : activeView;

  const loadInstances = useCallback(async () => {
    setLoadingInstances(true);
    setError(undefined);
    try {
      const response = await listInstances();
      setInstances(response.items);
      if (response.items.length > 0) {
        setSelectedInstanceId((current) => {
          if (!current) {
            return response.items[0].id;
          }
          const exists = response.items.some((item) => item.id === current);
          return exists ? current : response.items[0].id;
        });
      } else {
        setSelectedInstanceId(undefined);
        setActiveView((current) => (current === "instance-detail" ? "instances" : current));
      }
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : uiText.loadFailed);
    } finally {
      setLoadingInstances(false);
    }
  }, []);

  const loadImages = useCallback(async () => {
    setLoadingImages(true);
    try {
      const response = await listImages();
      setImages(response.items);
      if (response.items.length > 0) {
        const defaultImage = response.items.find((item) => item.recommended)?.image ?? response.items[0].image;
        createForm.setFieldValue("image", defaultImage);
      }
    } catch (apiError) {
      messageApi.error(apiError instanceof Error ? apiError.message : uiText.loadImagesFailed);
    } finally {
      setLoadingImages(false);
    }
  }, [createForm, messageApi]);

  const loadAgents = useCallback(async (instanceId?: string) => {
    if (!instanceId) {
      setAgents([]);
      setSelectedAgentId(undefined);
      setAgentsError(undefined);
      return;
    }

    setAgentsLoading(true);
    setAgentsError(undefined);
    try {
      const response = await listInstanceAgents(instanceId);
      setAgents(response.items);
      setSelectedAgentId((current) => {
        if (!response.items.length) {
          return undefined;
        }
        if (current && response.items.some((item) => item.id === current)) {
          return current;
        }
        return response.items[0].id;
      });
    } catch (apiError) {
      setAgents([]);
      setSelectedAgentId(undefined);
      setAgentsError(apiError instanceof Error ? apiError.message : uiText.loadAgentsFailed);
    } finally {
      setAgentsLoading(false);
    }
  }, []);

  const loadSkills = useCallback(async (instanceId?: string) => {
    if (!instanceId) {
      setSkills([]);
      setSelectedSkillId(undefined);
      setSkillsError(undefined);
      return;
    }

    setSkillsLoading(true);
    setSkillsError(undefined);
    try {
      const response = await listInstanceSkills(instanceId);
      setSkills(response.items);
      setSelectedSkillId((current) => {
        if (!response.items.length) {
          return undefined;
        }
        if (current && response.items.some((item) => item.id === current)) {
          return current;
        }
        return response.items[0].id;
      });
    } catch (apiError) {
      setSkills([]);
      setSelectedSkillId(undefined);
      setSkillsError(apiError instanceof Error ? apiError.message : uiText.loadSkillsFailed);
    } finally {
      setSkillsLoading(false);
    }
  }, []);

  const loadMainAgentGuidance = useCallback(async (instanceId?: string) => {
    if (!instanceId) {
      setMainAgentGuidance(undefined);
      setMainAgentGuidanceError(undefined);
      setMainAgentPromptDraft("");
      setMainAgentOverrideEnabledDraft(true);
      setMainAgentGuidanceEditing(false);
      return;
    }

    setMainAgentGuidanceLoading(true);
    setMainAgentGuidanceError(undefined);
    try {
      const response = await getInstanceMainAgentGuidance(instanceId);
      setMainAgentGuidance(response);
      setMainAgentPromptDraft(response.overridePrompt ?? "");
      setMainAgentOverrideEnabledDraft(response.overrideEnabled ?? true);
      setMainAgentGuidanceEditing(false);
    } catch (apiError) {
      setMainAgentGuidance(undefined);
      setMainAgentPromptDraft("");
      setMainAgentOverrideEnabledDraft(true);
      setMainAgentGuidanceError(apiError instanceof Error ? apiError.message : uiText.mainAgentGuidanceLoadingFailed);
    } finally {
      setMainAgentGuidanceLoading(false);
    }
  }, []);

  const saveMainAgentGuidance = useCallback(async (): Promise<boolean> => {
    if (!selectedInstanceId) {
      return false;
    }
    if (!mainAgentGuidance?.overrideExists && !mainAgentPromptDraft.trim()) {
      messageApi.warning(uiText.mainAgentGuidancePromptRequired);
      return false;
    }
    setMainAgentGuidanceSaving(true);
    setMainAgentGuidanceError(undefined);
    try {
      const request: { prompt?: string; enabled?: boolean; updatedBy?: string } = {
        enabled: mainAgentOverrideEnabledDraft,
        updatedBy: "ui-dashboard",
      };
      if (mainAgentPromptDraft.trim()) {
        request.prompt = mainAgentPromptDraft;
      }
      const response = await upsertInstanceMainAgentGuidance(selectedInstanceId, request);
      setMainAgentGuidance(response);
      setMainAgentPromptDraft(response.overridePrompt ?? "");
      setMainAgentOverrideEnabledDraft(response.overrideEnabled ?? true);
      messageApi.success(uiText.mainAgentGuidanceSaved);
      return true;
    } catch (apiError) {
      messageApi.error(apiError instanceof Error ? apiError.message : uiText.mainAgentGuidanceSaveFailed);
      return false;
    } finally {
      setMainAgentGuidanceSaving(false);
    }
  }, [mainAgentGuidance?.overrideExists, mainAgentOverrideEnabledDraft, mainAgentPromptDraft, messageApi, selectedInstanceId]);

  const removeMainAgentGuidanceOverride = useCallback(async () => {
    if (!selectedInstanceId) {
      return;
    }
    setMainAgentGuidanceDeleting(true);
    setMainAgentGuidanceError(undefined);
    try {
      const response = await deleteInstanceMainAgentGuidance(selectedInstanceId);
      setMainAgentGuidance(response);
      setMainAgentPromptDraft("");
      setMainAgentOverrideEnabledDraft(true);
      setMainAgentGuidanceEditing(false);
      messageApi.success(uiText.mainAgentGuidanceDeleted);
    } catch (apiError) {
      messageApi.error(apiError instanceof Error ? apiError.message : uiText.mainAgentGuidanceDeleteFailed);
    } finally {
      setMainAgentGuidanceDeleting(false);
    }
  }, [messageApi, selectedInstanceId]);

  const cancelMainAgentGuidanceEdit = useCallback(() => {
    setMainAgentPromptDraft(baselineMainAgentPrompt);
    setMainAgentOverrideEnabledDraft(baselineMainAgentOverrideEnabled);
    setMainAgentGuidanceEditing(false);
  }, [baselineMainAgentOverrideEnabled, baselineMainAgentPrompt]);

  useEffect(() => {
    void loadInstances();
  }, [loadInstances]);

  useEffect(() => {
    void loadAgents(selectedInstanceId);
    void loadSkills(selectedInstanceId);
    void loadMainAgentGuidance(selectedInstanceId);
  }, [loadAgents, loadMainAgentGuidance, loadSkills, selectedInstanceId]);

  useEffect(() => {
    setMainAgentGuidanceCollapsed(true);
  }, [selectedInstanceId]);

  useEffect(() => {
    return () => {
      agentSessionSuppressCloseMessageRef.current = true;
      agentQueuedMessageRef.current = null;
      agentSessionLineBufferRef.current = "";
      agentPendingAssistantMessageIdRef.current = null;
      agentTurnQueueRef.current = [];
      agentSessionSocketRef.current?.close();
      agentSessionSocketRef.current = null;
      terminalSocketRef.current?.close();
      terminalSocketRef.current = null;
    };
  }, []);

  useEffect(() => {
    const outputElement = agentSessionOutputRef.current;
    if (!outputElement) {
      return;
    }
    outputElement.scrollTop = outputElement.scrollHeight;
  }, [agentChatMessages]);

  useEffect(() => {
    const outputElement = terminalOutputRef.current;
    if (!outputElement) {
      return;
    }
    outputElement.scrollTop = outputElement.scrollHeight;
  }, [terminalOutput]);

  useEffect(() => {
    const socket = agentSessionSocketRef.current;
    if (!socket) {
      setAgentSessionOutput("");
      setAgentChatMessages([]);
      setAgentMessageInput("");
      setAgentSessionDebugVisible(false);
      setAgentSessionDebugEntries([]);
      agentQueuedMessageRef.current = null;
      agentSessionLineBufferRef.current = "";
      agentPendingAssistantMessageIdRef.current = null;
      agentTurnQueueRef.current = [];
      agentSessionDebugEntrySeqRef.current = 0;
      return;
    }
    agentSessionSuppressCloseMessageRef.current = true;
    socket.close();
    agentSessionSocketRef.current = null;
    setAgentSessionConnected(false);
    setAgentSessionConnecting(false);
    setAgentSessionOutput("");
    setAgentChatMessages([]);
    setAgentMessageInput("");
    setAgentSessionDebugVisible(false);
    setAgentSessionDebugEntries([]);
    agentQueuedMessageRef.current = null;
    agentSessionLineBufferRef.current = "";
    agentPendingAssistantMessageIdRef.current = null;
    agentTurnQueueRef.current = [];
    agentSessionDebugEntrySeqRef.current = 0;
  }, [selectedInstanceId]);

  const openCreateModal = () => {
    setCreateModalOpen(true);
    createForm.setFieldsValue({
      desiredState: "RUNNING",
    });
    void loadImages();
  };

  const closeCreateModal = () => {
    setCreateModalOpen(false);
    createForm.resetFields();
  };

  const openDeleteModal = () => {
    if (!selectedInstance) {
      return;
    }
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (deletingInstance) {
      return;
    }
    setDeleteModalOpen(false);
  };

  const openRemoteModal = () => {
    if (!selectedInstance) {
      return;
    }
    setRemoteModalOpen(true);
  };

  const closeRemoteModal = () => {
    disconnectTerminal();
    setTerminalOutput("");
    setTerminalCommand("");
    setRemoteModalOpen(false);
  };

  const closePairingCodeModal = () => {
    if (pairingCodeLoading) {
      return;
    }
    setPairingCodeModalOpen(false);
  };

  const fetchAndShowPairingCode = useCallback(async (instanceId: string, instanceName?: string) => {
    setPairingCodeLoading(true);
    try {
      const response = await getInstancePairingCode(instanceId);
      setPairingCodeData(response);
      setPairingCodeInstanceName(instanceName);
      setPairingCodeModalOpen(true);
      if (!response.pairingCode) {
        messageApi.warning(response.note ?? uiText.pairingCodeUnavailable);
      }
      return response;
    } catch (apiError) {
      messageApi.error(apiError instanceof Error ? apiError.message : uiText.pairingCodeFetchFailed);
      return undefined;
    } finally {
      setPairingCodeLoading(false);
    }
  }, [messageApi]);

  const handleCreateInstance = async () => {
    try {
      const values = await createForm.validateFields();
      const request: CreateInstanceRequest = {
        ...values,
        hostId: appConfig.defaultHostId,
      };
      setCreatingInstance(true);
      const instance = await createInstance(request);
      closeCreateModal();
      await loadInstances();
      setSelectedInstanceId(instance.id);
      messageApi.success(`${uiText.instanceCreatedPrefix}${instance.name}`);
      if (values.desiredState === "RUNNING") {
        await fetchAndShowPairingCode(instance.id, instance.name);
      }
    } catch (apiError) {
      const hasValidationError =
        typeof apiError === "object" &&
        apiError !== null &&
        "errorFields" in apiError;
      if (hasValidationError) {
        return;
      }
      if (apiError instanceof Error && apiError.message.includes("HTTP 409")) {
        createForm.setFields([{ name: "name", errors: [uiText.nameAlreadyExists] }]);
        messageApi.error(uiText.nameAlreadyExists);
        return;
      }
      messageApi.error(apiError instanceof Error ? apiError.message : uiText.createInstanceFailed);
    } finally {
      setCreatingInstance(false);
    }
  };

  const handleAction = async (action: InstanceActionType) => {
    if (!selectedInstanceId) {
      return false;
    }
    const instanceId = selectedInstanceId;
    const instanceName = selectedInstance?.name ?? "-";
    setActiveInstanceAction({ action, instanceName });
    setSubmittingAction(true);
    try {
      await submitInstanceAction(instanceId, action);
      await loadInstances();
      messageApi.success(`${uiText.actionSubmittedPrefix}${actionLabelMap[action]}`);
      setSubmittingAction(false);
      setActiveInstanceAction(undefined);
      if (action === "START" || action === "RESTART" || action === "ROLLBACK") {
        await fetchAndShowPairingCode(instanceId, instanceName);
      }
      return true;
    } catch (apiError) {
      messageApi.error(apiError instanceof Error ? apiError.message : uiText.actionFailed);
      return false;
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleSensitiveAction = (action: Exclude<InstanceActionType, "START">) => {
    const instanceName = selectedInstance?.name;
    if (!instanceName) {
      return;
    }
    setPendingAction(action);
    setActionConfirmOpen(true);
  };

  const closeActionConfirm = () => {
    if (submittingAction) {
      return;
    }
    setActionConfirmOpen(false);
    setPendingAction(undefined);
  };

  const handleConfirmSensitiveAction = async () => {
    if (!pendingAction) {
      return;
    }
    const action = pendingAction;
    setActionConfirmOpen(false);
    setPendingAction(undefined);
    await handleAction(action);
  };

  const handleDeleteInstance = async () => {
    if (!selectedInstance) {
      return;
    }

    const instanceName = selectedInstance.name;
    const instanceId = selectedInstance.id;
    setDeletingInstance(true);
    try {
      await deleteInstance(instanceId);
      await loadInstances();
      setDeleteModalOpen(false);
      messageApi.success(`${uiText.deleteSuccessPrefix}${instanceName}`);
    } catch (apiError) {
      if (apiError instanceof Error && apiError.message.includes("HTTP 404")) {
        await loadInstances();
        setDeleteModalOpen(false);
        messageApi.warning(uiText.instanceNotFound);
        return;
      }
      messageApi.error(apiError instanceof Error ? apiError.message : uiText.deleteFailed);
    } finally {
      setDeletingInstance(false);
    }
  };

  const copyRemoteConnectCommand = async () => {
    if (!selectedRemoteConnectCommand) {
      messageApi.warning(uiText.remoteConnectUnavailable);
      return;
    }
    try {
      await navigator.clipboard.writeText(selectedRemoteConnectCommand);
      messageApi.success(uiText.copyCommandSuccess);
    } catch (apiError) {
      messageApi.error(apiError instanceof Error ? apiError.message : uiText.copyCommandFailed);
    }
  };

  const clearAgentComposerInteractionDraft = useCallback(() => {
    setAgentComposerInteractionDraft(undefined);
    setAgentMessageInput("");
  }, []);

  const copyAgentChatContent = useCallback(async (content: string) => {
    const normalizedContent = content.trim();
    if (!normalizedContent) {
      return;
    }
    try {
      await navigator.clipboard.writeText(normalizedContent);
      messageApi.success(uiText.agentSessionCopyOutputSuccess);
    } catch (apiError) {
      messageApi.error(apiError instanceof Error ? apiError.message : uiText.agentSessionCopyOutputFailed);
    }
  }, [messageApi]);

  const appendTerminalOutput = useCallback((chunk: string) => {
    setTerminalOutput((current) => {
      const next = `${current}${chunk}`;
      if (next.length <= 120000) {
        return next;
      }
      return next.slice(next.length - 120000);
    });
  }, []);

  const appendAgentSessionOutput = useCallback((chunk: string) => {
    setAgentSessionOutput((current) => {
      const next = `${current}${chunk}`;
      if (next.length <= 120000) {
        return next;
      }
      return next.slice(next.length - 120000);
    });
  }, []);

  const formatAgentMessageForDisplay = useCallback((normalizedMessage: string) => {
    const interactionDisplay = formatAgentInteractionPayloadForDisplay(normalizedMessage);
    if (interactionDisplay) {
      return interactionDisplay;
    }

    const scriptTypeMatch = normalizedMessage.match(/script_type=([^\s]+)/);
    const scriptContentMatch = normalizedMessage.match(/script_content=(.+?)(?=\s+target_audience=|\s+expected_episode_count=|$)/);
    const targetAudienceMatch = normalizedMessage.match(/target_audience=([^\s]+)/);
    const episodeCountMatch = normalizedMessage.match(/expected_episode_count=([^\s]+)/);

    if (scriptTypeMatch && scriptContentMatch && targetAudienceMatch && episodeCountMatch) {
      return [
        `请帮我生成${scriptTypeMatch[1]}`,
        `故事：${scriptContentMatch[1].trim()}`,
        `受众：${targetAudienceMatch[1]}`,
        `集数：${episodeCountMatch[1]}`,
      ].join("\n");
    }

    return normalizedMessage;
  }, []);

  const nextAgentChatMessageId = useCallback(() => {
    agentChatMessageSeqRef.current += 1;
    return `agent-chat-${agentChatMessageSeqRef.current}`;
  }, []);

  const nextAgentSessionDebugEntryId = useCallback(() => {
    agentSessionDebugEntrySeqRef.current += 1;
    return `agent-debug-${agentSessionDebugEntrySeqRef.current}`;
  }, []);

  const appendAgentSessionDebugEntry = useCallback((entry: Omit<AgentSessionDebugEntry, "id">) => {
    const normalizedContent = entry.content.trim();
    if (!normalizedContent) {
      return;
    }
    setAgentSessionDebugEntries((current) => [
      ...current,
      {
        id: nextAgentSessionDebugEntryId(),
        ...entry,
        content: normalizedContent,
      },
    ]);
  }, [nextAgentSessionDebugEntryId]);

  const pruneCommittedAgentTurns = useCallback(() => {
    agentTurnQueueRef.current = agentTurnQueueRef.current.filter((item) => !item.committed);
  }, []);

  const buildAgentChatTiming = useCallback((turn: AgentTurnTracker): AgentChatTiming | undefined => {
    const hasTiming = turn.llmRequestCount > 0
      || typeof turn.firstThinkingDurationMs === "number"
      || typeof turn.firstVisibleDurationMs === "number"
      || turn.modelDurationMs > 0
      || typeof turn.totalDurationMs === "number"
      || typeof turn.agentDurationMs === "number";
    if (!hasTiming) {
      return undefined;
    }
    return {
      provider: turn.provider,
      model: turn.model,
      llmRequestCount: turn.llmRequestCount > 0 ? turn.llmRequestCount : undefined,
      firstThinkingDurationMs: typeof turn.firstThinkingDurationMs === "number" ? turn.firstThinkingDurationMs : undefined,
      firstVisibleDurationMs: typeof turn.firstVisibleDurationMs === "number" ? turn.firstVisibleDurationMs : undefined,
      modelDurationMs: turn.modelDurationMs > 0 ? turn.modelDurationMs : undefined,
      agentDurationMs: typeof turn.agentDurationMs === "number" ? turn.agentDurationMs : undefined,
      totalDurationMs: typeof turn.totalDurationMs === "number" ? turn.totalDurationMs : undefined,
      firstThinkingAt: turn.firstThinkingAt,
      firstVisibleAt: turn.firstVisibleAt,
      completedAt: turn.completedAt,
    };
  }, []);

  const applyTimingToAgentChatMessage = useCallback((messageId: string, turn: AgentTurnTracker) => {
    const timing = buildAgentChatTiming(turn);
    if (!timing) {
      return;
    }
    setAgentChatMessages((current) => current.map((item) => (
      item.id === messageId
        ? {
          ...item,
          emittedAt: turn.assistantEmittedAt ?? item.emittedAt,
          timing: {
            ...item.timing,
            ...timing,
          },
        }
        : item
    )));
  }, [buildAgentChatTiming]);

  const commitAgentTurnTiming = useCallback((turn: AgentTurnTracker) => {
    if (!turn.assistantMessageId) {
      return;
    }
    applyTimingToAgentChatMessage(turn.assistantMessageId, turn);
    if (typeof turn.totalDurationMs === "number") {
      turn.committed = true;
      pruneCommittedAgentTurns();
    }
  }, [applyTimingToAgentChatMessage, pruneCommittedAgentTurns]);

  const bindAssistantMessageToAgentTurn = useCallback((
    messageId: string,
    emittedAt?: string,
    hasVisibleContent = false,
    hasThinkingContent = false,
  ) => {
    const existingTurn = agentTurnQueueRef.current.find((item) => item.assistantMessageId === messageId);
    if (existingTurn) {
      existingTurn.assistantEmittedAt = emittedAt ?? existingTurn.assistantEmittedAt;
      if (hasThinkingContent && typeof existingTurn.firstThinkingDurationMs !== "number") {
        existingTurn.firstThinkingAt = emittedAt ?? new Date().toISOString();
        existingTurn.firstThinkingDurationMs = Math.max(Math.round(getAgentTimingNow() - existingTurn.startedAtMs), 0);
      }
      if (hasVisibleContent && typeof existingTurn.firstVisibleDurationMs !== "number") {
        existingTurn.firstVisibleAt = emittedAt ?? new Date().toISOString();
        existingTurn.firstVisibleDurationMs = Math.max(Math.round(getAgentTimingNow() - existingTurn.startedAtMs), 0);
      }
      commitAgentTurnTiming(existingTurn);
      return;
    }

    const placeholderTurn = agentTurnQueueRef.current.find((item) => !item.assistantMessageId && Boolean(item.placeholderAssistantMessageId));
    if (placeholderTurn) {
      placeholderTurn.assistantMessageId = messageId;
      placeholderTurn.placeholderAssistantMessageId = undefined;
      placeholderTurn.assistantEmittedAt = emittedAt ?? placeholderTurn.assistantEmittedAt;
      if (hasThinkingContent && typeof placeholderTurn.firstThinkingDurationMs !== "number") {
        placeholderTurn.firstThinkingAt = emittedAt ?? new Date().toISOString();
        placeholderTurn.firstThinkingDurationMs = Math.max(Math.round(getAgentTimingNow() - placeholderTurn.startedAtMs), 0);
      }
      if (hasVisibleContent && typeof placeholderTurn.firstVisibleDurationMs !== "number") {
        placeholderTurn.firstVisibleAt = emittedAt ?? new Date().toISOString();
        placeholderTurn.firstVisibleDurationMs = Math.max(Math.round(getAgentTimingNow() - placeholderTurn.startedAtMs), 0);
      }
      commitAgentTurnTiming(placeholderTurn);
      return;
    }

    const pendingTurn = agentTurnQueueRef.current.find((item) => !item.assistantMessageId && !item.placeholderAssistantMessageId);
    if (!pendingTurn) {
      return;
    }
    pendingTurn.assistantMessageId = messageId;
    pendingTurn.assistantEmittedAt = emittedAt;
    if (hasThinkingContent && typeof pendingTurn.firstThinkingDurationMs !== "number") {
      pendingTurn.firstThinkingAt = emittedAt ?? new Date().toISOString();
      pendingTurn.firstThinkingDurationMs = Math.max(Math.round(getAgentTimingNow() - pendingTurn.startedAtMs), 0);
    }
    if (hasVisibleContent && typeof pendingTurn.firstVisibleDurationMs !== "number") {
      pendingTurn.firstVisibleAt = emittedAt ?? new Date().toISOString();
      pendingTurn.firstVisibleDurationMs = Math.max(Math.round(getAgentTimingNow() - pendingTurn.startedAtMs), 0);
    }
    commitAgentTurnTiming(pendingTurn);
  }, [commitAgentTurnTiming]);

  const recordAgentTurnRequest = useCallback((provider?: string, model?: string) => {
    const activeTurn = agentTurnQueueRef.current.find((item) => typeof item.totalDurationMs !== "number");
    if (!activeTurn) {
      return;
    }
    activeTurn.llmRequestCount += 1;
    activeTurn.provider = provider ?? activeTurn.provider;
    activeTurn.model = model ?? activeTurn.model;
    if (activeTurn.assistantMessageId) {
      applyTimingToAgentChatMessage(activeTurn.assistantMessageId, activeTurn);
    }
  }, [applyTimingToAgentChatMessage]);

  const recordAgentTurnResponse = useCallback((provider?: string, model?: string, durationMs?: number) => {
    const activeTurn = agentTurnQueueRef.current.find((item) => typeof item.totalDurationMs !== "number");
    if (!activeTurn) {
      return;
    }
    activeTurn.provider = provider ?? activeTurn.provider;
    activeTurn.model = model ?? activeTurn.model;
    if (typeof durationMs === "number" && Number.isFinite(durationMs) && durationMs >= 0) {
      activeTurn.modelDurationMs += durationMs;
    }
    if (activeTurn.assistantMessageId) {
      applyTimingToAgentChatMessage(activeTurn.assistantMessageId, activeTurn);
    }
  }, [applyTimingToAgentChatMessage]);

  const finalizeActiveAgentTurnTiming = useCallback((completedAt?: string) => {
    const activeTurn = agentTurnQueueRef.current.find((item) => typeof item.totalDurationMs !== "number");
    if (!activeTurn) {
      return;
    }
    const totalDurationMs = Math.max(Math.round(getAgentTimingNow() - activeTurn.startedAtMs), 0);
    activeTurn.totalDurationMs = totalDurationMs;
    activeTurn.agentDurationMs = Math.max(totalDurationMs - activeTurn.modelDurationMs, 0);
    activeTurn.completedAt = completedAt ?? new Date().toISOString();
    commitAgentTurnTiming(activeTurn);
  }, [commitAgentTurnTiming]);

  const trackAgentTimingFromDebug = useCallback((content: string, emittedAt?: string) => {
    const lines = content
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    lines.forEach((line) => {
      const requestMatch = line.match(/\bllm\.request\b.*\bprovider=([^\s]+)\s+model=([^\s]+)/);
      if (requestMatch) {
        recordAgentTurnRequest(requestMatch[1], requestMatch[2]);
        return;
      }

      const responseMatch = line.match(/\bllm\.response\b.*\bprovider=([^\s]+)\s+model=([^\s]+).*?\bduration_ms=(\d+)/);
      if (responseMatch) {
        recordAgentTurnResponse(responseMatch[1], responseMatch[2], Number(responseMatch[3]));
        return;
      }

      if (line.includes("turn.complete")) {
        finalizeActiveAgentTurnTiming(emittedAt);
      }
    });
  }, [finalizeActiveAgentTurnTiming, recordAgentTurnRequest, recordAgentTurnResponse]);

  const appendAgentChatMessage = useCallback((
    role: AgentChatRole,
    content: string,
    pending = false,
    metadata?: Partial<Pick<AgentChatMessage, "createdAt" | "emittedAt" | "timing">>,
  ) => {
    const normalizedMessage = normalizeAgentChatMessage(role, content, pending);
    if (!normalizedMessage) {
      return undefined;
    }
    const messageId = nextAgentChatMessageId();
    setAgentChatMessages((current) => [
      ...current,
      {
        id: messageId,
        ...normalizedMessage,
        ...metadata,
      },
    ]);
    return messageId;
  }, [nextAgentChatMessageId]);

  const appendPendingAssistantPlaceholder = useCallback((createdAt?: string) => {
    const messageId = nextAgentChatMessageId();
    setAgentChatMessages((current) => [
      ...current,
      {
        id: messageId,
        role: "assistant",
        content: "",
        thinkingContent: "",
        pending: true,
        createdAt,
      },
    ]);
    return messageId;
  }, [nextAgentChatMessageId]);

  const finalizePendingAssistantMessage = useCallback(() => {
    const pendingMessageId = agentPendingAssistantMessageIdRef.current;
    if (!pendingMessageId) {
      return;
    }
    setAgentChatMessages((current) => current.flatMap((item) => {
      if (item.id !== pendingMessageId) {
        return [item];
      }
      const normalizedMessage = normalizeAgentChatMessage(item.role, item.content, false);
      if (!normalizedMessage) {
        return [];
      }
      return [{
        ...item,
        ...normalizedMessage,
        createdAt: item.createdAt,
        emittedAt: item.emittedAt,
        timing: item.timing,
      }];
    }));
    agentPendingAssistantMessageIdRef.current = null;
  }, []);

  const appendStructuredAgentSessionMessage = useCallback((message: AgentSessionStreamMessage) => {
    finalizePendingAssistantMessage();
    const normalizedMessage = normalizeStructuredAgentChatMessage(message);
    if (!normalizedMessage) {
      return;
    }
    setAgentChatMessages((current) => {
      const existingIndex = current.findIndex((item) => item.id === normalizedMessage.id);
      if (existingIndex < 0) {
        const activeTurn = agentTurnQueueRef.current.find((item) => typeof item.totalDurationMs !== "number");
        const placeholderMessageId = activeTurn?.placeholderAssistantMessageId;
        if (placeholderMessageId && placeholderMessageId !== normalizedMessage.id) {
          let adoptedPlaceholder = false;
          const adoptedMessages = current.map((item) => {
            if (item.id !== placeholderMessageId) {
              return item;
            }
            adoptedPlaceholder = true;
            return {
              ...item,
              ...normalizedMessage,
              id: normalizedMessage.id,
              createdAt: item.createdAt,
              emittedAt: normalizedMessage.emittedAt ?? item.emittedAt,
              timing: normalizedMessage.timing ?? item.timing,
            };
          });
          if (adoptedPlaceholder) {
            return adoptedMessages;
          }
        }
        return [...current, normalizedMessage];
      }
      return current.map((item) => (
        item.id === normalizedMessage.id
          ? {
            ...item,
            ...normalizedMessage,
            createdAt: item.createdAt,
            emittedAt: normalizedMessage.emittedAt ?? item.emittedAt,
            timing: normalizedMessage.timing ?? item.timing,
          }
          : item
      ));
    });
    if (normalizedMessage.role === "assistant") {
      bindAssistantMessageToAgentTurn(
        normalizedMessage.id,
        normalizedMessage.emittedAt ?? message.emittedAt,
        normalizedMessage.content.trim().length > 0,
        Boolean(normalizedMessage.thinkingContent?.trim()),
      );
    }
  }, [bindAssistantMessageToAgentTurn, finalizePendingAssistantMessage]);

  const appendAssistantMessageChunk = useCallback((chunk: string) => {
    if (!chunk && !agentPendingAssistantMessageIdRef.current) {
      return;
    }

    let createdMessageId: string | undefined;
    setAgentChatMessages((current) => {
      const pendingMessageId = agentPendingAssistantMessageIdRef.current;
      if (!pendingMessageId) {
        if (!chunk.trim()) {
          return current;
        }
        const placeholderMessageId = agentTurnQueueRef.current.find(
          (item) => !item.assistantMessageId && Boolean(item.placeholderAssistantMessageId),
        )?.placeholderAssistantMessageId;
        if (placeholderMessageId && current.some((item) => item.id === placeholderMessageId)) {
          agentPendingAssistantMessageIdRef.current = placeholderMessageId;
          return current.map((item) => (
            item.id === placeholderMessageId
              ? {
                ...item,
                content: `${item.content}${chunk}`,
                pending: true,
              }
              : item
          ));
        }
        const newMessageId = nextAgentChatMessageId();
        createdMessageId = newMessageId;
        agentPendingAssistantMessageIdRef.current = newMessageId;
        return [
          ...current,
          {
            id: newMessageId,
            role: "assistant",
            content: chunk,
            pending: true,
          },
        ];
      }

      return current.map((item) => {
        if (item.id !== pendingMessageId) {
          return item;
        }
        return {
          ...item,
          content: `${item.content}${chunk}`,
          pending: true,
        };
      });
    });
    if (createdMessageId) {
      bindAssistantMessageToAgentTurn(createdMessageId, undefined, true);
    }
  }, [bindAssistantMessageToAgentTurn, nextAgentChatMessageId]);

  const isAgentSessionLogLine = useCallback((line: string) => {
    const normalizedLine = line.trim();
    if (!normalizedLine) {
      return false;
    }
    return normalizedLine.includes("zeroclaw::")
      || /^20\d{2}-\d{2}-\d{2}T/.test(normalizedLine);
  }, []);

  const isAgentSessionMetaLine = useCallback((line: string) => {
    const normalizedLine = line.trim();
    if (!normalizedLine) {
      return false;
    }
    const prefixes = [
      "The user ",
      "The user's ",
      "The user has ",
      "The user is ",
      "According to ",
      "I need to ",
      "I must ",
      "I should ",
      "Let me ",
      "This is a follow-up",
      "The keywords",
      "The input contains",
    ];
    return prefixes.some((prefix) => normalizedLine.startsWith(prefix));
  }, []);

  const isAgentSessionInternalSystemMessage = useCallback((line: string) => {
    const normalizedLine = line.trim();
    if (!normalizedLine) {
      return false;
    }
    const ignoredPrefixes = [
      "connected:",
      "agent session ready:",
      "tip:",
    ];
    return ignoredPrefixes.some((prefix) => normalizedLine.startsWith(prefix));
  }, []);

  const processAgentSessionLine = useCallback((rawLine: string) => {
    const normalizedLine = rawLine.replace(/\r$/, "");
    const trimmedLine = normalizedLine.trim();

    if (!trimmedLine) {
      appendAssistantMessageChunk("\n");
      return;
    }

    if (normalizedLine.startsWith("[system]")) {
      finalizePendingAssistantMessage();
      const systemContent = normalizedLine.replace(/^\[system\]\s*/, "");
      if (!isAgentSessionInternalSystemMessage(systemContent)) {
        appendAgentChatMessage("system", systemContent);
      }
      return;
    }

    if (trimmedLine === "馃 ZeroClaw Interactive Mode" || trimmedLine === "Type /help for commands.") {
      return;
    }

    if (trimmedLine === ">") {
      finalizePendingAssistantMessage();
      return;
    }

    if (trimmedLine.startsWith(">")) {
      const lineAfterPrompt = trimmedLine.slice(1).trim();
      if (!lineAfterPrompt) {
        finalizePendingAssistantMessage();
        return;
      }
      if (lineAfterPrompt.startsWith("[you]")) {
        return;
      }
      if (isAgentSessionLogLine(lineAfterPrompt) || isAgentSessionMetaLine(lineAfterPrompt)) {
        return;
      }
      appendAssistantMessageChunk(`${lineAfterPrompt}\n`);
      return;
    }

    if (isAgentSessionLogLine(trimmedLine)) {
      if (trimmedLine.includes("turn.complete")) {
        finalizePendingAssistantMessage();
      }
      return;
    }

    if (isAgentSessionMetaLine(trimmedLine)) {
      return;
    }

    appendAssistantMessageChunk(`${normalizedLine}\n`);
  }, [
    appendAgentChatMessage,
    appendAssistantMessageChunk,
    finalizePendingAssistantMessage,
    isAgentSessionInternalSystemMessage,
    isAgentSessionLogLine,
    isAgentSessionMetaLine,
  ]);

  const processAgentSessionChunk = useCallback((chunk: string) => {
    appendAgentSessionOutput(chunk);
    agentSessionLineBufferRef.current += chunk;
    const lines = agentSessionLineBufferRef.current.split("\n");
    agentSessionLineBufferRef.current = lines.pop() ?? "";
    lines.forEach((line) => processAgentSessionLine(line));
  }, [appendAgentSessionOutput, processAgentSessionLine]);

  const handleAgentSessionSocketMessage = useCallback((data: string) => {
    const frame = parseAgentSessionFrame(data);
    if (!frame) {
      appendAgentSessionDebugEntry({
        eventType: "raw",
        content: data,
      });
      processAgentSessionChunk(data);
      return;
    }

    if (frame.eventType === "debug") {
      if (typeof frame.chunk === "string") {
        appendAgentSessionDebugEntry({
          eventType: "debug",
          emittedAt: frame.emittedAt,
          content: frame.chunk,
        });
        appendAgentSessionOutput(frame.chunk);
        trackAgentTimingFromDebug(frame.chunk, frame.emittedAt);
      }
      return;
    }

    if (frame.eventType === "message" && frame.message) {
      appendAgentSessionDebugEntry({
        eventType: "message",
        role: frame.message.role,
        emittedAt: frame.message.emittedAt,
        content: frame.message.content,
      });
      appendStructuredAgentSessionMessage(frame.message);
      return;
    }

    processAgentSessionChunk(data);
  }, [appendAgentSessionDebugEntry, appendAgentSessionOutput, appendStructuredAgentSessionMessage, processAgentSessionChunk, trackAgentTimingFromDebug]);

  const normalizeAgentSessionMessage = useCallback((rawInput: string) => {
    const normalizedLines = rawInput
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    return normalizedLines.join(" ").trim();
  }, []);

  const markAgentInteractionResolved = useCallback((messageId?: string, note?: string) => {
    if (!messageId) {
      return;
    }
    setAgentChatMessages((current) => current.map((item) => (
      item.id === messageId
        ? {
          ...item,
          interactionResolved: true,
          interactionResolvedNote: note ?? item.interactionResolvedNote,
        }
        : item
    )));
  }, []);

  const sendNormalizedAgentMessage = useCallback((
    normalizedMessage: string,
    options?: {
      displayText?: string;
      resolveInteractionMessageId?: string;
      resolvedInteractionNote?: string;
    }
  ) => {
    const socket = agentSessionSocketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }
    const parsedCoreFields = parseAgentSessionCoreFields(normalizedMessage);
    if (parsedCoreFields) {
      setAgentSessionCoreFields(parsedCoreFields);
    }
    finalizePendingAssistantMessage();
    const sentAt = new Date().toISOString();
    const userMessageId = appendAgentChatMessage(
      "user",
      options?.displayText ?? formatAgentMessageForDisplay(normalizedMessage),
      false,
      { createdAt: sentAt }
    );
    const placeholderAssistantMessageId = appendPendingAssistantPlaceholder(sentAt);
    if (userMessageId) {
      agentTurnQueueRef.current.push({
        userMessageId,
        userSentAt: sentAt,
        startedAtMs: getAgentTimingNow(),
        placeholderAssistantMessageId,
        llmRequestCount: 0,
        modelDurationMs: 0,
      });
    }
    markAgentInteractionResolved(
      options?.resolveInteractionMessageId,
      options?.resolvedInteractionNote ?? getAgentInteractionResolvedNote(normalizedMessage)
    );
    socket.send(`${normalizedMessage}\n`);
    return true;
  }, [appendAgentChatMessage, appendPendingAssistantPlaceholder, finalizePendingAssistantMessage, formatAgentMessageForDisplay, markAgentInteractionResolved]);

  const buildAgentStarterMessage = useCallback(() => {
    const scriptContent = agentSessionStarterDraft.scriptContent.trim();
    const targetAudience = agentSessionStarterDraft.targetAudience.trim();
    const expectedEpisodeCount = agentSessionStarterDraft.expectedEpisodeCount.trim();

    if (!scriptContent || !targetAudience || !expectedEpisodeCount) {
      return "";
    }

    return [
      `script_type=${agentSessionStarterDraft.scriptType}`,
      `script_content=${scriptContent}`,
      `target_audience=${targetAudience}`,
      `expected_episode_count=${expectedEpisodeCount}`,
    ].join("\n");
  }, [agentSessionStarterDraft]);

  const getAgentSessionCoreFields = useCallback((): AgentSessionCoreFields | undefined => {
    return parseAgentSessionCoreFields(buildAgentStarterMessage()) ?? agentSessionCoreFields;
  }, [agentSessionCoreFields, buildAgentStarterMessage]);

  const enrichAgentInteractionMessage = useCallback((rawInput: string) => {
    const normalizedInput = normalizeAgentSessionMessage(rawInput);
    if (!normalizedInput) {
      return "";
    }
    const parsedInteraction = parseAgentInteractionPayload(normalizedInput);
    if (!parsedInteraction?.interactionAction) {
      return normalizedInput;
    }
    const payloadCoreFields = parseAgentSessionCoreFields(normalizedInput);
    const sessionCoreFields = getAgentSessionCoreFields();
    const mergedCoreFields = {
      scriptType: !isAgentSessionPlaceholderValue(payloadCoreFields?.scriptType) ? payloadCoreFields?.scriptType : sessionCoreFields?.scriptType,
      scriptContent: !isAgentSessionPlaceholderValue(payloadCoreFields?.scriptContent) ? payloadCoreFields?.scriptContent : sessionCoreFields?.scriptContent,
      targetAudience: !isAgentSessionPlaceholderValue(payloadCoreFields?.targetAudience) ? payloadCoreFields?.targetAudience : sessionCoreFields?.targetAudience,
      expectedEpisodeCount: !isAgentSessionPlaceholderValue(payloadCoreFields?.expectedEpisodeCount) ? payloadCoreFields?.expectedEpisodeCount : sessionCoreFields?.expectedEpisodeCount,
    };
    const payloadLines = [
      `interaction_action=${parsedInteraction.interactionAction}`,
      parsedInteraction.stateId ? `stateId=${parsedInteraction.stateId}` : "",
      mergedCoreFields.scriptType ? `script_type=${mergedCoreFields.scriptType}` : "",
      mergedCoreFields.scriptContent ? `script_content=${mergedCoreFields.scriptContent}` : "",
      mergedCoreFields.targetAudience ? `target_audience=${mergedCoreFields.targetAudience}` : "",
      mergedCoreFields.expectedEpisodeCount ? `expected_episode_count=${mergedCoreFields.expectedEpisodeCount}` : "",
      parsedInteraction.feedback ? `step_feedback=${parsedInteraction.feedback}` : "",
    ].filter((line) => line.length > 0);
    return normalizeAgentSessionMessage(payloadLines.join("\n"));
  }, [getAgentSessionCoreFields, normalizeAgentSessionMessage]);

  const buildAgentSessionWebSocketUrl = useCallback((instanceId: string, agentId?: string) => {
    const apiBase = appConfig.controlApiBaseUrl;
    const query = [
      `instanceId=${encodeURIComponent(instanceId)}`,
      agentId ? `agentId=${encodeURIComponent(agentId)}` : "",
    ].filter((item) => item.length > 0).join("&");

    if (apiBase.startsWith("http://") || apiBase.startsWith("https://")) {
      const wsBase = apiBase.replace(/^http/i, "ws").replace(/\/$/, "");
      return `${wsBase}/v1/agent-session/ws?${query}`;
    }

    const normalizedApiBase = apiBase.startsWith("/") ? apiBase : `/${apiBase}`;
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    return `${protocol}://${window.location.host}${normalizedApiBase}/v1/agent-session/ws?${query}`;
  }, []);

  const disconnectAgentSession = useCallback(() => {
    const socket = agentSessionSocketRef.current;
    agentSessionSocketRef.current = null;
    if (socket) {
      agentSessionSuppressCloseMessageRef.current = true;
      socket.close();
    }
    setAgentSessionConnecting(false);
    setAgentSessionConnected(false);
    setAgentComposerInteractionDraft(undefined);
    setAgentMessageInput("");
    setAgentSessionCoreFields(undefined);
    agentTurnQueueRef.current = [];
    finalizePendingAssistantMessage();
  }, [finalizePendingAssistantMessage]);

  const connectAgentSession = useCallback(() => {
    if (!selectedInstance) {
      return;
    }
    if (selectedInstance.status !== "RUNNING") {
      messageApi.warning(uiText.agentSessionNotRunning);
      return;
    }
    if (agentSessionRequiresDirectAgent && !agentSessionTargetAgentId) {
      messageApi.warning(agents.length === 0 ? uiText.agentSessionNoAgentsAvailable : uiText.agentSessionSelectAgentRequired);
      return;
    }

    disconnectAgentSession();
    setAgentSessionOutput("");
    setAgentChatMessages([]);
    setAgentComposerInteractionDraft(undefined);
    setAgentMessageInput("");
    setAgentSessionDebugVisible(false);
    setAgentSessionDebugEntries([]);
    agentSessionLineBufferRef.current = "";
    agentPendingAssistantMessageIdRef.current = null;
    agentTurnQueueRef.current = [];
    agentSessionDebugEntrySeqRef.current = 0;
    setAgentSessionConnecting(true);

    const socket = new WebSocket(buildAgentSessionWebSocketUrl(selectedInstance.id, agentSessionTargetAgentId));
    agentSessionSocketRef.current = socket;

    socket.onopen = () => {
      setAgentSessionConnecting(false);
      setAgentSessionConnected(true);
      messageApi.success(uiText.agentSessionConnected);
      const queuedMessage = agentQueuedMessageRef.current;
      if (queuedMessage) {
        agentQueuedMessageRef.current = null;
        sendNormalizedAgentMessage(queuedMessage);
      }
    };

    socket.onmessage = (event) => {
      if (typeof event.data === "string") {
        handleAgentSessionSocketMessage(event.data);
      }
    };

    socket.onerror = () => {
      messageApi.error(uiText.agentSessionConnectFailed);
    };

    socket.onclose = () => {
      if (agentSessionLineBufferRef.current.trim()) {
        processAgentSessionLine(agentSessionLineBufferRef.current);
        agentSessionLineBufferRef.current = "";
      }
      finalizePendingAssistantMessage();
      agentSessionSocketRef.current = null;
      agentTurnQueueRef.current = [];
      setAgentSessionConnecting(false);
      setAgentSessionConnected(false);
      const suppressCloseMessage = agentSessionSuppressCloseMessageRef.current;
      agentSessionSuppressCloseMessageRef.current = false;
      if (!suppressCloseMessage) {
        appendAgentChatMessage("system", uiText.agentSessionDisconnected);
      }
    };
  }, [
    appendAgentChatMessage,
    buildAgentSessionWebSocketUrl,
    disconnectAgentSession,
    finalizePendingAssistantMessage,
    handleAgentSessionSocketMessage,
    messageApi,
    agentSessionRequiresDirectAgent,
    agentSessionTargetAgentId,
    agents.length,
    processAgentSessionLine,
    selectedInstance,
    sendNormalizedAgentMessage,
  ]);

  const sendAgentMessage = useCallback(() => {
    if (!agentSessionConnected) {
      messageApi.warning(uiText.agentSessionConnectFailed);
      return;
    }
    const trimmedInput = agentMessageInput.trim();
    if (!trimmedInput) {
      return;
    }

    let normalizedMessage = normalizeAgentSessionMessage(agentMessageInput);
    let displayText: string | undefined;
    let resolveInteractionMessageId: string | undefined;

    if (agentComposerInteractionDraft?.interactionAction === "revise") {
      const feedback = trimmedInput;
      const payloadLines = [
        `interaction_action=revise`,
        agentComposerInteractionDraft.stateId ? `stateId=${agentComposerInteractionDraft.stateId}` : "",
        `step_feedback=${feedback}`,
      ].filter((line) => line.length > 0);
      normalizedMessage = enrichAgentInteractionMessage(payloadLines.join("\n"));
      displayText = formatAgentInteractionPayloadForDisplay(normalizedMessage);
      resolveInteractionMessageId = agentComposerInteractionDraft.sourceMessageId;
    }

    if (!normalizedMessage) {
      return;
    }
    const sent = sendNormalizedAgentMessage(normalizedMessage, {
      displayText,
      resolveInteractionMessageId,
    });
    if (!sent) {
      return;
    }
    setAgentMessageInput("");
    setAgentComposerInteractionDraft(undefined);
  }, [
    agentComposerInteractionDraft,
    agentMessageInput,
    agentSessionConnected,
    messageApi,
    normalizeAgentSessionMessage,
    enrichAgentInteractionMessage,
    sendNormalizedAgentMessage,
  ]);

  const handleAgentMessageInputKeyDown = useCallback((event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }
    if (event.nativeEvent.isComposing || agentMessageComposingRef.current) {
      return;
    }
    event.preventDefault();
    if (disableSendAgentMessage || agentSessionInputLocked) {
      return;
    }
    sendAgentMessage();
  }, [agentSessionInputLocked, disableSendAgentMessage, sendAgentMessage]);

  const handleAgentMessageCompositionStart = useCallback(() => {
    agentMessageComposingRef.current = true;
  }, []);

  const handleAgentMessageCompositionEnd = useCallback(() => {
    agentMessageComposingRef.current = false;
  }, []);

  const sendAgentStarterMessage = useCallback(() => {
    const starterMessage = buildAgentStarterMessage();
    if (!starterMessage) {
      messageApi.warning(uiText.agentSessionNeedStarterFields);
      return;
    }
    if (!agentSessionConnected) {
      messageApi.warning(uiText.agentSessionConnectFirst);
      return;
    }
    if (agentSessionRequiresDirectAgent && !agentSessionTargetAgentId) {
      messageApi.warning(agents.length === 0 ? uiText.agentSessionNoAgentsAvailable : uiText.agentSessionSelectAgentRequired);
      return;
    }
    sendNormalizedAgentMessage(normalizeAgentSessionMessage(starterMessage));
  }, [
    agentSessionConnected,
    agentSessionTargetAgentId,
    agentSessionRequiresDirectAgent,
    agents.length,
    buildAgentStarterMessage,
    messageApi,
    normalizeAgentSessionMessage,
    sendNormalizedAgentMessage,
  ]);

  const runAgentInteractionAction = useCallback((messageId: string, action: AgentInteractionAction) => {
    if (action.kind === "send") {
      if (!agentSessionConnected) {
        messageApi.warning(uiText.agentSessionConnectFailed);
        return;
      }
      const normalizedPayload = enrichAgentInteractionMessage(action.payload);
      if (!normalizedPayload) {
        return;
      }
      const sent = sendNormalizedAgentMessage(normalizedPayload, {
        resolveInteractionMessageId: messageId,
      });
      if (sent) {
        setAgentComposerInteractionDraft(undefined);
      }
      return;
    }
    const parsedPayload = parseAgentInteractionPayload(action.payload);
    if (parsedPayload?.interactionAction === "revise") {
      setAgentComposerInteractionDraft({
        sourceMessageId: messageId,
        interactionAction: parsedPayload.interactionAction,
        stateId: parsedPayload.stateId,
      });
      setAgentMessageInput(parsedPayload.feedback ?? "");
      return;
    }
    if (action.payload.includes("interaction_action=")) {
      setAgentComposerInteractionDraft({
        sourceMessageId: messageId,
        interactionAction: parsedPayload?.interactionAction ?? "revise",
        stateId: parsedPayload?.stateId,
      });
      setAgentMessageInput(parsedPayload?.feedback ?? "");
      return;
    }
    setAgentComposerInteractionDraft(undefined);
    setAgentMessageInput(action.payload);
  }, [agentSessionConnected, enrichAgentInteractionMessage, messageApi, sendNormalizedAgentMessage]);

  const buildTerminalWebSocketUrl = useCallback((instanceId: string) => {
    const apiBase = appConfig.controlApiBaseUrl;
    const query = `instanceId=${encodeURIComponent(instanceId)}`;

    if (apiBase.startsWith("http://") || apiBase.startsWith("https://")) {
      const wsBase = apiBase.replace(/^http/i, "ws").replace(/\/$/, "");
      return `${wsBase}/v1/terminal/ws?${query}`;
    }

    const normalizedApiBase = apiBase.startsWith("/") ? apiBase : `/${apiBase}`;
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    return `${protocol}://${window.location.host}${normalizedApiBase}/v1/terminal/ws?${query}`;
  }, []);

  const disconnectTerminal = useCallback(() => {
    const socket = terminalSocketRef.current;
    terminalSocketRef.current = null;
    if (socket) {
      socket.close();
    }
    setTerminalConnecting(false);
    setTerminalConnected(false);
  }, []);

  const connectTerminal = useCallback(() => {
    if (!selectedInstance) {
      return;
    }
    if (selectedInstance.status !== "RUNNING") {
      messageApi.warning(uiText.terminalNotRunning);
      return;
    }

    disconnectTerminal();
    setTerminalOutput("");
    setTerminalCommand("");
    setTerminalConnecting(true);

    const socket = new WebSocket(buildTerminalWebSocketUrl(selectedInstance.id));
    terminalSocketRef.current = socket;

    socket.onopen = () => {
      setTerminalConnecting(false);
      setTerminalConnected(true);
      messageApi.success(uiText.terminalConnected);
    };

    socket.onmessage = (event) => {
      if (typeof event.data === "string") {
        appendTerminalOutput(event.data);
      }
    };

    socket.onerror = () => {
      messageApi.error(uiText.terminalConnectFailed);
    };

    socket.onclose = () => {
      terminalSocketRef.current = null;
      setTerminalConnecting(false);
      setTerminalConnected(false);
      appendTerminalOutput(`[system] ${uiText.terminalDisconnected}\n`);
    };
  }, [appendTerminalOutput, buildTerminalWebSocketUrl, disconnectTerminal, messageApi, selectedInstance]);

  const sendTerminalCommand = useCallback(() => {
    const socket = terminalSocketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      messageApi.warning(uiText.terminalConnectFailed);
      return;
    }
    if (!terminalCommand.trim()) {
      return;
    }
    appendTerminalOutput(`[you] ${terminalCommand}\n`);
    socket.send(`${terminalCommand}\n`);
    setTerminalCommand("");
  }, [appendTerminalOutput, messageApi, terminalCommand]);

  const openVisualUi = useCallback(() => {
    if (!selectedGatewayUrl) {
      return;
    }
    window.open(selectedGatewayUrl, "_blank", "noopener,noreferrer");
  }, [selectedGatewayUrl]);

  const openPairingCodeModal = useCallback(() => {
    if (!selectedInstance) {
      return;
    }
    void fetchAndShowPairingCode(selectedInstance.id, selectedInstance.name);
  }, [fetchAndShowPairingCode, selectedInstance]);

  const openInstanceDetail = useCallback((instanceId: string) => {
    setSelectedInstanceId(instanceId);
    setActiveView("instance-detail");
    setInstanceDetailTab("claw");
  }, []);

  const openMenuView = useCallback((view: Exclude<ConsoleView, "instance-detail">) => {
    setActiveView(view);
    if (view === "instances") {
      setInstanceDetailTab("claw");
    }
  }, []);

  return (
    <>
      {messageContext}
      <div className="ai-console">
        <div className="mx-auto w-full max-w-[1680px]">
          <div className={`console-shell ${sidebarCollapsed ? "is-collapsed" : ""}`}>
            <aside className="console-sidebar">
              <div className="sidebar-head">
                <Button
                  type="text"
                  className="sidebar-toggle"
                  title={sidebarCollapsed ? uiText.menuExpand : uiText.menuCollapse}
                  onClick={() => setSidebarCollapsed((value) => !value)}
                  icon={sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                />
                {!sidebarCollapsed ? <span className="sidebar-title">Console</span> : null}
              </div>
              <nav className="sidebar-nav">
                <button
                  type="button"
                  className={`sidebar-item ${activeMenuView === "instances" ? "is-active" : ""}`}
                  onClick={() => openMenuView("instances")}
                  title={uiText.menuInstances}
                >
                  <Server size={16} />
                  {!sidebarCollapsed ? <span>{uiText.menuInstances}</span> : null}
                </button>
                <button
                  type="button"
                  className={`sidebar-item ${activeMenuView === "agents" ? "is-active" : ""}`}
                  onClick={() => openMenuView("agents")}
                  title={uiText.menuAgents}
                >
                  <Bot size={16} />
                  {!sidebarCollapsed ? <span>{uiText.menuAgents}</span> : null}
                </button>
                <button
                  type="button"
                  className={`sidebar-item ${activeMenuView === "skills" ? "is-active" : ""}`}
                  onClick={() => openMenuView("skills")}
                  title={uiText.menuSkills}
                >
                  <Wrench size={16} />
                  {!sidebarCollapsed ? <span>{uiText.menuSkills}</span> : null}
                </button>
              </nav>
            </aside>
            <div className="console-main">
              <Layout className="ai-layout" style={{ minHeight: "100vh" }}>
            <Header className="console-header">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div className="space-y-1">
                  <p className="console-kicker">AI Runtime Control</p>
                  <Title level={3} style={{ margin: 0 }}>
                    {uiText.pageTitle}
                  </Title>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="default">shadcn/ui</Badge>
                  <Badge variant="neutral">Tailwind CSS</Badge>
                  <Badge variant="warning">Next.js 15</Badge>
                </div>
              </div>
              <p className="console-subtitle">UI layer refreshed with modern AI-console visual style.</p>
            </Header>
            <Content className="console-content">
              <Space direction="vertical" style={{ width: "100%" }} size="large">
                {activeView === "instances" ? (
                  <>
                    <div className="kpi-grid">
                      <ShadCard>
                        <ShadCardHeader>
                          <ShadCardTitle>{uiText.totalInstances}</ShadCardTitle>
                        </ShadCardHeader>
                        <ShadCardContent className="text-3xl font-semibold text-slate-900">
                          {dashboardStats.total}
                        </ShadCardContent>
                      </ShadCard>
                      <ShadCard>
                        <ShadCardHeader>
                          <ShadCardTitle>{uiText.runningInstances}</ShadCardTitle>
                        </ShadCardHeader>
                        <ShadCardContent className="text-3xl font-semibold text-emerald-700">
                          {dashboardStats.running}
                        </ShadCardContent>
                      </ShadCard>
                      <ShadCard>
                        <ShadCardHeader>
                          <ShadCardTitle>{uiText.stoppedInstances}</ShadCardTitle>
                        </ShadCardHeader>
                        <ShadCardContent className="text-3xl font-semibold text-slate-600">
                          {dashboardStats.stopped}
                        </ShadCardContent>
                      </ShadCard>
                      <ShadCard>
                        <ShadCardHeader>
                          <ShadCardTitle>{uiText.errorInstances}</ShadCardTitle>
                        </ShadCardHeader>
                        <ShadCardContent className="text-3xl font-semibold text-red-600">
                          {dashboardStats.errorCount}
                        </ShadCardContent>
                      </ShadCard>
                    </div>
                    <Card
                      className="glass-card"
                      title={uiText.listTitle}
                      extra={(
                        <Space>
                          <Button loading={loadingInstances} onClick={() => void loadInstances()}>{uiText.refresh}</Button>
                          <Button type="primary" onClick={openCreateModal}>
                            {uiText.create}
                          </Button>
                        </Space>
                      )}
                    >
                      {error ? <Alert type="error" message={error} showIcon style={{ marginBottom: 12 }} /> : null}
                      <Text type="secondary">{uiText.listSubtitle}</Text>
                      {loadingInstances ? (
                        <div className="empty-panel">{uiText.loadingInstances}</div>
                      ) : instances.length === 0 ? (
                        <div className="empty-panel">{uiText.noInstances}</div>
                      ) : (
                        <div className="instance-card-grid">
                          {instances.map((instance) => {
                            const isSelected = selectedInstanceId === instance.id;
                            const gatewayUrl = resolveUiControllerUrl(instance) ?? uiText.gatewayUrlUnavailable;
                            return (
                              <button
                                key={instance.id}
                                type="button"
                                className={`instance-card ${isSelected ? "is-selected" : ""}`}
                                onClick={() => openInstanceDetail(instance.id)}
                              >
                                <div className="instance-card-head">
                                  <strong>{instance.name}</strong>
                                  <Tag color={statusColor(instance.status)}>{instance.status}</Tag>
                                </div>
                                <p className="instance-card-line">{instance.image}</p>
                                <p className="instance-card-line">{gatewayUrl}</p>
                                <div className="instance-card-foot">
                                  <span
                                    onClick={(event) => event.stopPropagation()}
                                    onMouseDown={(event) => event.stopPropagation()}
                                  >
                                    <Text
                                      copyable={{
                                        text: instance.id,
                                        onCopy: () => messageApi.success(uiText.instanceIdCopied),
                                      }}
                                      title={instance.id}
                                    >
                                      {shortInstanceId(instance.id)}
                                    </Text>
                                  </span>
                                  <span>{instance.updatedAt}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </Card>
                  </>
                ) : null}

                {activeView === "instance-detail" ? (
                  <Space direction="vertical" style={{ width: "100%" }} size="middle">
                    <Button icon={<ArrowLeft size={14} />} className="back-button" onClick={() => openMenuView("instances")}>
                      {uiText.backToInstances}
                    </Button>
                    <Card className="glass-card" title={selectedInstance ? `${uiText.instanceDetailTitle}：${selectedInstance.name}` : uiText.selectInstance}>
              {selectedInstance ? (
                <Space direction="vertical" style={{ width: "100%" }} size="middle">
                  <Descriptions column={2} bordered size="small">
                    <Descriptions.Item label={uiText.instanceId}>
                      <Text
                        code
                        copyable={{
                          text: selectedInstance.id,
                          onCopy: () => messageApi.success(uiText.instanceIdCopied),
                        }}
                      >
                        {selectedInstance.id}
                      </Text>
                    </Descriptions.Item>
                    <Descriptions.Item label={uiText.hostId}>{selectedInstance.hostId}</Descriptions.Item>
                    <Descriptions.Item label={uiText.image}>{selectedInstance.image}</Descriptions.Item>
                    <Descriptions.Item label={uiText.gatewayHostPort}>
                      {selectedInstance.gatewayHostPort ?? uiText.gatewayUrlUnavailable}
                    </Descriptions.Item>
                    <Descriptions.Item label={uiText.gatewayUrl} span={2}>
                      {selectedGatewayUrl ?? uiText.gatewayUrlUnavailable}
                    </Descriptions.Item>
                    <Descriptions.Item label={uiText.currentStatus}>
                      <Tag color={statusColor(selectedInstance.status)}>{selectedInstance.status}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label={uiText.desiredState}>{selectedInstance.desiredState}</Descriptions.Item>
                    <Descriptions.Item label={uiText.createdAt}>{selectedInstance.createdAt}</Descriptions.Item>
                    <Descriptions.Item label={uiText.updatedAt}>{selectedInstance.updatedAt}</Descriptions.Item>
                  </Descriptions>
                  <Space>
                    <Button
                      type="primary"
                      loading={submittingAction}
                      disabled={disableStart}
                      onClick={() => void handleAction("START")}
                    >
                      {uiText.start}
                    </Button>
                    <Button
                      loading={submittingAction}
                      disabled={disableStop}
                      onClick={() => handleSensitiveAction("STOP")}
                    >
                      {uiText.stop}
                    </Button>
                    <Button
                      loading={submittingAction}
                      disabled={disableRestartInstance}
                      onClick={() => handleSensitiveAction("RESTART")}
                    >
                      {uiText.restartInstance}
                    </Button>
                    <Button
                      danger
                      loading={submittingAction}
                      disabled={disableRollback}
                      onClick={() => handleSensitiveAction("ROLLBACK")}
                    >
                      {uiText.rollback}
                    </Button>
                    <Button danger loading={deletingInstance} disabled={disableDelete} onClick={openDeleteModal}>
                      {uiText.delete}
                    </Button>
                    <Button type="primary" disabled={disableRemoteConnect} onClick={openRemoteModal}>
                      {uiText.remoteConnect}
                    </Button>
                    <Button loading={pairingCodeLoading} disabled={!selectedInstance} onClick={openPairingCodeModal}>
                      {uiText.fetchPairingCode}
                    </Button>
                    <Button type="primary" onClick={openVisualUi} disabled={!selectedGatewayUrl}>
                      {uiText.openVisualUi}
                    </Button>
                  </Space>
                  <Card
                    className="sub-glass-card"
                    size="small"
                  >
                    <Tabs
                      activeKey={instanceDetailTab}
                      onChange={(key) => setInstanceDetailTab(key as InstanceDetailTabKey)}
                      items={[
                        {
                          key: "claw",
                          label: uiText.tabClaw,
                          children: (
                            <Space direction="vertical" style={{ width: "100%" }} size="middle">
                              <Card
                                className="sub-glass-card"
                                size="small"
                                title={uiText.mainAgentGuidanceTitle}
                                extra={(
                                  <Space>
                                    <Button
                                      loading={mainAgentGuidanceLoading}
                                      onClick={() => void loadMainAgentGuidance(selectedInstance.id)}
                                    >
                                      {uiText.mainAgentGuidanceRefresh}
                                    </Button>
                                    <Button
                                      disabled={mainAgentGuidanceEditing}
                                      onClick={() => setMainAgentGuidanceCollapsed((current) => !current)}
                                    >
                                      {mainAgentGuidanceCollapsed ? uiText.mainAgentGuidanceExpand : uiText.mainAgentGuidanceCollapse}
                                    </Button>
                                    {!mainAgentGuidanceCollapsed && mainAgentGuidanceEditing ? (
                                      <>
                                        <Button
                                          type="primary"
                                          loading={mainAgentGuidanceSaving}
                                          disabled={mainAgentGuidanceLoading || mainAgentGuidanceDeleting || !mainAgentGuidanceDirty}
                                          onClick={async () => {
                                            const saved = await saveMainAgentGuidance();
                                            if (saved) {
                                              setMainAgentGuidanceEditing(false);
                                            }
                                          }}
                                        >
                                          {uiText.mainAgentGuidanceSave}
                                        </Button>
                                        <Button
                                          disabled={mainAgentGuidanceLoading || mainAgentGuidanceSaving || mainAgentGuidanceDeleting}
                                          onClick={cancelMainAgentGuidanceEdit}
                                        >
                                          {uiText.mainAgentGuidanceCancel}
                                        </Button>
                                      </>
                                    ) : null}
                                    {!mainAgentGuidanceCollapsed && !mainAgentGuidanceEditing ? (
                                      <>
                                        <Button
                                          disabled={mainAgentGuidanceLoading || mainAgentGuidanceSaving || mainAgentGuidanceDeleting}
                                          onClick={() => setMainAgentGuidanceEditing(true)}
                                        >
                                          {uiText.mainAgentGuidanceEdit}
                                        </Button>
                                        <Button
                                          danger
                                          loading={mainAgentGuidanceDeleting}
                                          disabled={mainAgentGuidanceLoading || mainAgentGuidanceSaving || !mainAgentGuidance?.overrideExists}
                                          onClick={() => void removeMainAgentGuidanceOverride()}
                                        >
                                          {uiText.mainAgentGuidanceDelete}
                                        </Button>
                                      </>
                                    ) : null}
                                  </Space>
                                )}
                              >
                                {mainAgentGuidanceCollapsed ? (
                                  <Text type="secondary">默认收起，展开后可查看或编辑当前主 Agent 提示词。</Text>
                                ) : (
                                  <Space direction="vertical" style={{ width: "100%" }} size="middle">
                                    {mainAgentGuidanceError ? <Alert type="error" showIcon message={mainAgentGuidanceError} /> : null}
                                    <Descriptions column={1} size="small" bordered>
                                      <Descriptions.Item label={uiText.mainAgentGuidanceSource}>
                                        {mainAgentGuidance?.source ?? "-"}
                                      </Descriptions.Item>
                                      <Descriptions.Item label={uiText.mainAgentGuidanceWorkspacePath}>
                                        <Text code copyable={mainAgentGuidance?.workspacePath ? { text: mainAgentGuidance.workspacePath } : false}>
                                          {mainAgentGuidance?.workspacePath ?? "-"}
                                        </Text>
                                      </Descriptions.Item>
                                      <Descriptions.Item label={uiText.mainAgentGuidanceGlobalPath}>
                                        {mainAgentGuidance?.globalDefaultPath ? (
                                          <Text code copyable={{ text: mainAgentGuidance.globalDefaultPath }}>
                                            {mainAgentGuidance.globalDefaultPath}
                                          </Text>
                                        ) : "-"}
                                      </Descriptions.Item>
                                      <Descriptions.Item label={uiText.mainAgentGuidanceOverwriteOnStart}>
                                        {typeof mainAgentGuidance?.overwriteOnStart === "boolean"
                                          ? String(mainAgentGuidance.overwriteOnStart)
                                          : "-"}
                                      </Descriptions.Item>
                                    </Descriptions>
                                    {mainAgentGuidanceEditing ? (
                                      <>
                                        <Space align="center" style={{ width: "100%", justifyContent: "space-between" }}>
                                          <Text>{uiText.mainAgentGuidanceOverrideEnabled}</Text>
                                          <Switch
                                            checked={mainAgentOverrideEnabledDraft}
                                            onChange={setMainAgentOverrideEnabledDraft}
                                            disabled={mainAgentGuidanceLoading || mainAgentGuidanceSaving || mainAgentGuidanceDeleting}
                                          />
                                        </Space>
                                        <Input.TextArea
                                          rows={8}
                                          value={mainAgentPromptDraft}
                                          onChange={(event) => setMainAgentPromptDraft(event.target.value)}
                                          placeholder={uiText.mainAgentGuidanceOverridePromptPlaceholder}
                                          disabled={mainAgentGuidanceLoading || mainAgentGuidanceSaving || mainAgentGuidanceDeleting}
                                        />
                                      </>
                                    ) : (
                                      <>
                                        <Text strong>{uiText.mainAgentGuidanceEffectivePrompt}</Text>
                                        {mainAgentGuidance?.effectivePrompt ? (
                                          <Paragraph style={{ marginBottom: 0 }}>
                                            <Text code style={{ whiteSpace: "pre-wrap" }}>
                                              {mainAgentGuidance.effectivePrompt}
                                            </Text>
                                          </Paragraph>
                                        ) : (
                                          <Text type="secondary">{uiText.mainAgentGuidanceNoEffectivePrompt}</Text>
                                        )}
                                      </>
                                    )}
                                  </Space>
                                )}
                              </Card>
                              <Card
                                className="sub-glass-card"
                                size="small"
                                title={uiText.agentChatTitle}
                              >
                                <Space direction="vertical" style={{ width: "100%" }} size="small">
                                  <Card size="small" className="agent-session-mode-card">
                                    <Space direction="vertical" style={{ width: "100%" }} size="small">
                                      <Text strong>{uiText.agentSessionRouteMode}</Text>
                                      <Segmented
                                        block
                                        className="agent-session-mode-switch"
                                        value={agentSessionMode}
                                        onChange={(value) => setAgentSessionMode(value as AgentSessionMode)}
                                        disabled={agentSessionConnected || agentSessionConnecting}
                                        options={[
                                          {
                                            label: (
                                              <div className="agent-session-mode-option">
                                                <div className="agent-session-mode-option-title">
                                                  <Bot size={15} />
                                                  <span>{uiText.agentSessionRouteModeAuto}</span>
                                                </div>
                                               </div>
                                            ),
                                            value: "auto",
                                          },
                                          {
                                            label: (
                                              <div className="agent-session-mode-option">
                                                <div className="agent-session-mode-option-title">
                                                  <Server size={15} />
                                                  <span>{uiText.agentSessionRouteModeDirect}</span>
                                                </div>
                                               </div>
                                            ),
                                            value: "direct",
                                          },
                                        ]}
                                      />
                                    </Space>
                                  </Card>
                                  <div className="agent-session-action-bar">
                                    <Space>
                                      <Button
                                        type="primary"
                                        loading={agentSessionConnecting}
                                        disabled={disableConnectAgentSession}
                                        onClick={connectAgentSession}
                                      >
                                        {uiText.agentSessionConnect}
                                      </Button>
                                      <Button disabled={!agentSessionConnected} onClick={disconnectAgentSession}>
                                        {uiText.agentSessionDisconnect}
                                      </Button>
                                    </Space>
                                  </div>
                                  {agentSessionRequiresDirectAgent ? (
                                    <Card size="small">
                                      <Space direction="vertical" style={{ width: "100%" }} size="small">
                                        <Text strong>{uiText.agentSessionCurrentAgent}</Text>
                                        <Select
                                          showSearch
                                          loading={agentsLoading}
                                          placeholder={uiText.selectAgent}
                                          value={selectedAgentId}
                                          onChange={setSelectedAgentId}
                                          disabled={agentSessionConnected || agentSessionConnecting}
                                          options={agents.map((item) => ({
                                            value: item.id,
                                            label: item.id,
                                          }))}
                                        />
                                        {selectedAgent ? (
                                          <Space size={[8, 8]} wrap>
                                            <Tag color="blue">{selectedAgent.id}</Tag>
                                            <Tag>{selectedAgent.provider ?? "-"}</Tag>
                                            <Tag>{selectedAgent.model ?? "-"}</Tag>
                                          </Space>
                                        ) : null}
                                      </Space>
                                    </Card>
                                  ) : null}
                                  <Card
                                    size="small"
                                    className={`agent-session-starter${agentSessionInputLocked ? " is-disabled" : ""}`}
                                    title={uiText.agentSessionStarterTitle}
                                  >
                                    <Space direction="vertical" style={{ width: "100%" }} size="small">
                                      <Text type="secondary">{uiText.agentSessionStarterHint}</Text>
                                      <div className="agent-session-starter-field">
                                        <Text strong>{uiText.agentSessionScriptType}</Text>
                                        <Select
                                          disabled={agentSessionInputLocked}
                                          value={agentSessionStarterDraft.scriptType}
                                          onChange={(value) => setAgentSessionStarterDraft((current) => ({
                                            ...current,
                                            scriptType: value,
                                          }))}
                                          options={[
                                            { value: "一句话剧本", label: "一句话剧本" },
                                            { value: "小说转剧本", label: "小说转剧本" },
                                          ]}
                                        />
                                      </div>
                                      <div className="agent-session-starter-field">
                                        <Text strong>{uiText.agentSessionScriptContent}</Text>
                                        <Input.TextArea
                                          disabled={agentSessionInputLocked}
                                          rows={4}
                                          value={agentSessionStarterDraft.scriptContent}
                                          onChange={(event) => setAgentSessionStarterDraft((current) => ({
                                            ...current,
                                            scriptContent: event.target.value,
                                          }))}
                                          placeholder={uiText.agentSessionStarterContentPlaceholder}
                                        />
                                      </div>
                                      <div className="agent-session-starter-grid">
                                        <div className="agent-session-starter-field">
                                          <Text strong>{uiText.agentSessionTargetAudience}</Text>
                                          <Input
                                            disabled={agentSessionInputLocked}
                                            value={agentSessionStarterDraft.targetAudience}
                                            onChange={(event) => setAgentSessionStarterDraft((current) => ({
                                              ...current,
                                              targetAudience: event.target.value,
                                            }))}
                                          />
                                        </div>
                                        <div className="agent-session-starter-field">
                                          <Text strong>{uiText.agentSessionEpisodeCount}</Text>
                                          <Input
                                            disabled={agentSessionInputLocked}
                                            value={agentSessionStarterDraft.expectedEpisodeCount}
                                            onChange={(event) => setAgentSessionStarterDraft((current) => ({
                                              ...current,
                                              expectedEpisodeCount: event.target.value,
                                            }))}
                                          />
                                        </div>
                                      </div>
                                      <div className="agent-sender-actions">
                                        <Button
                                          type="primary"
                                          loading={agentSessionConnecting}
                                          disabled={disableSendAgentStarter}
                                          onClick={sendAgentStarterMessage}
                                        >
                                          {uiText.agentSessionSendStarter}
                                        </Button>
                                      </div>
                                    </Space>
                                  </Card>
                                  <div className="agent-session-section-head">
                                    <Text strong>{uiText.agentSessionActiveSession}</Text>
                                    <Tag color={agentSessionConnected ? "cyan" : "default"}>
                                      {agentSessionConnected ? uiText.agentSessionConnectedHint : uiText.agentSessionIdleHint}
                                    </Tag>
                                  </div>
                                  <div
                                    ref={agentSessionOutputRef}
                                    className="agent-chat-thread"
                                    style={{
                                      height: "clamp(520px, 60vh, 760px)",
                                      overflowY: "auto",
                                      background: "#fff",
                                    }}
                                  >
                                    {agentChatMessages.length > 0 ? agentChatMessages.map((item) => {
                                      const thinkingVisible = item.role === "assistant"
                                        && item.pending
                                        && !item.content.trim()
                                        && Boolean(item.thinkingContent?.trim());
                                      const thinkingStateVisible = item.role === "assistant"
                                        && item.pending
                                        && !item.content.trim();
                                      const firstThinkingDurationLabel = formatAgentTimingDuration(item.timing?.firstThinkingDurationMs);
                                      const firstVisibleDurationLabel = formatAgentTimingDuration(item.timing?.firstVisibleDurationMs);
                                      const modelDurationLabel = formatAgentTimingDuration(item.timing?.modelDurationMs);
                                      const agentDurationLabel = formatAgentTimingDuration(item.timing?.agentDurationMs);
                                      const totalDurationLabel = formatAgentTimingDuration(item.timing?.totalDurationMs);
                                      const llmRequestCount = item.timing?.llmRequestCount ?? 0;
                                      const showTiming = item.role === "assistant" && (
                                        Boolean(firstThinkingDurationLabel)
                                        || Boolean(firstVisibleDurationLabel)
                                        || Boolean(modelDurationLabel)
                                        || Boolean(agentDurationLabel)
                                        || Boolean(totalDurationLabel)
                                        || llmRequestCount > 1
                                      );

                                      return (
                                        <div
                                          key={item.id}
                                          className={`agent-chat-item ${item.role === "user" ? "is-user" : item.role === "system" ? "is-system" : "is-assistant"}`}
                                        >
                                          <div className="agent-chat-bubble">
                                            <div className="agent-chat-head">
                                              <div className="agent-chat-role">
                                                {item.role === "user" ? "\u7528\u6237" : item.role === "system" ? "\u7cfb\u7edf" : "Agent"}
                                              </div>
                                              {item.role === "assistant" && item.content.trim() ? (
                                                <Button
                                                  type="text"
                                                  size="small"
                                                  className="agent-chat-copy-button"
                                                  onClick={() => void copyAgentChatContent(item.content)}
                                                >
                                                  {uiText.agentSessionCopyOutput}
                                                </Button>
                                              ) : null}
                                            </div>
                                            {thinkingStateVisible ? (
                                              <div className="agent-chat-thinking">
                                                <div className="agent-chat-thinking-head">
                                                  {"\u601d\u8003\u4e2d"}
                                                </div>
                                                <div className="agent-chat-thinking-content">
                                                  {thinkingVisible ? item.thinkingContent : "\u6b63\u5728\u6574\u7406\u601d\u8def..."}
                                                </div>
                                              </div>
                                            ) : null}
                                            {item.content.trim() ? (
                                              <div className="agent-chat-content">{item.content}</div>
                                            ) : null}
                                            {item.pending && !thinkingStateVisible ? <div className="agent-chat-pending">{uiText.agentSessionPendingReply}</div> : null}
                                            {showTiming ? (
                                              <div className="agent-chat-timing" title={formatAgentTimingTooltip(item.timing)}>
                                                {firstThinkingDurationLabel ? (
                                                  <span className="agent-chat-timing-pill">
                                                    <span className="agent-chat-timing-label">{"\u601d\u8003\u9996\u5b57"}</span>
                                                    <strong>{firstThinkingDurationLabel}</strong>
                                                  </span>
                                                ) : null}
                                                {firstVisibleDurationLabel ? (
                                                  <span className="agent-chat-timing-pill">
                                                    <span className="agent-chat-timing-label">{"\u6b63\u6587\u9996\u5b57"}</span>
                                                    <strong>{firstVisibleDurationLabel}</strong>
                                                  </span>
                                                ) : null}
                                                {modelDurationLabel ? (
                                                  <span className="agent-chat-timing-pill">
                                                    <span className="agent-chat-timing-label">{"\u6a21\u578b"}</span>
                                                    <strong>{modelDurationLabel}</strong>
                                                  </span>
                                                ) : null}
                                                {agentDurationLabel ? (
                                                  <span className="agent-chat-timing-pill">
                                                    <span className="agent-chat-timing-label">Agent</span>
                                                    <strong>{agentDurationLabel}</strong>
                                                  </span>
                                                ) : null}
                                                {totalDurationLabel ? (
                                                  <span className="agent-chat-timing-pill is-accent">
                                                    <span className="agent-chat-timing-label">{"\u603b\u8ba1"}</span>
                                                    <strong>{totalDurationLabel}</strong>
                                                  </span>
                                                ) : null}
                                                {llmRequestCount > 1 ? (
                                                  <span className="agent-chat-timing-pill is-muted">
                                                    {llmRequestCount}{"\u6b21\u6a21\u578b\u8c03\u7528"}
                                                  </span>
                                                ) : null}
                                              </div>
                                            ) : null}
                                            {item.id === pendingAgentApprovalMessageId && item.interaction?.actions.length ? (
                                              <div className="agent-chat-actions">
                                                {item.interaction.actions.map((action) => (
                                                  <Button
                                                    key={`${item.id}-${action.id}`}
                                                    type={action.kind === "send" ? "primary" : "default"}
                                                    onClick={() => runAgentInteractionAction(item.id, action)}
                                                    disabled={!agentSessionConnected}
                                                  >
                                                    {action.label}
                                                  </Button>
                                                ))}
                                              </div>
                                            ) : null}
                                            {item.role === "assistant" && item.interactionResolvedNote ? (
                                              <div className="agent-chat-resolution-hint">{item.interactionResolvedNote}</div>
                                            ) : null}
                                          </div>
                                        </div>
                                      );
                                    }) : (
                                      <Text type="secondary">{uiText.agentSessionConversationEmpty}</Text>
                                    )}
                                  </div>
                                  <div className={`agent-sender${agentSessionInputLocked ? " is-disabled" : ""}`}>
                                    {agentComposerInteractionDraft?.interactionAction === "revise" ? (
                                      <div className="agent-composer-mode">
                                        <div className="agent-composer-mode-copy">
                                          <div className="agent-composer-mode-title">
                                            {uiText.agentSessionReviseModeTitle}：{agentComposerDraftStateLabel}
                                          </div>
                                          <div className="agent-composer-mode-hint">{uiText.agentSessionReviseModeHint}</div>
                                        </div>
                                        <Button type="text" size="small" onClick={clearAgentComposerInteractionDraft}>
                                          {uiText.agentSessionReviseModeCancel}
                                        </Button>
                                      </div>
                                    ) : null}
                                    <Input.TextArea
                                      disabled={agentSessionInputLocked}
                                      rows={4}
                                      value={agentMessageInput}
                                      onChange={(event) => setAgentMessageInput(event.target.value)}
                                      onKeyDown={handleAgentMessageInputKeyDown}
                                      onCompositionStart={handleAgentMessageCompositionStart}
                                      onCompositionEnd={handleAgentMessageCompositionEnd}
                                      placeholder={agentMessageComposerPlaceholder}
                                      />
                                    <div className="agent-sender-actions">
                                      <Text type="secondary">{uiText.agentSessionComposerShortcutHint}</Text>
                                      <Space>
                                        <Button
                                          type="text"
                                          disabled={agentSessionInputLocked}
                                          onClick={() => setAgentSessionDebugVisible((current) => !current)}
                                        >
                                          {agentSessionDebugVisible ? uiText.agentSessionHideDebug : uiText.agentSessionShowDebug}
                                        </Button>
                                        <Button
                                          type="primary"
                                          disabled={disableSendAgentMessage}
                                          onClick={sendAgentMessage}
                                        >
                                          {uiText.sendAgentMessage}
                                        </Button>
                                      </Space>
                                    </div>
                                  </div>
                                  {agentSessionDebugVisible ? (
                                    <>
                                      <Text>{uiText.agentSessionDebugTitle}</Text>
                                      <div className="agent-debug-thread">
                                        {agentSessionDebugEntries.length > 0 ? agentSessionDebugEntries.map((entry) => (
                                          <div
                                            key={entry.id}
                                            className={`agent-debug-entry is-${entry.eventType}${entry.role ? ` role-${entry.role}` : ""}`}
                                          >
                                            <div className="agent-debug-meta">
                                              <Space size={8} wrap>
                                                <Tag color={entry.eventType === "debug" ? "gold" : entry.eventType === "message" ? "cyan" : "default"}>
                                                  {entry.eventType}
                                                </Tag>
                                                {entry.role ? (
                                                  <Tag color={entry.role === "assistant" ? "blue" : entry.role === "system" ? "default" : "green"}>
                                                    {entry.role}
                                                  </Tag>
                                                ) : null}
                                                {entry.emittedAt ? (
                                                  <Text type="secondary">{formatAgentSessionDebugTimestamp(entry.emittedAt)}</Text>
                                                ) : null}
                                              </Space>
                                            </div>
                                            <div className="agent-debug-content">{entry.content}</div>
                                          </div>
                                        )) : hasAgentSessionDebugData ? agentSessionRenderedLines.map((line, index) => (
                                          <div key={`${index}-${line ?? ""}`} className="agent-debug-entry is-raw">
                                            <div className="agent-debug-content">{line}</div>
                                          </div>
                                        )) : (
                                          <Text type="secondary">{uiText.agentSessionOutputPlaceholder}</Text>
                                        )}
                                      </div>
                                    </>
                                  ) : null}
                                </Space>
                              </Card>
                            </Space>
                          ),
                        },
                        {
                          key: "agents",
                          label: uiText.tabAgent,
                          children: (
                            <Space direction="vertical" style={{ width: "100%" }} size="middle">
                              <Button loading={agentsLoading} onClick={() => void loadAgents(selectedInstance.id)}>
                                {uiText.refreshAgents}
                              </Button>
                              {agentsError ? <Alert type="error" showIcon message={agentsError} /> : null}
                              {(!agentsLoading && agents.length === 0) ? (
                                <Text type="secondary">{uiText.noAgents}</Text>
                              ) : null}
                              <Select
                                showSearch
                                loading={agentsLoading}
                                placeholder={uiText.selectAgent}
                                value={selectedAgentId}
                                onChange={setSelectedAgentId}
                                options={agents.map((item) => ({
                                  value: item.id,
                                  label: item.id,
                                }))}
                              />
                              {selectedAgent ? (
                                <Descriptions column={1} size="small" bordered>
                                  <Descriptions.Item label={uiText.selectAgent}>{selectedAgent.id}</Descriptions.Item>
                                  <Descriptions.Item label={uiText.agentProvider}>{selectedAgent.provider ?? "-"}</Descriptions.Item>
                                  <Descriptions.Item label={uiText.agentModel}>{selectedAgent.model ?? "-"}</Descriptions.Item>
                                  <Descriptions.Item label={uiText.agenticMode}>
                                    {typeof selectedAgent.agentic === "boolean" ? String(selectedAgent.agentic) : "-"}
                                  </Descriptions.Item>
                                  <Descriptions.Item label={uiText.agentAllowedTools}>
                                    {selectedAgentAllowedTools.length > 0 ? selectedAgentAllowedTools.join(", ") : "-"}
                                  </Descriptions.Item>
                                </Descriptions>
                              ) : null}
                              {selectedAgent ? (
                                <Card
                                  className="sub-glass-card"
                                  size="small"
                                  title={uiText.agentSystemPromptTitle}
                                >
                                  <Space direction="vertical" style={{ width: "100%" }} size="small">
                                    <Descriptions column={1} size="small" bordered>
                                      <Descriptions.Item label={uiText.agentSystemPromptPath}>
                                        {selectedAgent.configPath ? (
                                          <Text code copyable={{ text: selectedAgent.configPath }}>{selectedAgent.configPath}</Text>
                                        ) : "-"}
                                      </Descriptions.Item>
                                    </Descriptions>
                                    <Text strong>{uiText.agentSystemPromptPreview}</Text>
                                    <Input.TextArea
                                      rows={8}
                                      value={selectedAgent.systemPrompt ?? ""}
                                      placeholder={uiText.agentSystemPromptPlaceholder}
                                      readOnly
                                    />
                                  </Space>
                                </Card>
                              ) : null}
                            </Space>
                          ),
                        },
                        {
                          key: "skills",
                          label: uiText.tabSkill,
                          children: (
                            <Space direction="vertical" style={{ width: "100%" }} size="middle">
                              <Button loading={skillsLoading} onClick={() => void loadSkills(selectedInstance.id)}>
                                {uiText.refreshSkills}
                              </Button>
                              {skillsError ? <Alert type="error" showIcon message={skillsError} /> : null}
                              <Alert type="info" showIcon message={uiText.skillScopeHint} />
                              {(!skillsLoading && skills.length === 0) ? (
                                <Text type="secondary">{uiText.noSkills}</Text>
                              ) : null}
                              {skills.length > 0 ? (
                                <>
                                  <Text type="secondary">{uiText.skillListHint}</Text>
                                  <div className="skill-card-grid">
                                    {skills.map((item) => {
                                      const selected = selectedSkillId === item.id;
                                      const allowed = selectedAgentAllowedTools.length === 0 || selectedAgentAllowedTools.includes(item.id);
                                      return (
                                        <button
                                          key={item.id}
                                          type="button"
                                          className={`skill-card ${selected ? "is-selected" : ""}`}
                                          onClick={() => setSelectedSkillId(item.id)}
                                        >
                                          <div className="skill-card-head">
                                            <strong className="skill-card-title">{item.id}</strong>
                                            <Tag color={allowed ? "green" : "orange"}>
                                              {allowed ? uiText.skillAllowed : uiText.skillNotAllowed}
                                            </Tag>
                                          </div>
                                          <p className="skill-card-path">{item.path}</p>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </>
                              ) : null}
                              {selectedSkill ? (
                                <Space direction="vertical" style={{ width: "100%" }} size="small">
                                  <Descriptions column={1} size="small" bordered>
                                    <Descriptions.Item label={uiText.selectSkill}>{selectedSkill.id}</Descriptions.Item>
                                    <Descriptions.Item label={uiText.skillPath}>
                                      <Text code copyable={{ text: selectedSkill.path }}>{selectedSkill.path}</Text>
                                    </Descriptions.Item>
                                  </Descriptions>
                                  {selectedSkillNotAllowed ? <Alert type="warning" showIcon message={uiText.agentSkillNotAllowed} /> : null}
                                  <Text strong>{uiText.skillPrompt}</Text>
                                  <Input.TextArea
                                    rows={10}
                                    readOnly
                                    value={selectedSkill.prompt}
                                  />
                                </Space>
                              ) : (
                                <Text type="secondary">{uiText.noSkillPrompt}</Text>
                              )}
                            </Space>
                          ),
                        },
                      ]}
                    />
                  </Card>
                </Space>
              ) : (
                <Text type="secondary">{uiText.selectInstanceFirst}</Text>
              )}
                    </Card>
                  </Space>
                ) : null}
                {activeView === "agents" ? (
                  <Card className="glass-card" title={uiText.menuAgents}>
                    <div className="empty-panel">{uiText.noAgentsSection}</div>
                  </Card>
                ) : null}
                {activeView === "skills" ? (
                  <Card className="glass-card" title={uiText.menuSkills}>
                    <div className="empty-panel">{uiText.noSkillsSection}</div>
                  </Card>
                ) : null}
              </Space>
            </Content>
              </Layout>
            </div>
          </div>
        </div>
      </div>
      <Modal
        title={uiText.createModalTitle}
        open={createModalOpen}
        onCancel={closeCreateModal}
        onOk={() => void handleCreateInstance()}
        okText={uiText.create}
        confirmLoading={creatingInstance}
      >
        <Form<CreateInstanceFormValues> form={createForm} layout="vertical">
          <Form.Item
            name="name"
            label={uiText.instanceName}
            rules={[
              { required: true, message: uiText.requiredName },
              {
                validator: (_, value) => {
                  if (typeof value !== "string") {
                    return Promise.resolve();
                  }
                  const normalized = value.trim().toLowerCase();
                  if (!normalized) {
                    return Promise.resolve();
                  }
                  const duplicated = instances.some((item) => item.name.trim().toLowerCase() === normalized);
                  if (duplicated) {
                    return Promise.reject(new Error(uiText.nameAlreadyExists));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input placeholder="zeroclaw-instance-01" />
          </Form.Item>
          <Alert type="info" showIcon message={`${uiText.fixedHostTipPrefix}${appConfig.defaultHostId}`} style={{ marginBottom: 16 }} />
          <Form.Item
            name="image"
            label={uiText.image}
            rules={[{ required: true, message: uiText.requiredImage }]}
          >
            <Select
              loading={loadingImages}
              options={images.map((item) => ({
                value: item.image,
                label: item.recommended ? `${item.name} (recommended) - ${item.image}` : `${item.name} - ${item.image}`,
              }))}
            />
          </Form.Item>
          {images.length === 0 && !loadingImages ? (
            <Alert type="warning" showIcon message={uiText.noPresetImage} />
          ) : null}
          <Form.Item name="desiredState" label={uiText.desiredState} initialValue="RUNNING">
            <Select
              options={[
                { value: "RUNNING", label: uiText.desiredStateRunning },
                { value: "STOPPED", label: uiText.desiredStateStopped },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={uiText.remoteConnectTitle}
        open={remoteModalOpen}
        onCancel={closeRemoteModal}
        width="min(1100px, 96vw)"
        styles={{ body: { maxHeight: "78vh", overflowY: "auto" } }}
        footer={[
          <Button key="cancel" onClick={closeRemoteModal}>
            {uiText.cancel}
          </Button>,
          <Button key="copy" type="primary" onClick={() => void copyRemoteConnectCommand()} disabled={!selectedRemoteConnectCommand}>
            {uiText.copyCommand}
          </Button>,
        ]}
        destroyOnHidden
      >
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Text type="secondary">{uiText.remoteConnectHint}</Text>
          <Text strong>{`${uiText.instanceName}: ${selectedInstance?.name ?? "-"}`}</Text>
          <Text strong>{uiText.remoteConnectCommand}</Text>
          {selectedRemoteConnectCommand ? (
            <Paragraph copyable={{ text: selectedRemoteConnectCommand }} style={{ marginBottom: 0 }}>
              <Text code>{selectedRemoteConnectCommand}</Text>
            </Paragraph>
          ) : (
            <Alert type="warning" showIcon message={uiText.remoteConnectUnavailable} />
          )}
          <Text strong>{uiText.webTerminal}</Text>
          <Space>
            <Button type="primary" loading={terminalConnecting} disabled={terminalConnected} onClick={connectTerminal}>
              {uiText.connectTerminal}
            </Button>
            <Button disabled={!terminalConnected} onClick={disconnectTerminal}>
              {uiText.disconnectTerminal}
            </Button>
          </Space>
          <Text>{uiText.terminalOutput}</Text>
          <div
            ref={terminalOutputRef}
            style={{
              border: "1px solid #d9d9d9",
              borderRadius: 6,
              padding: 12,
              height: 360,
              overflowY: "auto",
              background: "#fff",
              fontFamily: "monospace",
              fontSize: 13,
            }}
          >
            {terminalRenderedLines.map((line, index) => {
              const normalizedLine = line ?? "";
              const isSystemLine = normalizedLine.startsWith("[system]");
              const isUserLine = normalizedLine.startsWith("[you]");
              const color = isUserLine ? "#1677ff" : isSystemLine ? "#8c8c8c" : "#111111";
              return (
                <div key={`${index}-${normalizedLine}`} style={{ whiteSpace: "pre-wrap", color }}>
                  {normalizedLine}
                </div>
              );
            })}
          </div>
          <Space.Compact style={{ width: "100%" }}>
            <Input
              value={terminalCommand}
              onChange={(event) => setTerminalCommand(event.target.value)}
              placeholder={uiText.terminalInputPlaceholder}
              onPressEnter={() => sendTerminalCommand()}
              disabled={!terminalConnected}
            />
            <Button type="primary" onClick={sendTerminalCommand} disabled={!terminalConnected || !terminalCommand.trim()}>
              {uiText.sendCommand}
            </Button>
          </Space.Compact>
        </Space>
      </Modal>
      <Modal
        title={uiText.pairingCodeTitle}
        open={pairingCodeModalOpen}
        onCancel={closePairingCodeModal}
        footer={[
          <Button key="cancel" onClick={closePairingCodeModal} disabled={pairingCodeLoading}>
            {uiText.cancel}
          </Button>,
          <Button
            key="refresh"
            type="primary"
            loading={pairingCodeLoading}
            disabled={!selectedInstance}
            onClick={openPairingCodeModal}
          >
            {uiText.refreshPairingCode}
          </Button>,
        ]}
        destroyOnHidden
      >
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Text type="secondary">{uiText.pairingCodeHint}</Text>
          <Text strong>{`${uiText.instanceName}: ${pairingCodeInstanceName ?? selectedInstance?.name ?? "-"}`}</Text>
          <Text strong>{uiText.pairingCode}</Text>
          {selectedPairingCode ? (
            <Paragraph copyable={{ text: selectedPairingCode }} style={{ marginBottom: 0 }}>
              <Text code style={{ fontSize: 24 }}>{selectedPairingCode}</Text>
            </Paragraph>
          ) : (
            <Alert type="warning" showIcon message={pairingCodeData?.note ?? uiText.pairingCodeUnavailable} />
          )}
          {selectedPairingLink ? (
            <>
              <Text strong>{uiText.pairingLink}</Text>
              <Paragraph copyable={{ text: selectedPairingLink }} style={{ marginBottom: 0 }}>
                <a href={selectedPairingLink} target="_blank" rel="noreferrer">
                  {selectedPairingLink}
                </a>
              </Paragraph>
            </>
          ) : null}
          {pairingCodeData?.fetchedAt ? (
            <Text type="secondary">{`${uiText.pairingCodeFetchedAt}: ${pairingCodeData.fetchedAt}`}</Text>
          ) : null}
          {pairingCodeData?.note ? (
            <Text type="secondary">{pairingCodeData.note}</Text>
          ) : null}
        </Space>
      </Modal>
      <Modal
        title={uiText.actionProgressTitle}
        open={submittingAction && !!activeInstanceAction}
        footer={null}
        closable={false}
        maskClosable={false}
        keyboard={false}
        centered
        destroyOnHidden
      >
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <div style={{ display: "flex", justifyContent: "center", padding: "12px 0" }}>
            <Spin size="large" />
          </div>
          <Text type="secondary">{uiText.actionProgressHint}</Text>
          <Text strong>{`${uiText.instanceName}: ${activeInstanceAction?.instanceName ?? selectedInstance?.name ?? "-"}`}</Text>
          <Text strong>{`${uiText.actionProgressCurrent}: ${activeActionLabel || "-"}`}</Text>
          <Text type="secondary">{uiText.actionProgressWaiting}</Text>
        </Space>
      </Modal>
      <Modal
        title={uiText.confirmActionTitle}
        open={actionConfirmOpen}
        onCancel={closeActionConfirm}
        onOk={() => void handleConfirmSensitiveAction()}
        okText={uiText.confirmActionOk}
        cancelText={uiText.cancel}
        confirmLoading={submittingAction}
        okButtonProps={{ danger: pendingAction === "ROLLBACK" }}
        destroyOnHidden
      >
        <Text>{`${uiText.confirmActionContentPrefix}${pendingAction ? actionLabelMap[pendingAction] : "-"} (${selectedInstance?.name ?? "-"})`}</Text>
      </Modal>
      <Modal
        title={uiText.deleteConfirmTitle}
        open={deleteModalOpen}
        onCancel={closeDeleteModal}
        onOk={() => void handleDeleteInstance()}
        okText={uiText.delete}
        cancelText={uiText.cancel}
        confirmLoading={deletingInstance}
        okButtonProps={{ danger: true }}
        destroyOnHidden
      >
        <Text>{`${uiText.deleteConfirmContentPrefix}${selectedInstance?.name ?? "-"}`}</Text>
      </Modal>
    </>
  );
}

