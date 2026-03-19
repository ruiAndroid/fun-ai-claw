"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { connectConsumerChatSession, listConsumerChatSessionMessages } from "@/lib/consumer-api";
import {
  normalizeStructuredAgentChatMessage,
  parseAgentInteractionPayload,
  parseAgentSessionCoreFields,
  parseAgentSessionFrame,
  type AgentChatMessage,
  type AgentInteraction,
  type AgentInteractionAction,
  type AgentSessionCoreFields,
  type AgentSessionDelta,
} from "@/lib/agent-session-protocol";
import type { ConsumerChatSessionMessage } from "@/types/consumer";
import {
  buildMessageSessionWebSocketUrl,
  formatOutgoingMessage,
  getInteractionResolvedNote,
  mergeSessionCoreFields,
  messagePageText,
  normalizeMessageInput,
} from "./messages-data";
import type { MessageInteractionDraft, MessageRobotTarget, MessageSessionPhase } from "./messages-types";
import type { MessageSessionListItem } from "./use-message-session-list";

type QueuedMessage = {
  normalizedMessage: string;
  displayText?: string;
  resolveInteractionMessageId?: string;
  resolvedInteractionNote?: string;
};

type SendMessageOptions = {
  displayText?: string;
  resolveInteractionMessageId?: string;
  resolvedInteractionNote?: string;
};

type SessionSnapshot = {
  messages: AgentChatMessage[];
  pendingResponse: boolean;
  phase: MessageSessionPhase;
  coreFields?: AgentSessionCoreFields;
  historyLoaded: boolean;
};

const SESSION_ATTACH_DEBOUNCE_MS = 180;
const SESSION_HISTORY_TIMEOUT_MS = 12_000;

function isAbortLikeError(error: unknown) {
  return error instanceof DOMException
    ? error.name === "AbortError"
    : error instanceof Error && /abort/i.test(error.name);
}

function nextLocalMessageId(sequence: React.MutableRefObject<number>, prefix: string) {
  sequence.current += 1;
  return `${prefix}-${sequence.current}`;
}

function upsertAgentMessage(messages: AgentChatMessage[], nextMessage: AgentChatMessage) {
  const existingIndex = messages.findIndex((item) => item.id === nextMessage.id);
  if (existingIndex < 0) {
    return [...messages, nextMessage];
  }
  return messages.map((item, index) => (index === existingIndex
    ? { ...item, ...nextMessage, createdAt: item.createdAt ?? nextMessage.createdAt, emittedAt: nextMessage.emittedAt ?? item.emittedAt }
    : item));
}

function applyAgentDelta(messages: AgentChatMessage[], delta: AgentSessionDelta) {
  const existingIndex = messages.findIndex((item) => item.id === delta.messageId);
  const currentMessage = existingIndex >= 0
    ? messages[existingIndex]
    : { id: delta.messageId, role: delta.role, content: "", thinkingContent: "", pending: delta.role === "assistant", emittedAt: delta.emittedAt } satisfies AgentChatMessage;
  const nextMessage: AgentChatMessage = {
    ...currentMessage,
    role: delta.role,
    pending: delta.role === "assistant",
    emittedAt: delta.emittedAt,
    thinkingContent: delta.channel === "thinking"
      ? delta.operation === "clear" ? "" : `${currentMessage.thinkingContent ?? ""}${delta.chunk ?? ""}`
      : currentMessage.thinkingContent,
    content: delta.channel === "content"
      ? delta.operation === "clear" ? "" : `${currentMessage.content}${delta.chunk ?? ""}`
      : currentMessage.content,
  };
  return upsertAgentMessage(messages, nextMessage);
}

function isRawLogLine(line: string) {
  const normalizedLine = line.trim();
  return [
    "llm.request",
    "llm.response",
    "turn.complete",
    "tool.start",
    "tool.call",
    "agent.start",
    "Config loaded",
    "Memory initialized",
    "Warming up provider connection pool",
  ].some((prefix) => normalizedLine.includes(prefix));
}

function normalizeHistoryMessage(message: ConsumerChatSessionMessage, index: number): AgentChatMessage | null {
  const role = message.role === "user" || message.role === "assistant" || message.role === "system" ? message.role : "assistant";
  if (!message.content && !message.thinkingContent) {
    return null;
  }
  return {
    id: message.providerMessageId?.trim() || message.id || `${message.eventType}-${message.createdAt}-${index}`,
    role,
    content: message.content ?? "",
    thinkingContent: message.thinkingContent ?? undefined,
    pending: message.pending,
    interaction: (message.interaction ?? undefined) as AgentInteraction | undefined,
    createdAt: message.createdAt,
    emittedAt: message.emittedAt ?? message.createdAt,
  };
}

function buildMessageSemanticKey(message: AgentChatMessage) {
  return [
    message.role,
    message.content.trim(),
    (message.thinkingContent ?? "").trim(),
  ].join("::");
}

function isLocalEphemeralMessage(message: AgentChatMessage) {
  return message.id.startsWith("user-")
    || message.id.startsWith("assistant-raw")
    || message.id.startsWith("system-");
}

function mergeHistoryWithSnapshot(historyMessages: AgentChatMessage[], snapshot?: SessionSnapshot) {
  if (!snapshot) {
    return historyMessages;
  }
  const duplicateBudget = new Map<string, number>();
  for (const message of historyMessages) {
    const key = buildMessageSemanticKey(message);
    duplicateBudget.set(key, (duplicateBudget.get(key) ?? 0) + 1);
  }
  return snapshot.messages.reduce((current, message) => {
    if (isLocalEphemeralMessage(message)) {
      const key = buildMessageSemanticKey(message);
      const remaining = duplicateBudget.get(key) ?? 0;
      if (remaining > 0) {
        duplicateBudget.set(key, remaining - 1);
        return current;
      }
    }
    return upsertAgentMessage(current, message);
  }, historyMessages);
}

