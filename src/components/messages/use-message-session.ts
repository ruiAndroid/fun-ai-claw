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
import type { MessageInteractionDraft, MessageRobotTarget } from "./messages-types";
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
    id: message.providerMessageId?.trim() || `${message.eventType}-${message.createdAt}-${index}`,
    role,
    content: message.content ?? "",
    thinkingContent: message.thinkingContent ?? undefined,
    pending: message.pending,
    interaction: (message.interaction ?? undefined) as AgentInteraction | undefined,
    createdAt: message.createdAt,
    emittedAt: message.emittedAt ?? message.createdAt,
  };
}

function mergeHistoryWithSnapshot(historyMessages: AgentChatMessage[], snapshot?: SessionSnapshot) {
  if (!snapshot) {
    return historyMessages;
  }
  return snapshot.messages.reduce((current, message) => upsertAgentMessage(current, message), historyMessages);
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
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [interactionDraft, setInteractionDraft] = useState<MessageInteractionDraft>();
  const [currentSessionId, setCurrentSessionId] = useState<string>();
  const [sessionLoading, setSessionLoading] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const suppressedSocketClosuresRef = useRef<WeakSet<WebSocket>>(new WeakSet());
  const queuedMessageRef = useRef<QueuedMessage | null>(null);
  const inputComposingRef = useRef(false);
  const rawLineBufferRef = useRef("");
  const rawAssistantMessageIdRef = useRef<string | undefined>(undefined);
  const localMessageSeqRef = useRef(0);
  const selectedRobotIdRef = useRef<string | undefined>(undefined);
  const currentSessionIdRef = useRef<string | undefined>(undefined);
  const coreFieldsRef = useRef<AgentSessionCoreFields | undefined>(undefined);
  const historyLoadedRef = useRef(false);
  const messagesRef = useRef<AgentChatMessage[]>([]);
  const pendingResponseRef = useRef(false);
  const resumableSessionIdsRef = useRef<Set<string>>(new Set());
  const manuallyPausedSessionIdsRef = useRef<Set<string>>(new Set());
  const sessionSnapshotsRef = useRef<Map<string, SessionSnapshot>>(new Map());
  const connectAbortControllerRef = useRef<AbortController | null>(null);
  const historyAbortControllerRef = useRef<AbortController | null>(null);
  const attachTimerRef = useRef<number | null>(null);

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

  const cancelConnectAttempt = useCallback(() => {
    connectAbortControllerRef.current?.abort();
    connectAbortControllerRef.current = null;
  }, []);

  const resetConversationState = useCallback(() => {
    setMessages([]);
    setPendingResponse(false);
    setConnecting(false);
    setConnected(false);
    setError(undefined);
    setNotice(undefined);
    setInteractionDraft(undefined);
    rawLineBufferRef.current = "";
    rawAssistantMessageIdRef.current = undefined;
    coreFieldsRef.current = undefined;
    historyLoadedRef.current = false;
    localMessageSeqRef.current = 0;
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    pendingResponseRef.current = pendingResponse;
  }, [pendingResponse]);

  const rememberSessionSnapshot = useCallback((sessionId?: string) => {
    if (!sessionId) {
      return;
    }
    sessionSnapshotsRef.current.set(sessionId, {
      messages: messagesRef.current,
      pendingResponse: pendingResponseRef.current || messagesRef.current.some((message) => message.pending),
      coreFields: coreFieldsRef.current,
      historyLoaded: historyLoadedRef.current,
    });
  }, []);

  const restoreSessionSnapshot = useCallback((snapshot?: SessionSnapshot) => {
    setMessages(snapshot?.messages ?? []);
    setPendingResponse(Boolean(snapshot?.pendingResponse || snapshot?.messages.some((message) => message.pending)));
    coreFieldsRef.current = snapshot?.coreFields;
    historyLoadedRef.current = Boolean(snapshot?.historyLoaded);
  }, []);

  const shouldAutoAttachSession = useCallback((targetSession?: MessageSessionListItem, snapshot?: SessionSnapshot) => {
    const targetSessionId = targetSession?.sessionId;
    if (!targetSessionId || targetSession?.status !== "ACTIVE") {
      return false;
    }
    if (manuallyPausedSessionIdsRef.current.has(targetSessionId)) {
      return false;
    }
    return Boolean(targetSession.remoteConnected || targetSession.generating || resumableSessionIdsRef.current.has(targetSessionId) || snapshot?.pendingResponse);
  }, []);

  const shouldRefreshHistoryOnSelect = useCallback((targetSession?: MessageSessionListItem, snapshot?: SessionSnapshot) => {
    const targetSessionId = targetSession?.sessionId;
    if (!targetSessionId) {
      return false;
    }
    if (!snapshot?.historyLoaded) {
      return Boolean(
        targetSession.hasTranscript
        || targetSession.remoteConnected
        || targetSession.generating
        || resumableSessionIdsRef.current.has(targetSessionId),
      );
    }
    if (targetSession.status !== "ACTIVE") {
      return false;
    }
    return Boolean(
      targetSession.remoteConnected
      || targetSession.generating
      || resumableSessionIdsRef.current.has(targetSessionId)
      || snapshot.pendingResponse,
    );
  }, []);

  const markInteractionResolved = useCallback((messageId?: string, note?: string) => {
    if (!messageId) {
      return;
    }
    setMessages((current) => current.map((message) => (
      message.id === messageId ? { ...message, interactionResolved: true, interactionResolvedNote: note } : message
    )));
  }, []);

  const finalizeRawAssistantMessage = useCallback(() => {
    const messageId = rawAssistantMessageIdRef.current;
    if (!messageId) {
      return;
    }
    setMessages((current) => current.map((message) => (
      message.id === messageId ? { ...message, pending: false } : message
    )));
    rawAssistantMessageIdRef.current = undefined;
  }, []);

  const appendRawAssistantChunk = useCallback((chunk: string) => {
    if (!chunk) {
      return;
    }
    historyLoadedRef.current = true;
    setPendingResponse(true);
    setMessages((current) => {
      const messageId = rawAssistantMessageIdRef.current ?? nextLocalMessageId(localMessageSeqRef, "assistant-raw");
      rawAssistantMessageIdRef.current = messageId;
      const existingIndex = current.findIndex((message) => message.id === messageId);
      const nextMessage: AgentChatMessage = existingIndex >= 0
        ? { ...current[existingIndex], content: `${current[existingIndex].content}${chunk}`, pending: true }
        : { id: messageId, role: "assistant", content: chunk, pending: true, createdAt: new Date().toISOString() };
      return upsertAgentMessage(current, nextMessage);
    });
  }, []);

  const processRawLine = useCallback((rawLine: string) => {
    const normalizedLine = rawLine.replace(/\r$/, "");
    const trimmedLine = normalizedLine.trim();
    if (!trimmedLine) {
      appendRawAssistantChunk("\n");
      return;
    }
    if (normalizedLine.startsWith("[system]")) {
      finalizeRawAssistantMessage();
      const systemContent = normalizedLine.replace(/^\[system\]\s*/, "");
      setMessages((current) => [...current, {
        id: nextLocalMessageId(localMessageSeqRef, "system"),
        role: "system",
        content: systemContent,
        createdAt: new Date().toISOString(),
      }]);
      historyLoadedRef.current = true;
      return;
    }
    if (trimmedLine === "🦀 ZeroClaw Interactive Mode" || trimmedLine === "Type /help for commands.") {
      return;
    }
    if (trimmedLine === ">") {
      finalizeRawAssistantMessage();
      setPendingResponse(false);
      return;
    }
    if (trimmedLine.startsWith(">")) {
      const lineAfterPrompt = trimmedLine.slice(1).trim();
      if (!lineAfterPrompt || lineAfterPrompt.startsWith("[you]") || isRawLogLine(lineAfterPrompt)) {
        return;
      }
      appendRawAssistantChunk(`${lineAfterPrompt}\n`);
      return;
    }
    if (isRawLogLine(trimmedLine)) {
      if (trimmedLine.includes("turn.complete")) {
        finalizeRawAssistantMessage();
        setPendingResponse(false);
        void refreshSessions?.();
      }
      return;
    }
    appendRawAssistantChunk(`${normalizedLine}\n`);
  }, [appendRawAssistantChunk, finalizeRawAssistantMessage, refreshSessions]);

  const processRawChunk = useCallback((chunk: string) => {
    if (!chunk) {
      return;
    }
    rawLineBufferRef.current += chunk;
    let newlineIndex = rawLineBufferRef.current.indexOf("\n");
    while (newlineIndex >= 0) {
      const nextLine = rawLineBufferRef.current.slice(0, newlineIndex);
      rawLineBufferRef.current = rawLineBufferRef.current.slice(newlineIndex + 1);
      processRawLine(nextLine);
      newlineIndex = rawLineBufferRef.current.indexOf("\n");
    }
  }, [processRawLine]);

  const handleSocketMessage = useCallback((data: string) => {
    const frame = parseAgentSessionFrame(data);
    if (!frame) {
      processRawChunk(data);
      return;
    }
    finalizeRawAssistantMessage();
    if (frame.eventType === "debug") {
      return;
    }
    if (frame.eventType === "delta" && frame.delta) {
      historyLoadedRef.current = true;
      setPendingResponse(true);
      setMessages((current) => applyAgentDelta(current, frame.delta!));
      return;
    }
    if (frame.eventType === "message" && frame.message) {
      const normalizedMessage = normalizeStructuredAgentChatMessage(frame.message);
      if (!normalizedMessage) {
        return;
      }
      historyLoadedRef.current = true;
      setMessages((current) => upsertAgentMessage(current, normalizedMessage));
      if (normalizedMessage.role === "assistant" && !normalizedMessage.pending) {
        setPendingResponse(false);
        void refreshSessions?.();
      }
    }
  }, [finalizeRawAssistantMessage, processRawChunk, refreshSessions]);

  const disconnect = useCallback((silent = false) => {
    cancelPendingAttach();
    cancelConnectAttempt();
    const socket = socketRef.current;
    const activeSessionId = currentSessionIdRef.current;
    rememberSessionSnapshot(activeSessionId);
    if (activeSessionId) {
      if (silent) {
        resumableSessionIdsRef.current.add(activeSessionId);
      } else {
        manuallyPausedSessionIdsRef.current.add(activeSessionId);
      }
    }
    if (!socket) {
      setConnecting(false);
      setConnected(false);
      setPendingResponse(false);
      return;
    }
    if (silent) {
      suppressedSocketClosuresRef.current.add(socket);
    }
    socketRef.current = null;
    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      socket.close();
    }
    setConnecting(false);
    setConnected(false);
    setPendingResponse(false);
  }, [cancelConnectAttempt, cancelPendingAttach, rememberSessionSnapshot]);

  const sendNormalizedMessage = useCallback((normalizedMessage: string, options?: SendMessageOptions) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }
    const parsedCoreFields = parseAgentSessionCoreFields(normalizedMessage);
    if (parsedCoreFields) {
      coreFieldsRef.current = parsedCoreFields;
    }
    const sentAt = new Date().toISOString();
    const userMessage: AgentChatMessage = {
      id: nextLocalMessageId(localMessageSeqRef, "user"),
      role: "user",
      content: options?.displayText ?? formatOutgoingMessage(normalizedMessage),
      createdAt: sentAt,
    };
    historyLoadedRef.current = true;
    setMessages((current) => [...current, userMessage]);
    setPendingResponse(true);
    setNotice(undefined);
    setError(undefined);
    markInteractionResolved(options?.resolveInteractionMessageId, options?.resolvedInteractionNote);
    socket.send(`${normalizedMessage}\n`);
    void refreshSessions?.();
    return true;
  }, [markInteractionResolved, refreshSessions]);

  const openSocketForSession = useCallback(async (targetSession: MessageSessionListItem) => {
    if (!selectedRobot) {
      return false;
    }
    if (!selectedRobot.isAvailable) {
      setError(messagePageText.robotUnavailable);
      return false;
    }
    if (targetSession.status !== "ACTIVE") {
      setError("当前会话已关闭，请新建会话后再继续");
      return false;
    }
    if (connecting && currentSessionIdRef.current === targetSession.sessionId) {
      return true;
    }
    if (socketRef.current?.readyState === WebSocket.OPEN && currentSessionIdRef.current === targetSession.sessionId) {
      setConnected(true);
      return true;
    }

    cancelConnectAttempt();
    setConnecting(true);
    setConnected(false);
    setError(undefined);
    setNotice(undefined);
    currentSessionIdRef.current = targetSession.sessionId;
    setCurrentSessionId(targetSession.sessionId);

    const connectController = new AbortController();
    connectAbortControllerRef.current = connectController;

    let connectionInfo;
    try {
      connectionInfo = await connectConsumerChatSession(targetSession.sessionId, { signal: connectController.signal });
    } catch (connectError) {
      if (connectAbortControllerRef.current === connectController) {
        connectAbortControllerRef.current = null;
      }
      if (connectController.signal.aborted || isAbortLikeError(connectError)) {
        return false;
      }
      setConnecting(false);
      setConnected(false);
      setError(connectError instanceof Error ? connectError.message : messagePageText.sessionConnectFailed);
      return false;
    }

    if (connectAbortControllerRef.current !== connectController || connectController.signal.aborted) {
      return false;
    }
    connectAbortControllerRef.current = null;

    const websocketUrl = buildMessageSessionWebSocketUrl(connectionInfo.websocketPath);
    if (!websocketUrl) {
      setConnecting(false);
      setConnected(false);
      setError(messagePageText.sessionConnectFailed);
      return false;
    }

    const socket = new WebSocket(websocketUrl);
    socketRef.current = socket;
    selectedRobotIdRef.current = selectedRobot.id;
    let connectionEstablished = false;

    socket.onopen = () => {
      if (socketRef.current !== socket || currentSessionIdRef.current !== targetSession.sessionId) {
        suppressedSocketClosuresRef.current.add(socket);
        socket.close();
        return;
      }
      connectionEstablished = true;
      setConnecting(false);
      setConnected(true);
      setError(undefined);
      setNotice(undefined);
      resumableSessionIdsRef.current.add(targetSession.sessionId);
      manuallyPausedSessionIdsRef.current.delete(targetSession.sessionId);
      const queuedMessage = queuedMessageRef.current;
      if (queuedMessage) {
        const sent = sendNormalizedMessage(queuedMessage.normalizedMessage, queuedMessage);
        if (sent) {
          queuedMessageRef.current = null;
        }
      }
    };

    socket.onmessage = (event) => {
      if (socketRef.current !== socket || currentSessionIdRef.current !== targetSession.sessionId) {
        return;
      }
      if (typeof event.data === "string") {
        handleSocketMessage(event.data);
      }
    };

    socket.onerror = () => {
      if (socketRef.current !== socket || currentSessionIdRef.current !== targetSession.sessionId) {
        return;
      }
      setError(messagePageText.sessionConnectFailed);
    };

    socket.onclose = () => {
      const isCurrentSession = currentSessionIdRef.current === targetSession.sessionId;
      const shouldSuppressNotice = suppressedSocketClosuresRef.current.has(socket);
      suppressedSocketClosuresRef.current.delete(socket);
      if (isCurrentSession && rawLineBufferRef.current.trim()) {
        processRawLine(rawLineBufferRef.current);
        rawLineBufferRef.current = "";
      }
      if (isCurrentSession) {
        finalizeRawAssistantMessage();
      }
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
      if (isCurrentSession) {
        setConnecting(false);
        setConnected(false);
        setPendingResponse(false);
      }
      if (!shouldSuppressNotice && isCurrentSession && selectedRobotIdRef.current === selectedRobot.id) {
        setNotice(connectionEstablished ? messagePageText.sessionDisconnected : messagePageText.sessionInterrupted);
      }
      void refreshSessions?.();
    };

    return true;
  }, [
    cancelConnectAttempt,
    connecting,
    finalizeRawAssistantMessage,
    handleSocketMessage,
    processRawLine,
    refreshSessions,
    selectedRobot,
    sendNormalizedMessage,
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
        return false;
      }
      const historyMessages = response.items
        .map((item, index) => normalizeHistoryMessage(item, index))
        .filter((item): item is AgentChatMessage => item !== null);
      const cachedSnapshot = sessionSnapshotsRef.current.get(sessionId);
      const nextMessages = mergeHistoryWithSnapshot(historyMessages, cachedSnapshot);
      const nextPendingResponse = Boolean(cachedSnapshot?.pendingResponse || nextMessages.some((message) => message.pending));
      const nextSnapshot: SessionSnapshot = {
        messages: nextMessages,
        pendingResponse: nextPendingResponse,
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
      disconnect(true);
      resetConversationState();
      currentSessionIdRef.current = targetSession.sessionId;
      setCurrentSessionId(targetSession.sessionId);
      const cachedSnapshot = sessionSnapshotsRef.current.get(targetSession.sessionId);
      if (cachedSnapshot) {
        restoreSessionSnapshot(cachedSnapshot);
      }
    }
    return openSocketForSession(targetSession);
  }, [disconnect, ensureSession, openSocketForSession, rememberSessionSnapshot, resetConversationState, restoreSessionSnapshot, selectedRobot, selectedSession]);

  const queueMessageAndConnect = useCallback(async (normalizedMessage: string, options?: SendMessageOptions) => {
    if (!selectedRobot) {
      return false;
    }
    if (!selectedRobot.isAvailable) {
      setError(messagePageText.robotUnavailable);
      return false;
    }
    queuedMessageRef.current = { normalizedMessage, ...options };
    return connect();
  }, [connect, selectedRobot]);

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
    const sent = connected ? sendNormalizedMessage(normalizedMessage, sendOptions) : await queueMessageAndConnect(normalizedMessage, sendOptions);
    if (sent) {
      setInput("");
      setInteractionDraft(undefined);
    }
    return sent;
  }, [connected, enrichInteractionMessage, input, interactionDraft, queueMessageAndConnect, sendNormalizedMessage]);

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
      const sent = connected ? sendNormalizedMessage(normalizedPayload, sendOptions) : await queueMessageAndConnect(normalizedPayload, sendOptions);
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
  }, [connected, enrichInteractionMessage, queueMessageAndConnect, sendNormalizedMessage]);

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
    if (!selectedRobot?.isAvailable || connecting || sessionLoading) {
      return;
    }
    void sendMessage();
  }, [connecting, selectedRobot?.isAvailable, sendMessage, sessionLoading]);

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
    disconnect(true);
    resetConversationState();
    selectedRobotIdRef.current = selectedRobot?.id;
    setSessionLoading(false);

    if (!nextSessionId) {
      setCurrentSessionId(undefined);
      currentSessionIdRef.current = undefined;
      return;
    }

    currentSessionIdRef.current = nextSessionId;
    setCurrentSessionId(nextSessionId);
    setError(undefined);
    setNotice(undefined);

    const cachedSnapshot = sessionSnapshotsRef.current.get(nextSessionId);
    restoreSessionSnapshot(cachedSnapshot);
    const needsFreshHistory = shouldRefreshHistoryOnSelect(selectedSession, cachedSnapshot);
    setSessionLoading(needsFreshHistory);

    attachTimerRef.current = window.setTimeout(() => {
      if (currentSessionIdRef.current !== nextSessionId) {
        return;
      }
      if (!selectedSession) {
        setSessionLoading(false);
        return;
      }
      if (!needsFreshHistory) {
        setSessionLoading(false);
        if (shouldAutoAttachSession(selectedSession, cachedSnapshot)) {
          void openSocketForSession(selectedSession);
        }
        return;
      }
      void loadHistoryForSession(selectedSession);
    }, SESSION_ATTACH_DEBOUNCE_MS);

    return () => {
      cancelPendingAttach();
      cancelHistoryLoad();
    };
  }, [cancelHistoryLoad, cancelPendingAttach, disconnect, loadHistoryForSession, openSocketForSession, rememberSessionSnapshot, resetConversationState, restoreSessionSnapshot, selectedRobot?.id, selectedSession, shouldAutoAttachSession, shouldRefreshHistoryOnSelect]);

  useEffect(() => () => {
    cancelPendingAttach();
    cancelHistoryLoad();
    disconnect(true);
  }, [cancelHistoryLoad, cancelPendingAttach, disconnect]);

  const hasConversation = messages.length > 0;
  const canSend = Boolean(selectedRobot?.isAvailable)
    && !connecting
    && !sessionLoading
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
