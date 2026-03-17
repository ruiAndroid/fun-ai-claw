"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  normalizeStructuredAgentChatMessage,
  parseAgentInteractionPayload,
  parseAgentSessionCoreFields,
  parseAgentSessionFrame,
  type AgentChatMessage,
  type AgentInteractionAction,
  type AgentSessionCoreFields,
  type AgentSessionDelta,
} from "@/lib/agent-session-protocol";
import {
  buildMessageSessionWebSocketUrl,
  formatOutgoingMessage,
  getInteractionResolvedNote,
  mergeSessionCoreFields,
  messagePageText,
  normalizeMessageInput,
} from "./messages-data";
import type { MessageInteractionDraft, MessageRobotTarget } from "./messages-types";

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
    ? {
      ...item,
      ...nextMessage,
      createdAt: item.createdAt ?? nextMessage.createdAt,
      emittedAt: nextMessage.emittedAt ?? item.emittedAt,
    }
    : item));
}

function applyAgentDelta(messages: AgentChatMessage[], delta: AgentSessionDelta) {
  const existingIndex = messages.findIndex((item) => item.id === delta.messageId);
  const currentMessage = existingIndex >= 0
    ? messages[existingIndex]
    : {
      id: delta.messageId,
      role: delta.role,
      content: "",
      thinkingContent: "",
      pending: delta.role === "assistant",
      emittedAt: delta.emittedAt,
    } satisfies AgentChatMessage;

  const nextMessage: AgentChatMessage = {
    ...currentMessage,
    role: delta.role,
    pending: delta.role === "assistant",
    emittedAt: delta.emittedAt,
    thinkingContent: delta.channel === "thinking"
      ? delta.operation === "clear"
        ? ""
        : `${currentMessage.thinkingContent ?? ""}${delta.chunk ?? ""}`
      : currentMessage.thinkingContent,
    content: delta.channel === "content"
      ? delta.operation === "clear"
        ? ""
        : `${currentMessage.content}${delta.chunk ?? ""}`
      : currentMessage.content,
  };

  return upsertAgentMessage(messages, nextMessage);
}