export function useMessageSession({
  selectedRobot,
  selectedSession,
  ensureSession,
  refreshSessions,
}: {
  selectedRobot?: MessageRobotTarget;
  selectedSession?: MessageSessionListItem;
  ensureSession: () => Promise<MessageSessionListItem | undefined>;
  refreshSessions?: () => Promise<unknown> | void;
}) {
  const [messages, setMessages] = useState<AgentChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [pendingResponse, setPendingResponse] = useState(false);
  const [sessionPhase, setSessionPhase] = useState<MessageSessionPhase>("idle");
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [interactionDraft, setInteractionDraft] = useState<MessageInteractionDraft>();
  const [currentSessionId, setCurrentSessionId] = useState<string>();
  const [sessionLoading, setSessionLoading] = useState(false);

  const sessionSocketsRef = useRef<Map<string, WebSocket>>(new Map());
  const connectingSessionIdsRef = useRef<Set<string>>(new Set());
  const suppressedSocketClosuresRef = useRef<WeakSet<WebSocket>>(new WeakSet());
  const queuedMessagesRef = useRef<Map<string, QueuedMessage[]>>(new Map());
  const inputComposingRef = useRef(false);
  const rawLineBuffersRef = useRef<Map<string, string>>(new Map());
  const rawAssistantMessageIdsRef = useRef<Map<string, string | undefined>>(new Map());
  const localMessageSeqRef = useRef(0);
  const selectedRobotIdRef = useRef<string | undefined>(undefined);
  const selectedSessionRef = useRef<MessageSessionListItem | undefined>(undefined);
  const currentSessionIdRef = useRef<string | undefined>(undefined);
  const coreFieldsRef = useRef<AgentSessionCoreFields | undefined>(undefined);
  const historyLoadedRef = useRef(false);
  const messagesRef = useRef<AgentChatMessage[]>([]);
  const pendingResponseRef = useRef(false);
  const sessionPhaseRef = useRef<MessageSessionPhase>("idle");
  const resumableSessionIdsRef = useRef<Set<string>>(new Set());
  const manuallyPausedSessionIdsRef = useRef<Set<string>>(new Set());
  const sessionSnapshotsRef = useRef<Map<string, SessionSnapshot>>(new Map());
  const connectAbortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const historyAbortControllerRef = useRef<AbortController | null>(null);
  const attachTimerRef = useRef<number | null>(null);

  const getSessionSocket = useCallback((sessionId?: string) => {
    if (!sessionId) {
      return null;
    }
    return sessionSocketsRef.current.get(sessionId) ?? null;
  }, []);

  const isSessionSocketOpen = useCallback((sessionId?: string) => {
    const socket = getSessionSocket(sessionId);
    return Boolean(socket && socket.readyState === WebSocket.OPEN);
  }, [getSessionSocket]);

  const isSessionSocketConnecting = useCallback((sessionId?: string) => {
    if (!sessionId) {
      return false;
    }
    if (connectingSessionIdsRef.current.has(sessionId)) {
      return true;
    }
    const socket = getSessionSocket(sessionId);
    return Boolean(socket && socket.readyState === WebSocket.CONNECTING);
  }, [getSessionSocket]);

  const syncSelectedSessionConnectionState = useCallback((sessionId?: string | null) => {
    const targetSessionId = sessionId === undefined ? currentSessionIdRef.current : sessionId ?? undefined;
    setConnecting(isSessionSocketConnecting(targetSessionId));
    setConnected(isSessionSocketOpen(targetSessionId));
  }, [isSessionSocketConnecting, isSessionSocketOpen]);

  const cancelPendingAttach = useCallback(() => {
    if (attachTimerRef.current !== null) {
      window.clearTimeout(attachTimerRef.current);
      attachTimerRef.current = null;
    }
  }, []);

  const cancelHistoryLoad = useCallback(() => {
    historyAbortControllerRef.current?.abort();
    historyAbortControllerRef.current = null;
  }, []);

  const cancelConnectAttempt = useCallback((sessionId?: string) => {
    if (sessionId) {
      const controller = connectAbortControllersRef.current.get(sessionId);
      controller?.abort();
      connectAbortControllersRef.current.delete(sessionId);
      connectingSessionIdsRef.current.delete(sessionId);
      if (currentSessionIdRef.current === sessionId) {
        syncSelectedSessionConnectionState(sessionId);
      }
      return;
    }
    const sessionIds = Array.from(connectAbortControllersRef.current.keys());
    sessionIds.forEach((id) => {
      connectAbortControllersRef.current.get(id)?.abort();
      connectingSessionIdsRef.current.delete(id);
    });
    connectAbortControllersRef.current.clear();
    syncSelectedSessionConnectionState();
  }, [syncSelectedSessionConnectionState]);

  const resetConversationState = useCallback(() => {
    messagesRef.current = [];
    pendingResponseRef.current = false;
    sessionPhaseRef.current = "idle";
    currentSessionIdRef.current = undefined;
    selectedSessionRef.current = undefined;
    coreFieldsRef.current = undefined;
    historyLoadedRef.current = false;
    localMessageSeqRef.current = 0;
    sessionSnapshotsRef.current.clear();
    resumableSessionIdsRef.current.clear();
    manuallyPausedSessionIdsRef.current.clear();
    setMessages([]);
    setPendingResponse(false);
    setSessionPhase("idle");
    setConnecting(false);
    setConnected(false);
    setError(undefined);
    setNotice(undefined);
    setInteractionDraft(undefined);
    setCurrentSessionId(undefined);
    setSessionLoading(false);
    sessionSocketsRef.current.clear();
    connectingSessionIdsRef.current.clear();
    queuedMessagesRef.current.clear();
    rawLineBuffersRef.current.clear();
    rawAssistantMessageIdsRef.current.clear();
    connectAbortControllersRef.current.clear();
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    selectedSessionRef.current = selectedSession;
  }, [selectedSession]);

  useEffect(() => {
    pendingResponseRef.current = pendingResponse;
  }, [pendingResponse]);

  useEffect(() => {
    sessionPhaseRef.current = sessionPhase;
  }, [sessionPhase]);

  const buildVisibleSnapshot = useCallback((): SessionSnapshot => ({
    messages: messagesRef.current,
    pendingResponse: pendingResponseRef.current || messagesRef.current.some((message) => message.role === "assistant" && message.pending),
    phase: sessionPhaseRef.current,
    coreFields: coreFieldsRef.current,
    historyLoaded: historyLoadedRef.current,
  }), []);

  const rememberSessionSnapshot = useCallback((sessionId?: string) => {
    if (!sessionId) {
      return;
    }
    sessionSnapshotsRef.current.set(sessionId, buildVisibleSnapshot());
  }, [buildVisibleSnapshot]);

  const restoreSessionSnapshot = useCallback((snapshot?: SessionSnapshot) => {
    const nextMessages = snapshot?.messages ?? [];
    const nextPendingResponse = Boolean(snapshot?.pendingResponse || nextMessages.some((message) => message.role === "assistant" && message.pending));
    const nextPhase = snapshot?.phase === "starting" || snapshot?.phase === "sending"
      ? snapshot.phase
      : (nextPendingResponse ? "generating" : "idle");
    messagesRef.current = nextMessages;
    pendingResponseRef.current = nextPendingResponse;
    sessionPhaseRef.current = nextPhase;
    setMessages(nextMessages);
    setPendingResponse(nextPendingResponse);
    setSessionPhase(nextPhase);
    coreFieldsRef.current = snapshot?.coreFields;
    historyLoadedRef.current = Boolean(snapshot?.historyLoaded);
  }, []);

  const applySnapshotUpdate = useCallback((sessionId: string, updater: (snapshot: SessionSnapshot) => SessionSnapshot) => {
    const baseSnapshot = currentSessionIdRef.current === sessionId
      ? buildVisibleSnapshot()
      : (sessionSnapshotsRef.current.get(sessionId) ?? {
        messages: [],
        pendingResponse: false,
        phase: "idle",
        coreFields: undefined,
        historyLoaded: false,
      });
    const nextSnapshot = updater(baseSnapshot);
    sessionSnapshotsRef.current.set(sessionId, nextSnapshot);
    if (currentSessionIdRef.current === sessionId) {
      restoreSessionSnapshot(nextSnapshot);
    }
    return nextSnapshot;
  }, [buildVisibleSnapshot, restoreSessionSnapshot]);

  const shouldAutoAttachSession = useCallback((targetSession?: MessageSessionListItem, snapshot?: SessionSnapshot) => {
    const targetSessionId = targetSession?.sessionId;
    if (!targetSessionId || targetSession?.status !== "ACTIVE") {
      return false;
    }
    if (isSessionSocketOpen(targetSessionId) || isSessionSocketConnecting(targetSessionId)) {
      return false;
    }
    if (manuallyPausedSessionIdsRef.current.has(targetSessionId)) {
      return false;
    }
    return Boolean(
      targetSession.remoteConnected
      || targetSession.generating
      || resumableSessionIdsRef.current.has(targetSessionId)
      || snapshot?.pendingResponse
      || (snapshot?.phase && snapshot.phase !== "idle"),
    );
  }, [isSessionSocketConnecting, isSessionSocketOpen]);

  const shouldRefreshHistoryOnSelect = useCallback((targetSession?: MessageSessionListItem, snapshot?: SessionSnapshot) => {
    const targetSessionId = targetSession?.sessionId;
    if (!targetSessionId) {
      return false;
    }
    if (isSessionSocketOpen(targetSessionId) || isSessionSocketConnecting(targetSessionId)) {
      return false;
    }
    if (!snapshot?.historyLoaded) {
      return Boolean(
        targetSession.hasTranscript
        || targetSession.remoteConnected
        || targetSession.generating
        || resumableSessionIdsRef.current.has(targetSessionId)
        || snapshot?.phase === "starting"
        || snapshot?.phase === "sending",
      );
    }
    if (targetSession.status !== "ACTIVE") {
      return false;
    }
    return Boolean(
      targetSession.remoteConnected
      || targetSession.generating
      || resumableSessionIdsRef.current.has(targetSessionId)
      || snapshot.pendingResponse
      || snapshot.phase !== "idle"
    );
  }, [isSessionSocketConnecting, isSessionSocketOpen]);

  const finalizeRawAssistantMessage = useCallback((sessionId?: string) => {
    if (!sessionId) {
      return;
    }
    const messageId = rawAssistantMessageIdsRef.current.get(sessionId);
    if (!messageId) {
      return;
    }
    applySnapshotUpdate(sessionId, (snapshot) => {
      const nextMessages = snapshot.messages.map((message) => (
        message.id === messageId ? { ...message, pending: false } : message
      ));
      const nextPendingResponse = nextMessages.some((message) => message.role === "assistant" && message.pending);
      return {
        ...snapshot,
        messages: nextMessages,
        pendingResponse: nextPendingResponse,
        phase: nextPendingResponse ? "generating" : "idle",
      };
    });
    rawAssistantMessageIdsRef.current.delete(sessionId);
  }, [applySnapshotUpdate]);

  const appendRawAssistantChunk = useCallback((sessionId: string, chunk: string) => {
    if (!chunk) {
      return;
    }
    applySnapshotUpdate(sessionId, (snapshot) => {
      const messageId = rawAssistantMessageIdsRef.current.get(sessionId) ?? nextLocalMessageId(localMessageSeqRef, "assistant-raw");
      rawAssistantMessageIdsRef.current.set(sessionId, messageId);
      const existingIndex = snapshot.messages.findIndex((message) => message.id === messageId);
      const nextMessage: AgentChatMessage = existingIndex >= 0
        ? { ...snapshot.messages[existingIndex], content: `${snapshot.messages[existingIndex].content}${chunk}`, pending: true }
        : { id: messageId, role: "assistant", content: chunk, pending: true, createdAt: new Date().toISOString() };
      return {
        ...snapshot,
        messages: upsertAgentMessage(snapshot.messages, nextMessage),
        pendingResponse: true,
        phase: "generating",
        historyLoaded: true,
      };
    });
  }, [applySnapshotUpdate]);

  const processRawLine = useCallback((sessionId: string, rawLine: string) => {
    const normalizedLine = rawLine.replace(/\r$/, "");
    const trimmedLine = normalizedLine.trim();
    if (!trimmedLine) {
      appendRawAssistantChunk(sessionId, "\n");
      return;
    }
    if (normalizedLine.startsWith("[system]")) {
      finalizeRawAssistantMessage(sessionId);
      const systemContent = normalizedLine.replace(/^\[system\]\s*/, "");
      applySnapshotUpdate(sessionId, (snapshot) => ({
        ...snapshot,
        messages: [...snapshot.messages, {
          id: nextLocalMessageId(localMessageSeqRef, "system"),
          role: "system",
          content: systemContent,
          createdAt: new Date().toISOString(),
        }],
        historyLoaded: true,
      }));
      return;
    }
    if (trimmedLine === "🦀 ZeroClaw Interactive Mode" || trimmedLine === "Type /help for commands.") {
      return;
    }
    if (trimmedLine === ">") {
      finalizeRawAssistantMessage(sessionId);
      applySnapshotUpdate(sessionId, (snapshot) => ({
        ...snapshot,
        pendingResponse: false,
        phase: "idle",
      }));
      return;
    }
    if (trimmedLine.startsWith(">")) {
      const lineAfterPrompt = trimmedLine.slice(1).trim();
      if (!lineAfterPrompt || lineAfterPrompt.startsWith("[you]") || isRawLogLine(lineAfterPrompt)) {
        return;
      }
      appendRawAssistantChunk(sessionId, `${lineAfterPrompt}\n`);
      return;
    }
    if (isRawLogLine(trimmedLine)) {
      if (trimmedLine.includes("turn.complete")) {
        finalizeRawAssistantMessage(sessionId);
        applySnapshotUpdate(sessionId, (snapshot) => ({
          ...snapshot,
          pendingResponse: false,
          phase: "idle",
        }));
        void refreshSessions?.();
      }
      return;
    }
    appendRawAssistantChunk(sessionId, `${normalizedLine}\n`);
  }, [appendRawAssistantChunk, applySnapshotUpdate, finalizeRawAssistantMessage, refreshSessions]);

  const processRawChunk = useCallback((sessionId: string, chunk: string) => {
    if (!chunk) {
      return;
    }
    const currentBuffer = `${rawLineBuffersRef.current.get(sessionId) ?? ""}${chunk}`;
    rawLineBuffersRef.current.set(sessionId, currentBuffer);
    let newlineIndex = currentBuffer.indexOf("\n");
    let pendingBuffer = currentBuffer;
    while (newlineIndex >= 0) {
      const nextLine = pendingBuffer.slice(0, newlineIndex);
      pendingBuffer = pendingBuffer.slice(newlineIndex + 1);
      processRawLine(sessionId, nextLine);
      newlineIndex = pendingBuffer.indexOf("\n");
    }
    rawLineBuffersRef.current.set(sessionId, pendingBuffer);
  }, [processRawLine]);

  const handleSocketMessage = useCallback((sessionId: string, data: string) => {
    const frame = parseAgentSessionFrame(data);
    if (!frame) {
      processRawChunk(sessionId, data);
      return;
    }
    finalizeRawAssistantMessage(sessionId);
    if (frame.eventType === "debug") {
      return;
    }
    if (frame.eventType === "delta" && frame.delta) {
      applySnapshotUpdate(sessionId, (snapshot) => ({
        ...snapshot,
        messages: applyAgentDelta(snapshot.messages, frame.delta!),
        pendingResponse: true,
        phase: "generating",
        historyLoaded: true,
      }));
      return;
    }
    if (frame.eventType === "message" && frame.message) {
      const normalizedMessage = normalizeStructuredAgentChatMessage(frame.message);
      if (!normalizedMessage) {
        return;
      }
      applySnapshotUpdate(sessionId, (snapshot) => ({
        ...snapshot,
        messages: upsertAgentMessage(snapshot.messages, normalizedMessage),
        pendingResponse: normalizedMessage.role === "assistant"
          ? Boolean(normalizedMessage.pending)
          : snapshot.pendingResponse,
        phase: normalizedMessage.role === "assistant"
          ? (normalizedMessage.pending ? "generating" : "idle")
          : snapshot.phase,
        historyLoaded: true,
      }));
      if (normalizedMessage.role === "assistant" && !normalizedMessage.pending) {
        applySnapshotUpdate(sessionId, (snapshot) => ({
          ...snapshot,
          pendingResponse: false,
          phase: "idle",
        }));
        void refreshSessions?.();
      }
    }
  }, [applySnapshotUpdate, finalizeRawAssistantMessage, processRawChunk, refreshSessions]);

  const disconnectSession = useCallback((sessionId?: string, silent = false) => {
    if (!sessionId) {
      return;
    }
    const isCurrentSession = currentSessionIdRef.current === sessionId;
    if (isCurrentSession) {
      rememberSessionSnapshot(sessionId);
    }
    cancelConnectAttempt(sessionId);
    if (silent) {
      resumableSessionIdsRef.current.add(sessionId);
    } else {
      resumableSessionIdsRef.current.delete(sessionId);
      manuallyPausedSessionIdsRef.current.add(sessionId);
    }
    const socket = getSessionSocket(sessionId);
    if (socket) {
      if (silent) {
        suppressedSocketClosuresRef.current.add(socket);
      }
      sessionSocketsRef.current.delete(sessionId);
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
    }
    if (isCurrentSession) {
      pendingResponseRef.current = false;
      sessionPhaseRef.current = "idle";
      setPendingResponse(false);
      setSessionPhase("idle");
      syncSelectedSessionConnectionState(sessionId);
    }
  }, [cancelConnectAttempt, getSessionSocket, rememberSessionSnapshot, syncSelectedSessionConnectionState]);

  const disconnectAllSessions = useCallback((silent = false) => {
    rememberSessionSnapshot(currentSessionIdRef.current);
    const sessionIds = new Set<string>([
      ...sessionSocketsRef.current.keys(),
      ...connectAbortControllersRef.current.keys(),
    ]);
    if (currentSessionIdRef.current) {
      sessionIds.add(currentSessionIdRef.current);
    }
    sessionIds.forEach((sessionId) => {
      disconnectSession(sessionId, silent);
    });
    pendingResponseRef.current = false;
    sessionPhaseRef.current = "idle";
    setPendingResponse(false);
    setSessionPhase("idle");
    syncSelectedSessionConnectionState(null);
  }, [disconnectSession, rememberSessionSnapshot, syncSelectedSessionConnectionState]);

  const disconnect = useCallback((silent = false) => {
    cancelPendingAttach();
    cancelHistoryLoad();
    disconnectSession(currentSessionIdRef.current, silent);
  }, [cancelHistoryLoad, cancelPendingAttach, disconnectSession]);

  const sendNormalizedMessageToSession = useCallback((sessionId: string, normalizedMessage: string, options?: SendMessageOptions) => {
    const socket = getSessionSocket(sessionId);
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }
    const parsedCoreFields = parseAgentSessionCoreFields(normalizedMessage);
    const sentAt = new Date().toISOString();
    const userMessage: AgentChatMessage = {
      id: nextLocalMessageId(localMessageSeqRef, "user"),
      role: "user",
      content: options?.displayText ?? formatOutgoingMessage(normalizedMessage),
      createdAt: sentAt,
    };
    try {
      socket.send(`${normalizedMessage}\n`);
    } catch (sendError) {
      if (currentSessionIdRef.current === sessionId) {
        setError(sendError instanceof Error ? sendError.message : messagePageText.sessionConnectFailed);
      }
      return false;
    }
    applySnapshotUpdate(sessionId, (snapshot) => ({
      ...snapshot,
      messages: options?.resolveInteractionMessageId
        ? [...snapshot.messages, userMessage].map((message) => (
          message.id === options.resolveInteractionMessageId
            ? { ...message, interactionResolved: true, interactionResolvedNote: options.resolvedInteractionNote }
            : message
        ))
        : [...snapshot.messages, userMessage],
      pendingResponse: false,
      phase: "sending",
      historyLoaded: true,
      coreFields: parsedCoreFields ?? snapshot.coreFields,
    }));
    if (currentSessionIdRef.current === sessionId) {
      if (parsedCoreFields) {
        coreFieldsRef.current = parsedCoreFields;
      }
      setNotice(undefined);
      setError(undefined);
    }
    void refreshSessions?.();
    return true;
  }, [applySnapshotUpdate, getSessionSocket, refreshSessions]);

  const sendNormalizedMessage = useCallback((normalizedMessage: string, options?: SendMessageOptions) => {
    const activeSessionId = currentSessionIdRef.current;
    if (!activeSessionId) {
      return false;
    }
    return sendNormalizedMessageToSession(activeSessionId, normalizedMessage, options);
  }, [sendNormalizedMessageToSession]);

  const flushQueuedMessagesForSession = useCallback((sessionId: string) => {
    const queuedMessages = queuedMessagesRef.current.get(sessionId);
    if (!queuedMessages?.length) {
      return true;
    }
    let flushedCount = 0;
    while (flushedCount < queuedMessages.length) {
      const queuedMessage = queuedMessages[flushedCount];
      if (!sendNormalizedMessageToSession(sessionId, queuedMessage.normalizedMessage, queuedMessage)) {
        break;
      }
      flushedCount += 1;
    }
    if (flushedCount <= 0) {
      return false;
    }
    if (flushedCount >= queuedMessages.length) {
      queuedMessagesRef.current.delete(sessionId);
      return true;
    }
    queuedMessagesRef.current.set(sessionId, queuedMessages.slice(flushedCount));
    return false;
  }, [sendNormalizedMessageToSession]);

  const openSocketForSession = useCallback(async (targetSession: MessageSessionListItem) => {
    if (!selectedRobot) {
      return false;
    }
    if (!selectedRobot.isAvailable) {
      if (currentSessionIdRef.current === targetSession.sessionId) {
        setError(messagePageText.robotUnavailable);
      }
      return false;
    }
    if (targetSession.status !== "ACTIVE") {
      if (currentSessionIdRef.current === targetSession.sessionId) {
        setError("当前会话已关闭，请新建会话后再继续");
      }
      return false;
    }
    if (isSessionSocketOpen(targetSession.sessionId)) {
      if (currentSessionIdRef.current === targetSession.sessionId) {
        setError(undefined);
        setNotice(undefined);
        syncSelectedSessionConnectionState(targetSession.sessionId);
      }
      return true;
    }
    if (isSessionSocketConnecting(targetSession.sessionId)) {
      if (currentSessionIdRef.current === targetSession.sessionId) {
        setError(undefined);
        setNotice(undefined);
        syncSelectedSessionConnectionState(targetSession.sessionId);
      }
      return true;
    }

    cancelConnectAttempt(targetSession.sessionId);
    connectingSessionIdsRef.current.add(targetSession.sessionId);
    if (currentSessionIdRef.current === targetSession.sessionId) {
      setError(undefined);
      setNotice(undefined);
      syncSelectedSessionConnectionState(targetSession.sessionId);
    }

    const connectController = new AbortController();
    connectAbortControllersRef.current.set(targetSession.sessionId, connectController);
    selectedRobotIdRef.current = selectedRobot.id;

    let connectionInfo;
    try {
      connectionInfo = await connectConsumerChatSession(targetSession.sessionId, { signal: connectController.signal });
    } catch (connectError) {
      if (connectAbortControllersRef.current.get(targetSession.sessionId) === connectController) {
        connectAbortControllersRef.current.delete(targetSession.sessionId);
      }
      connectingSessionIdsRef.current.delete(targetSession.sessionId);
      if (currentSessionIdRef.current === targetSession.sessionId) {
        syncSelectedSessionConnectionState(targetSession.sessionId);
      }
      if (connectController.signal.aborted || isAbortLikeError(connectError)) {
        return false;
      }
      if (currentSessionIdRef.current === targetSession.sessionId) {
        setError(connectError instanceof Error ? connectError.message : messagePageText.sessionConnectFailed);
      }
      return false;
    }

    if (connectAbortControllersRef.current.get(targetSession.sessionId) !== connectController || connectController.signal.aborted) {
      connectingSessionIdsRef.current.delete(targetSession.sessionId);
      if (currentSessionIdRef.current === targetSession.sessionId) {
        syncSelectedSessionConnectionState(targetSession.sessionId);
      }
      return false;
    }
    connectAbortControllersRef.current.delete(targetSession.sessionId);
    connectingSessionIdsRef.current.delete(targetSession.sessionId);

    const websocketUrl = buildMessageSessionWebSocketUrl(connectionInfo.websocketPath);
    if (!websocketUrl) {
      if (currentSessionIdRef.current === targetSession.sessionId) {
        syncSelectedSessionConnectionState(targetSession.sessionId);
        setError(messagePageText.sessionConnectFailed);
      }
      return false;
    }

    const existingSocket = getSessionSocket(targetSession.sessionId);
    if (existingSocket && (existingSocket.readyState === WebSocket.OPEN || existingSocket.readyState === WebSocket.CONNECTING)) {
      if (existingSocket.readyState === WebSocket.CONNECTING || flushQueuedMessagesForSession(targetSession.sessionId) || isSessionSocketOpen(targetSession.sessionId)) {
        if (currentSessionIdRef.current === targetSession.sessionId) {
          syncSelectedSessionConnectionState(targetSession.sessionId);
        }
        return true;
      }
    }

    const socket = new WebSocket(websocketUrl);
    sessionSocketsRef.current.set(targetSession.sessionId, socket);
    if (currentSessionIdRef.current === targetSession.sessionId) {
      syncSelectedSessionConnectionState(targetSession.sessionId);
    }

    const targetRobotId = selectedRobot.id;
    let connectionEstablished = false;

    socket.onopen = () => {
      if (sessionSocketsRef.current.get(targetSession.sessionId) !== socket) {
        suppressedSocketClosuresRef.current.add(socket);
        socket.close();
        return;
      }
      connectionEstablished = true;
      resumableSessionIdsRef.current.add(targetSession.sessionId);
      manuallyPausedSessionIdsRef.current.delete(targetSession.sessionId);
      if (currentSessionIdRef.current === targetSession.sessionId) {
        syncSelectedSessionConnectionState(targetSession.sessionId);
        setError(undefined);
        setNotice(undefined);
      }
      flushQueuedMessagesForSession(targetSession.sessionId);
    };

    socket.onmessage = (event) => {
      if (sessionSocketsRef.current.get(targetSession.sessionId) !== socket) {
        return;
      }
      if (typeof event.data === "string") {
        handleSocketMessage(targetSession.sessionId, event.data);
      }
    };

    socket.onerror = () => {
      if (sessionSocketsRef.current.get(targetSession.sessionId) !== socket) {
        return;
      }
      if (currentSessionIdRef.current === targetSession.sessionId) {
        setError(messagePageText.sessionConnectFailed);
      }
    };

    socket.onclose = () => {
      const isCurrentSession = currentSessionIdRef.current === targetSession.sessionId;
      const shouldSuppressNotice = suppressedSocketClosuresRef.current.has(socket);
      suppressedSocketClosuresRef.current.delete(socket);
      const buffered = rawLineBuffersRef.current.get(targetSession.sessionId) ?? "";
      if (buffered.trim()) {
        processRawLine(targetSession.sessionId, buffered);
      }
      rawLineBuffersRef.current.delete(targetSession.sessionId);
      finalizeRawAssistantMessage(targetSession.sessionId);
      if (sessionSocketsRef.current.get(targetSession.sessionId) === socket) {
        sessionSocketsRef.current.delete(targetSession.sessionId);
      }
      if (isCurrentSession) {
        pendingResponseRef.current = false;
        sessionPhaseRef.current = "idle";
        setPendingResponse(false);
        setSessionPhase("idle");
        syncSelectedSessionConnectionState(targetSession.sessionId);
      }
      if (!shouldSuppressNotice && isCurrentSession && selectedRobotIdRef.current === targetRobotId) {
        setNotice(connectionEstablished ? messagePageText.sessionDisconnected : messagePageText.sessionInterrupted);
      }
      void refreshSessions?.();
    };

    return true;
  }, [
    cancelConnectAttempt,
    finalizeRawAssistantMessage,
    flushQueuedMessagesForSession,
    getSessionSocket,
    handleSocketMessage,
    isSessionSocketConnecting,
    isSessionSocketOpen,
    processRawLine,
    refreshSessions,
    selectedRobot,
    syncSelectedSessionConnectionState,
  ]);

  const loadHistoryForSession = useCallback(async (targetSession: MessageSessionListItem) => {
    cancelHistoryLoad();
    const sessionId = targetSession.sessionId;
    const historyController = new AbortController();
    historyAbortControllerRef.current = historyController;
    setSessionLoading(true);
    setError(undefined);

    const loadingTimeout = window.setTimeout(() => {
      if (!historyController.signal.aborted && currentSessionIdRef.current === sessionId) {
        setSessionLoading(false);
        setError("加载会话超时，请重试");
      }
    }, SESSION_HISTORY_TIMEOUT_MS);

    try {
      const response = await listConsumerChatSessionMessages(sessionId, 100, { signal: historyController.signal });
      if (historyController.signal.aborted) {
        if (currentSessionIdRef.current === sessionId) {
          setSessionLoading(false);
        }
        return false;
      }
      const historyMessages = response.items
        .map((item, index) => normalizeHistoryMessage(item, index))
        .filter((item): item is AgentChatMessage => item !== null);
      const cachedSnapshot = sessionSnapshotsRef.current.get(sessionId);
      const nextMessages = mergeHistoryWithSnapshot(historyMessages, cachedSnapshot);
      const nextPendingResponse = Boolean(
        cachedSnapshot?.pendingResponse
        || nextMessages.some((message) => message.role === "assistant" && message.pending),
      );
      const nextSnapshot: SessionSnapshot = {
        messages: nextMessages,
        pendingResponse: nextPendingResponse,
        phase: cachedSnapshot?.phase === "starting" || cachedSnapshot?.phase === "sending"
          ? cachedSnapshot.phase
          : (nextPendingResponse ? "generating" : "idle"),
        coreFields: cachedSnapshot?.coreFields,
        historyLoaded: true,
      };
      sessionSnapshotsRef.current.set(sessionId, nextSnapshot);

      if (currentSessionIdRef.current === sessionId) {
        restoreSessionSnapshot(nextSnapshot);
        setSessionLoading(false);
        if (shouldAutoAttachSession(targetSession, nextSnapshot)) {
          setNotice(undefined);
          void openSocketForSession(targetSession);
        }
      }
      return true;
    } catch (loadError) {
      if (historyController.signal.aborted || isAbortLikeError(loadError)) {
        if (currentSessionIdRef.current === sessionId) {
          setSessionLoading(false);
        }
        return false;
      }
      if (currentSessionIdRef.current === sessionId) {
        setSessionLoading(false);
        setError(loadError instanceof Error ? loadError.message : "加载会话消息失败");
      }
      return false;
    } finally {
      window.clearTimeout(loadingTimeout);
      if (historyAbortControllerRef.current === historyController) {
        historyAbortControllerRef.current = null;
      }
    }
  }, [cancelHistoryLoad, openSocketForSession, restoreSessionSnapshot, shouldAutoAttachSession]);

  const connect = useCallback(async () => {
    if (!selectedRobot) {
      return false;
    }
    const targetSession = selectedSession ?? await ensureSession();
    if (!targetSession) {
      setError("请先创建会话");
      return false;
    }

    selectedRobotIdRef.current = selectedRobot.id;
    if (currentSessionIdRef.current !== targetSession.sessionId) {
      rememberSessionSnapshot(currentSessionIdRef.current);
      currentSessionIdRef.current = targetSession.sessionId;
      setCurrentSessionId(targetSession.sessionId);
      restoreSessionSnapshot(sessionSnapshotsRef.current.get(targetSession.sessionId));
      syncSelectedSessionConnectionState(targetSession.sessionId);
      setError(undefined);
      setNotice(undefined);
    }
    return openSocketForSession(targetSession);
  }, [ensureSession, openSocketForSession, rememberSessionSnapshot, restoreSessionSnapshot, selectedRobot, selectedSession, syncSelectedSessionConnectionState]);

  const queueMessageAndConnect = useCallback(async (normalizedMessage: string, options?: SendMessageOptions) => {
    if (!selectedRobot) {
      return false;
    }
    if (!selectedRobot.isAvailable) {
      setError(messagePageText.robotUnavailable);
      return false;
    }
    const targetSession = selectedSession ?? await ensureSession();
    if (!targetSession) {
      setError("请先创建会话");
      return false;
    }

    selectedRobotIdRef.current = selectedRobot.id;
    if (currentSessionIdRef.current !== targetSession.sessionId) {
      rememberSessionSnapshot(currentSessionIdRef.current);
      currentSessionIdRef.current = targetSession.sessionId;
      setCurrentSessionId(targetSession.sessionId);
      restoreSessionSnapshot(sessionSnapshotsRef.current.get(targetSession.sessionId));
      syncSelectedSessionConnectionState(targetSession.sessionId);
      setError(undefined);
      setNotice(undefined);
    }

    if (sendNormalizedMessageToSession(targetSession.sessionId, normalizedMessage, options)) {
      return true;
    }

    applySnapshotUpdate(targetSession.sessionId, (snapshot) => ({
      ...snapshot,
      phase: "starting",
    }));
    const queuedMessages = queuedMessagesRef.current.get(targetSession.sessionId) ?? [];
    queuedMessagesRef.current.set(targetSession.sessionId, [...queuedMessages, { normalizedMessage, ...options }]);
    if (isSessionSocketOpen(targetSession.sessionId)) {
      if (flushQueuedMessagesForSession(targetSession.sessionId)) {
        return true;
      }
    }
    const opened = await openSocketForSession(targetSession);
    if (!opened) {
      queuedMessagesRef.current.delete(targetSession.sessionId);
      applySnapshotUpdate(targetSession.sessionId, (snapshot) => ({
        ...snapshot,
        phase: "idle",
      }));
    }
    return opened;
  }, [
    applySnapshotUpdate,
    ensureSession,
    flushQueuedMessagesForSession,
    isSessionSocketOpen,
    openSocketForSession,
    rememberSessionSnapshot,
    restoreSessionSnapshot,
    selectedRobot,
    selectedSession,
    sendNormalizedMessageToSession,
    syncSelectedSessionConnectionState,
  ]);

  const enrichInteractionMessage = useCallback((rawInput: string) => {
    const normalizedInput = normalizeMessageInput(rawInput);
    if (!normalizedInput) {
      return "";
    }
    const parsedInteraction = parseAgentInteractionPayload(normalizedInput);
    if (!parsedInteraction?.interactionAction) {
      return normalizedInput;
    }
    const payloadCoreFields = parseAgentSessionCoreFields(normalizedInput);
    const mergedCoreFields = mergeSessionCoreFields(payloadCoreFields, coreFieldsRef.current);
    const payloadLines = [
      `interaction_action=${parsedInteraction.interactionAction}`,
      parsedInteraction.stateId ? `stateId=${parsedInteraction.stateId}` : "",
      mergedCoreFields.scriptType ? `script_type=${mergedCoreFields.scriptType}` : "",
      mergedCoreFields.scriptContent ? `script_content=${mergedCoreFields.scriptContent}` : "",
      mergedCoreFields.targetAudience ? `target_audience=${mergedCoreFields.targetAudience}` : "",
      mergedCoreFields.expectedEpisodeCount ? `expected_episode_count=${mergedCoreFields.expectedEpisodeCount}` : "",
      parsedInteraction.feedback ? `step_feedback=${parsedInteraction.feedback}` : "",
    ].filter((line) => line.length > 0);
    return normalizeMessageInput(payloadLines.join("\n"));
  }, []);

  const sendMessage = useCallback(async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput) {
      return false;
    }
    let normalizedMessage = normalizeMessageInput(input);
    let displayText: string | undefined;
    let resolveInteractionMessageId: string | undefined;

    if (interactionDraft?.interactionAction === "revise") {
      const payloadLines = [
        "interaction_action=revise",
        interactionDraft.stateId ? `stateId=${interactionDraft.stateId}` : "",
        `step_feedback=${trimmedInput}`,
      ].filter((line) => line.length > 0);
      normalizedMessage = enrichInteractionMessage(payloadLines.join("\n"));
      displayText = formatOutgoingMessage(normalizedMessage);
      resolveInteractionMessageId = interactionDraft.sourceMessageId;
    }
    if (!normalizedMessage) {
      return false;
    }

    const sendOptions: SendMessageOptions = {
      displayText,
      resolveInteractionMessageId,
      resolvedInteractionNote: getInteractionResolvedNote(normalizedMessage),
    };
    const activeSessionId = currentSessionIdRef.current;
    const sent = activeSessionId && isSessionSocketOpen(activeSessionId)
      ? sendNormalizedMessage(normalizedMessage, sendOptions)
      : await queueMessageAndConnect(normalizedMessage, sendOptions);
    if (sent) {
      setInput("");
      setInteractionDraft(undefined);
    }
    return sent;
  }, [enrichInteractionMessage, input, interactionDraft, isSessionSocketOpen, queueMessageAndConnect, sendNormalizedMessage]);

  const runInteractionAction = useCallback(async (messageId: string, action: AgentInteractionAction) => {
    if (action.kind === "send") {
      const normalizedPayload = enrichInteractionMessage(action.payload);
      if (!normalizedPayload) {
        return false;
      }
      const sendOptions: SendMessageOptions = {
        resolveInteractionMessageId: messageId,
        resolvedInteractionNote: getInteractionResolvedNote(normalizedPayload),
      };
      const activeSessionId = currentSessionIdRef.current;
      const sent = activeSessionId && isSessionSocketOpen(activeSessionId)
        ? sendNormalizedMessage(normalizedPayload, sendOptions)
        : await queueMessageAndConnect(normalizedPayload, sendOptions);
      if (sent) {
        setInteractionDraft(undefined);
      }
      return sent;
    }

    const parsedPayload = parseAgentInteractionPayload(action.payload);
    if (parsedPayload?.interactionAction === "revise" || action.payload.includes("interaction_action=")) {
      setInteractionDraft({
        sourceMessageId: messageId,
        interactionAction: parsedPayload?.interactionAction ?? "revise",
        stateId: parsedPayload?.stateId,
      });
      setInput(parsedPayload?.feedback ?? "");
      return true;
    }

    setInteractionDraft(undefined);
    setInput(action.payload);
    return true;
  }, [enrichInteractionMessage, isSessionSocketOpen, queueMessageAndConnect, sendNormalizedMessage]);

  const reconnect = useCallback(async () => {
    disconnect(true);
    return connect();
  }, [connect, disconnect]);

  const clearInteractionDraft = useCallback(() => {
    setInteractionDraft(undefined);
  }, []);

  const handleInputKeyDown = useCallback((event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }
    if (event.nativeEvent.isComposing || inputComposingRef.current) {
      return;
    }
    event.preventDefault();
    if (!selectedRobot?.isAvailable || connecting || sessionLoading || sessionPhase === "starting") {
      return;
    }
    void sendMessage();
  }, [connecting, selectedRobot?.isAvailable, sendMessage, sessionLoading, sessionPhase]);

  const handleCompositionStart = useCallback(() => {
    inputComposingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback(() => {
    inputComposingRef.current = false;
  }, []);

  useEffect(() => {
    const nextSessionId = selectedSession?.sessionId;
    if (nextSessionId && currentSessionIdRef.current === nextSessionId && selectedRobotIdRef.current === selectedRobot?.id) {
      return;
    }

    cancelPendingAttach();
    cancelHistoryLoad();
    rememberSessionSnapshot(currentSessionIdRef.current);
    const robotChanged = Boolean(selectedRobotIdRef.current && selectedRobotIdRef.current !== selectedRobot?.id);
    if (robotChanged) {
      disconnectAllSessions(true);
      resetConversationState();
      selectedRobotIdRef.current = selectedRobot?.id;
      return;
    }
    selectedRobotIdRef.current = selectedRobot?.id;
    setSessionLoading(false);

    if (!nextSessionId) {
      setCurrentSessionId(undefined);
      currentSessionIdRef.current = undefined;
      setConnecting(false);
      setConnected(false);
      restoreSessionSnapshot(undefined);
      return;
    }

    currentSessionIdRef.current = nextSessionId;
    setCurrentSessionId(nextSessionId);
    setError(undefined);
    setNotice(undefined);

    const activeSelectedSession = selectedSessionRef.current;
    const cachedSnapshot = sessionSnapshotsRef.current.get(nextSessionId);
    restoreSessionSnapshot(cachedSnapshot);
    syncSelectedSessionConnectionState(nextSessionId);
    const needsFreshHistory = shouldRefreshHistoryOnSelect(activeSelectedSession, cachedSnapshot);
    setSessionLoading(needsFreshHistory);

    attachTimerRef.current = window.setTimeout(() => {
      if (currentSessionIdRef.current !== nextSessionId) {
        return;
      }
      const latestSelectedSession = selectedSessionRef.current;
      if (!latestSelectedSession || latestSelectedSession.sessionId !== nextSessionId) {
        setSessionLoading(false);
        return;
      }
      if (!needsFreshHistory) {
        setSessionLoading(false);
        if (shouldAutoAttachSession(latestSelectedSession, cachedSnapshot)) {
          void openSocketForSession(latestSelectedSession);
        }
        return;
      }
      void loadHistoryForSession(latestSelectedSession);
    }, SESSION_ATTACH_DEBOUNCE_MS);

    return () => {
      cancelPendingAttach();
      cancelHistoryLoad();
    };
  }, [cancelHistoryLoad, cancelPendingAttach, disconnectAllSessions, loadHistoryForSession, openSocketForSession, rememberSessionSnapshot, resetConversationState, restoreSessionSnapshot, selectedRobot?.id, selectedSession?.sessionId, shouldAutoAttachSession, shouldRefreshHistoryOnSelect, syncSelectedSessionConnectionState]);

  useEffect(() => () => {
    cancelPendingAttach();
    cancelHistoryLoad();
    disconnectAllSessions(true);
  }, [cancelHistoryLoad, cancelPendingAttach, disconnectAllSessions]);

  const hasConversation = messages.length > 0;
  const canSend = Boolean(selectedRobot?.isAvailable)
    && !connecting
    && !sessionLoading
    && sessionPhase !== "starting"
    && input.trim().length > 0
    && (!selectedSession || selectedSession.status === "ACTIVE");
  const assistantIsStreaming = useMemo(
    () => pendingResponse || messages.some((message) => message.role === "assistant" && message.pending),
    [messages, pendingResponse],
  );

  return {
    messages,
    input,
    setInput,
    connecting,
    connected,
    sessionPhase,
    pendingResponse: assistantIsStreaming,
    hasConversation,
    error,
    notice,
    interactionDraft,
    currentSessionId,
    sessionLoading,
    canSend,
    connect,
    disconnect,
    reconnect,
    sendMessage,
    runInteractionAction,
    clearInteractionDraft,
    handleInputKeyDown,
    handleCompositionStart,
    handleCompositionEnd,
    setError,
  };
}
