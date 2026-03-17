"use client";

import { useEffect, useMemo, useRef } from "react";
import { Bot, CheckCircle2, Sparkles, UserRound } from "lucide-react";
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
          "max-w-[min(840px,82vw)] rounded-[28px] px-5 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)]",
          isUser
            ? "bg-[linear-gradient(135deg,#0f172a,#155e75)] text-white"
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
          <div className="mt-3 rounded-[20px] bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-500">
            <div className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              <Sparkles size={14} />
              Thinking
            </div>
            <div className="whitespace-pre-wrap">{message.thinkingContent}</div>
          </div>
        ) : null}

        <div className="mt-3 whitespace-pre-wrap text-[15px] leading-7">
          {message.content || (message.pending ? "正在生成中…" : "")}
        </div>

        {message.interactionResolved && message.interactionResolvedNote ? (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            <CheckCircle2 size={14} />
            {message.interactionResolvedNote}
          </div>
        ) : (
          <MessageInteractionActions message={message} enabled={interactionsEnabled} onAction={onAction} />
        )}
      </div>

      {isUser ? (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-cyan-100 text-cyan-700 shadow-sm">
          <UserRound size={18} />
        </div>
      ) : null}
    </div>
  );
}

export function MessageThread({
  selectedRobot,
  messages,
  pendingResponse,
  selectedSessionTitle,
  emptyNotice,
  interactionsEnabled = true,
  onAction,
}: {
  selectedRobot?: MessageRobotTarget;
  messages: AgentChatMessage[];
  pendingResponse: boolean;
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
    <div ref={containerRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
      {selectedRobot ? (
        messages.length > 0 ? (
          <div className="space-y-4">
            {messages.map((message) => (
              <ChatBubble
                key={message.id}
                message={message}
                interactionsEnabled={interactionsEnabled}
                onAction={onAction}
              />
            ))}

            {pendingResponse && !hasPendingAssistant ? (
              <div className="flex justify-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-slate-900 text-white shadow-sm">
                  <Bot size={18} />
                </div>
                <div className="rounded-[28px] border border-white/80 bg-white/90 px-5 py-4 text-sm text-slate-500 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                  正在思考中…
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
                {emptyNotice ?? "消息页不会走自动路由，你发送的每一条消息都会直达当前机器人。如果这个机器人绑定了 skill 多步协议，下面的对话区也会按步骤继续执行。"}
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
              左侧列表会展示当前实例里真实存在的 agent 绑定，选择后就可以直接进入会话详情。
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