function isInternalRawSystemMessage(line: string) {
  const normalizedLine = line.trim();
  if (!normalizedLine) {
    return true;
  }
  const ignoredPrefixes = [
    "connected:",
    "agent session ready:",
    "tip:",
  ];
  return ignoredPrefixes.some((prefix) => normalizedLine.startsWith(prefix));
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

export function useMessageSession(selectedRobot?: MessageRobotTarget) {
  const [messages, setMessages] = useState<AgentChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [pendingResponse, setPendingResponse] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [interactionDraft, setInteractionDraft] = useState<MessageInteractionDraft>();

  const socketRef = useRef<WebSocket | null>(null);
  const queuedMessageRef = useRef<QueuedMessage | null>(null);
  const inputComposingRef = useRef(false);
  const rawLineBufferRef = useRef("");
  const rawAssistantMessageIdRef = useRef<string | undefined>(undefined);
  const coreFieldsRef = useRef<AgentSessionCoreFields | undefined>(undefined);
  const localMessageSeqRef = useRef(0);
  const shouldSuppressCloseNoticeRef = useRef(false);
  const selectedRobotIdRef = useRef<string | undefined>(undefined);

  const resetConversationState = useCallback(() => {
    setMessages([]);
    setInput("");
    setPendingResponse(false);
    setError(undefined);
    setNotice(undefined);
    setInteractionDraft(undefined);
    queuedMessageRef.current = null;
    rawLineBufferRef.current = "";
    rawAssistantMessageIdRef.current = undefined;
    coreFieldsRef.current = undefined;
  }, []);

  const markInteractionResolved = useCallback((messageId?: string, note?: string) => {
    if (!messageId) {
      return;
    }
    setMessages((current) => current.map((message) => (
      message.id === messageId
        ? {
          ...message,
          interactionResolved: true,
          interactionResolvedNote: note,
        }
        : message
    )));
  }, []);

  const finalizeRawAssistantMessage = useCallback(() => {
    const messageId = rawAssistantMessageIdRef.current;
    if (!messageId) {
      return;
    }
    setMessages((current) => current.map((message) => (
      message.id === messageId
        ? {
          ...message,
          pending: false,
        }
        : message
    )));
    rawAssistantMessageIdRef.current = undefined;
  }, []);

  const appendRawAssistantChunk = useCallback((chunk: string) => {
    const normalizedChunk = chunk;
    if (!normalizedChunk) {
      return;
    }
    setPendingResponse(true);
    setMessages((current) => {
      const messageId = rawAssistantMessageIdRef.current ?? nextLocalMessageId(localMessageSeqRef, "assistant-raw");
      rawAssistantMessageIdRef.current = messageId;
      const existingIndex = current.findIndex((message) => message.id === messageId);
      const nextMessage: AgentChatMessage = existingIndex >= 0
        ? {
          ...current[existingIndex],
          content: `${current[existingIndex].content}${normalizedChunk}`,
          pending: true,
        }
        : {
          id: messageId,
          role: "assistant",
          content: normalizedChunk,
          pending: true,
          createdAt: new Date().toISOString(),
        };
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
      if (!isInternalRawSystemMessage(systemContent)) {
        setMessages((current) => [...current, {
          id: nextLocalMessageId(localMessageSeqRef, "system"),
          role: "system",
          content: systemContent,
          createdAt: new Date().toISOString(),
        }]);
      }
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
      }
      return;
    }

    appendRawAssistantChunk(`${normalizedLine}\n`);
  }, [appendRawAssistantChunk, finalizeRawAssistantMessage]);

  const processRawChunk = useCallback((chunk: string) => {
    rawLineBufferRef.current += chunk;
    const lines = rawLineBufferRef.current.split("\n");
    rawLineBufferRef.current = lines.pop() ?? "";
    lines.forEach((line) => processRawLine(line));
  }, [processRawLine]);

  const disconnect = useCallback((silent = false) => {
    const socket = socketRef.current;
    socketRef.current = null;
    shouldSuppressCloseNoticeRef.current = Boolean(socket) && silent;
    if (socket) {
      socket.close();
    }
    setConnecting(false);
    setConnected(false);
  }, []);

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
      setPendingResponse(true);
      setMessages((current) => applyAgentDelta(current, frame.delta!));
      return;
    }

    if (frame.eventType === "message" && frame.message) {
      const normalizedMessage = normalizeStructuredAgentChatMessage(frame.message);
      if (!normalizedMessage) {
        return;
      }
      setMessages((current) => upsertAgentMessage(current, normalizedMessage));
      if (normalizedMessage.role === "assistant" && !normalizedMessage.pending) {
        setPendingResponse(false);
      }
    }
  }, [finalizeRawAssistantMessage, processRawChunk]);

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

    setMessages((current) => [...current, userMessage]);
    setPendingResponse(true);
    setNotice(undefined);
    setError(undefined);
    markInteractionResolved(options?.resolveInteractionMessageId, options?.resolvedInteractionNote);
    socket.send(`${normalizedMessage}\n`);
    return true;
  }, [markInteractionResolved]);

  const connect = useCallback(() => {
    if (!selectedRobot) {
      return false;
    }
    if (!selectedRobot.isAvailable) {
      setError(messagePageText.robotUnavailable);
      return false;
    }
    if (connecting) {
      return true;
    }
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      setConnected(true);
      return true;
    }

    disconnect(true);
    setConnecting(true);
    setConnected(false);
    setError(undefined);
    setNotice(undefined);

    const socket = new WebSocket(buildMessageSessionWebSocketUrl(selectedRobot.instanceId, selectedRobot.agentId));
    socketRef.current = socket;
    selectedRobotIdRef.current = selectedRobot.id;
    let connectionEstablished = false;

    socket.onopen = () => {
      connectionEstablished = true;
      setConnecting(false);
      setConnected(true);
      setNotice(undefined);
      const queuedMessage = queuedMessageRef.current;
      if (queuedMessage) {
        const sent = sendNormalizedMessage(queuedMessage.normalizedMessage, queuedMessage);
        if (sent) {
          queuedMessageRef.current = null;
        }
      }
    };

    socket.onmessage = (event) => {
      if (typeof event.data === "string") {
        handleSocketMessage(event.data);
      }
    };

    socket.onerror = () => {
      setError(messagePageText.sessionConnectFailed);
    };

    socket.onclose = () => {
      if (rawLineBufferRef.current.trim()) {
        processRawLine(rawLineBufferRef.current);
        rawLineBufferRef.current = "";
      }
      finalizeRawAssistantMessage();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
      setConnecting(false);
      setConnected(false);
      setPendingResponse(false);
      const shouldSuppressNotice = shouldSuppressCloseNoticeRef.current;
      shouldSuppressCloseNoticeRef.current = false;
      if (!shouldSuppressNotice && selectedRobotIdRef.current === selectedRobot.id) {
        setNotice(connectionEstablished ? messagePageText.sessionDisconnected : messagePageText.sessionInterrupted);
      }
    };

    return true;
  }, [
    connecting,
    disconnect,
    finalizeRawAssistantMessage,
    handleSocketMessage,
    processRawLine,
    selectedRobot,
    sendNormalizedMessage,
  ]);

  const queueMessageAndConnect = useCallback((normalizedMessage: string, options?: SendMessageOptions) => {
    if (!selectedRobot) {
      return false;
    }
    if (!selectedRobot.isAvailable) {
      setError(messagePageText.robotUnavailable);
      return false;
    }
    queuedMessageRef.current = {
      normalizedMessage,
      ...options,
    };
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

  const sendMessage = useCallback(() => {
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

    const sent = connected
      ? sendNormalizedMessage(normalizedMessage, sendOptions)
      : queueMessageAndConnect(normalizedMessage, sendOptions);

    if (sent) {
      setInput("");
      setInteractionDraft(undefined);
    }

    return sent;
  }, [connected, enrichInteractionMessage, input, interactionDraft, queueMessageAndConnect, sendNormalizedMessage]);

  const runInteractionAction = useCallback((messageId: string, action: AgentInteractionAction) => {
    if (action.kind === "send") {
      const normalizedPayload = enrichInteractionMessage(action.payload);
      if (!normalizedPayload) {
        return false;
      }
      const sendOptions: SendMessageOptions = {
        resolveInteractionMessageId: messageId,
        resolvedInteractionNote: getInteractionResolvedNote(normalizedPayload),
      };
      const sent = connected
        ? sendNormalizedMessage(normalizedPayload, sendOptions)
        : queueMessageAndConnect(normalizedPayload, sendOptions);
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

  const reconnect = useCallback(() => {
    disconnect(true);
    return connect();
  }, [connect, disconnect]);

  const startNewSession = useCallback(() => {
    disconnect(true);
    resetConversationState();
  }, [disconnect, resetConversationState]);

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
    if (!selectedRobot?.isAvailable || connecting) {
      return;
    }
    sendMessage();
  }, [connecting, selectedRobot?.isAvailable, sendMessage]);

  const handleCompositionStart = useCallback(() => {
    inputComposingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback(() => {
    inputComposingRef.current = false;
  }, []);

  useEffect(() => {
    const currentRobotId = selectedRobot?.id;
    if (selectedRobotIdRef.current === currentRobotId) {
      return;
    }
    selectedRobotIdRef.current = currentRobotId;
    disconnect(true);
    resetConversationState();
  }, [disconnect, resetConversationState, selectedRobot?.id]);

  useEffect(() => () => {
    disconnect(true);
  }, [disconnect]);

  const hasConversation = messages.length > 0;
  const canSend = Boolean(selectedRobot?.isAvailable) && !connecting && input.trim().length > 0;
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
    canSend,
    connect,
    disconnect,
    reconnect,
    sendMessage,
    runInteractionAction,
    startNewSession,
    clearInteractionDraft,
    handleInputKeyDown,
    handleCompositionStart,
    handleCompositionEnd,
  };
}
