"use client";

import { useEffect, useMemo, useRef } from "react";
import { Bot, CheckCircle2, LoaderCircle, Sparkles, UserRound } from "lucide-react";
import type { AgentChatMessage, AgentInteractionAction } from "@/lib/agent-session-protocol";
import { cn } from "@/lib/utils";
import { formatInteractionDraftLabel, formatMessageTimestamp } from "./messages-data";
import type { MessageRobotTarget } from "./messages-types";

function MessageInteractionActions({
  message,
  enabled,
  onAction,
}: {
  message: AgentChatMessage;
  enabled: boolean;
  onAction: (messageId: string, action: AgentInteractionAction) => void;
}) {
  if (!enabled || !message.interaction?.actions.length) {
    return null;
  }

  return (
    <div className="mt-4 rounded-[20px] border border-slate-200 bg-slate-50/90 p-3">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        交互步骤
      </div>
      <div className="mt-2 text-sm font-semibold text-slate-900">
        {message.interaction.title || formatInteractionDraftLabel(message.interaction.stateId)}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {message.interaction.actions.map((action) => (
          <button
            key={`${message.id}-${action.id}`}
            type="button"
            onClick={() => onAction(message.id, action)}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-transform duration-300 hover:scale-[1.02]"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatBubble({
  message,
  interactionsEnabled,
  onAction,
}: {
  message: AgentChatMessage;
  interactionsEnabled: boolean;
  onAction: (messageId: string, action: AgentInteractionAction) => void;
}) {
  if (message.role === "system") {
    return (
      <div className="flex justify-center">
        <div className="max-w-[720px] rounded-full bg-slate-100 px-4 py-2 text-xs font-medium text-slate-500">
          {message.content}
        </div>
      </div>
    );
  }

  const isUser = message.role === "user";
  const showThinking = !isUser && Boolean(message.thinkingContent?.trim());
  const messageTime = formatMessageTimestamp(message.emittedAt ?? message.createdAt);

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser ? (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-slate-900 text-white shadow-sm">
          <Bot size={18} />
        </div>
      ) : null}

      <div
        className={cn(
          "min-w-0 max-w-[min(840px,82vw)] overflow-hidden rounded-[28px] px-5 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)]",
          isUser
            ? "bg-[linear-gradient(135deg,#ff7a18,#8b3dff)] text-white shadow-[0_18px_40px_rgba(139,61,255,0.16)]"
            : "border border-white/80 bg-white/90 text-slate-900",
        )}
      >
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className={cn(isUser ? "text-white/70" : "text-slate-500")}>
            {isUser ? "我" : "机器人"}
          </span>
          {messageTime ? (
            <span className={cn(isUser ? "text-white/55" : "text-slate-400")}>
              {messageTime}
            </span>
          ) : null}
        </div>

        {showThinking ? (
          <div className="mt-3 min-w-0 rounded-[20px] bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-500">
            <div className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              <Sparkles size={14} />
              Thinking
            </div>
            <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
              {message.thinkingContent}
            </div>
          </div>
        ) : null}

        <div className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-7 [overflow-wrap:anywhere]">
          {message.content || (message.pending ? "正在思考..." : "")}
        </div>

        {message.interactionResolved && message.interactionResolvedNote ? (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">
            <CheckCircle2 size={14} />
            {message.interactionResolvedNote}
          </div>
        ) : (
          <MessageInteractionActions message={message} enabled={interactionsEnabled} onAction={onAction} />
        )}
      </div>

      {isUser ? (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-violet-50 text-violet-700 shadow-sm">
          <UserRound size={18} />
        </div>
      ) : null}
    </div>
  );
}

function ThreadLoadingSkeleton({
  selectedRobot,
  selectedSessionTitle,
}: {
  selectedRobot?: MessageRobotTarget;
  selectedSessionTitle?: string;
}) {
  return (
    <div className="absolute inset-0 z-10 overflow-hidden bg-[linear-gradient(180deg,rgba(255,250,247,0.82),rgba(255,247,251,0.88)_42%,rgba(248,244,255,0.94)_100%)] backdrop-blur-sm">
      <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(255,122,24,0.12),transparent_52%),radial-gradient(circle_at_top_right,rgba(139,61,255,0.14),transparent_36%)]" />
      <div className="relative flex h-full flex-col px-5 py-5 sm:px-6">
        <div className="rounded-[28px] border border-white/80 bg-white/86 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">
              <LoaderCircle size={14} className="animate-spin" />
              正在加载历史消息
            </div>
            <div className="h-2.5 w-20 animate-pulse rounded-full bg-slate-200" />
          </div>
          <div className="mt-4 text-lg font-bold tracking-[-0.03em] text-slate-900">
            {selectedSessionTitle || selectedRobot?.displayName || "会话详情"}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            正在恢复这段会话的上下文、历史消息与实时状态，请稍候片刻。
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex items-start gap-3 animate-pulse">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-slate-900 text-white shadow-sm">
              <Bot size={18} />
            </div>
            <div className="w-[min(700px,78%)] rounded-[28px] border border-white/80 bg-white/88 px-5 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
              <div className="h-3 w-24 rounded-full bg-slate-200" />
              <div className="mt-4 h-3 w-[85%] rounded-full bg-slate-100" />
              <div className="mt-2 h-3 w-[68%] rounded-full bg-slate-100" />
              <div className="mt-5 rounded-[20px] bg-slate-50 px-4 py-3">
                <div className="h-2.5 w-20 rounded-full bg-slate-200" />
                <div className="mt-3 h-2.5 w-full rounded-full bg-slate-100" />
                <div className="mt-2 h-2.5 w-[76%] rounded-full bg-slate-100" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 animate-pulse">
            <div className="w-[min(560px,64%)] rounded-[28px] bg-[linear-gradient(135deg,rgba(255,122,24,0.8),rgba(139,61,255,0.86))] px-5 py-4 shadow-[0_18px_40px_rgba(139,61,255,0.14)]">
              <div className="h-3 w-20 rounded-full bg-white/35" />
              <div className="mt-4 h-3 w-[80%] rounded-full bg-white/30" />
              <div className="mt-2 h-3 w-[62%] rounded-full bg-white/25" />
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-violet-50 text-violet-700 shadow-sm">
              <UserRound size={18} />
            </div>
          </div>

          <div className="flex items-start gap-3 animate-pulse">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-slate-900 text-white shadow-sm">
              <Bot size={18} />
            </div>
            <div className="w-[min(640px,72%)] rounded-[28px] border border-white/80 bg-white/88 px-5 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
              <div className="h-3 w-28 rounded-full bg-slate-200" />
              <div className="mt-4 h-3 w-[92%] rounded-full bg-slate-100" />
              <div className="mt-2 h-3 w-[74%] rounded-full bg-slate-100" />
              <div className="mt-2 h-3 w-[58%] rounded-full bg-slate-100" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MessageThread({
  selectedRobot,
  messages,
  pendingResponse,
  statusLabel,
  loading = false,
  selectedSessionTitle,
  emptyNotice,
  interactionsEnabled = true,
  onAction,
}: {
  selectedRobot?: MessageRobotTarget;
  messages: AgentChatMessage[];
  pendingResponse: boolean;
  statusLabel?: string;
  loading?: boolean;
  selectedSessionTitle?: string;
  emptyNotice?: string;
  interactionsEnabled?: boolean;
  onAction: (messageId: string, action: AgentInteractionAction) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const hasPendingAssistant = useMemo(
    () => messages.some((message) => message.role === "assistant" && message.pending),
    [messages],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, pendingResponse]);

  return (
    <div ref={containerRef} className="relative min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
      {loading ? <ThreadLoadingSkeleton selectedRobot={selectedRobot} selectedSessionTitle={selectedSessionTitle} /> : null}
      {selectedRobot ? (
        messages.length > 0 || Boolean(statusLabel) ? (
          <div className="space-y-4">
            {messages.map((message) => (
              <ChatBubble
                key={message.id}
                message={message}
                interactionsEnabled={interactionsEnabled}
                onAction={onAction}
              />
            ))}

            {statusLabel && !hasPendingAssistant ? (
              <div className="flex justify-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-slate-900 text-white shadow-sm">
                  <Bot size={18} />
                </div>
                <div className="rounded-[28px] border border-white/80 bg-white/90 px-5 py-4 text-sm text-slate-500 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                  {statusLabel}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex h-full min-h-[360px] items-center justify-center">
            <div className="max-w-[560px] rounded-[32px] border border-dashed border-slate-200 bg-white/80 px-8 py-10 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-slate-100 text-slate-800">
                <Bot size={24} />
              </div>
              <div className="mt-5 text-[24px] font-black tracking-[-0.04em] text-slate-950">
                {selectedSessionTitle ? `查看会话：${selectedSessionTitle}` : `开始和 ${selectedRobot.displayName} 对话`}
              </div>
              <div className="mt-3 text-sm leading-7 text-slate-500">
                {emptyNotice ?? "消息页不会自动路由；你发送的每一条消息都会直接发给当前机器人。若它绑定了多步 Skill 协作，也会在本会话中继续执行。"}
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="flex h-full min-h-[360px] items-center justify-center">
          <div className="max-w-[520px] rounded-[32px] border border-dashed border-slate-200 bg-white/80 px-8 py-10 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-slate-100 text-slate-800">
              <Bot size={24} />
            </div>
            <div className="mt-5 text-[24px] font-black tracking-[-0.04em] text-slate-950">
              先选择一个机器人
            </div>
            <div className="mt-3 text-sm leading-7 text-slate-500">
              左侧列表展示当前实例下真实可用的 Agent，选中后即可进入对应会话详情。
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
