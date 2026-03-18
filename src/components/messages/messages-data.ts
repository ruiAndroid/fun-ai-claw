import { appConfig } from "@/config/app-config";
import {
  formatAgentInteractionPayloadForDisplay,
  getAgentInteractionStateLabel,
  parseAgentInteractionPayload,
  type AgentSessionCoreFields,
} from "@/lib/agent-session-protocol";
import type { MessageRobotTarget } from "./messages-types";

export const messagePageText = {
  robotsLoadFailed: "加载机器人列表失败",
  robotUnavailable: "当前机器人实例未运行，暂时无法发起会话",
  sessionConnectFailed: "连接机器人会话失败",
  sessionDisconnected: "机器人会话已断开",
  sessionInterrupted: "机器人会话连接中断，请重试",
  interactionConfirmed: "已提交确认",
  interactionRevised: "已提交修改",
  interactionSubmitted: "已提交交互",
} as const;

export function buildMessageSessionWebSocketUrl(websocketPath?: string | null) {
  if (!websocketPath) {
    return "";
  }
  const apiBase = appConfig.controlApiBaseUrl;

  if (apiBase.startsWith("http://") || apiBase.startsWith("https://")) {
    const wsBase = apiBase.replace(/^http/i, "ws").replace(/\/$/, "");
    return `${wsBase}${websocketPath.startsWith("/") ? websocketPath : `/${websocketPath}`}`;
  }

  const normalizedApiBase = apiBase.startsWith("/") ? apiBase : `/${apiBase}`;
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}${normalizedApiBase}${websocketPath.startsWith("/") ? websocketPath : `/${websocketPath}`}`;
}

export function normalizeMessageInput(rawInput: string) {
  return rawInput
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(" ")
    .trim();
}

export function formatRobotSubtitle(robot: MessageRobotTarget) {
  return [robot.instanceName, robot.model, robot.provider].filter(Boolean).join(" · ");
}

export function formatRobotStatus(robot: MessageRobotTarget) {
  return robot.isAvailable ? "在线" : robot.instanceStatus;
}

export function formatMessageTimestamp(value?: string) {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatOutgoingMessage(normalizedMessage: string) {
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
}

export function getInteractionResolvedNote(rawInput: string) {
  const parsed = parseAgentInteractionPayload(rawInput);
  if (!parsed?.interactionAction) {
    return undefined;
  }
  if (parsed.interactionAction === "confirm") {
    return messagePageText.interactionConfirmed;
  }
  if (parsed.interactionAction === "revise") {
    return messagePageText.interactionRevised;
  }
  return messagePageText.interactionSubmitted;
}

export function isPlaceholderValue(value?: string) {
  if (!value) {
    return true;
  }
  return /^<[^>]+>$/.test(value.trim());
}

export function mergeSessionCoreFields(
  payloadFields: AgentSessionCoreFields | undefined,
  sessionFields: AgentSessionCoreFields | undefined,
) {
  return {
    scriptType: !isPlaceholderValue(payloadFields?.scriptType) ? payloadFields?.scriptType : sessionFields?.scriptType,
    scriptContent: !isPlaceholderValue(payloadFields?.scriptContent) ? payloadFields?.scriptContent : sessionFields?.scriptContent,
    targetAudience: !isPlaceholderValue(payloadFields?.targetAudience) ? payloadFields?.targetAudience : sessionFields?.targetAudience,
    expectedEpisodeCount: !isPlaceholderValue(payloadFields?.expectedEpisodeCount)
      ? payloadFields?.expectedEpisodeCount
      : sessionFields?.expectedEpisodeCount,
  };
}

export function formatInteractionDraftLabel(stateId?: string) {
  return getAgentInteractionStateLabel(stateId) ?? "当前步骤";
}
