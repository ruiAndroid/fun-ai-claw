"use client";

import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { PenSquare, SendHorizonal, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatInteractionDraftLabel } from "./messages-data";
import type { MessageInteractionDraft, MessageRobotTarget } from "./messages-types";

export function MessageComposer({
  selectedRobot,
  input,
  canSend,
  connecting,
  connected,
  interactionDraft,
  viewOnly = false,
  viewOnlyHint,
  onInputChange,
  onSend,
  onCancelDraft,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
}: {
  selectedRobot?: MessageRobotTarget;
  input: string;
  canSend: boolean;
  connecting: boolean;
  connected: boolean;
  interactionDraft?: MessageInteractionDraft;
  viewOnly?: boolean;
  viewOnlyHint?: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onCancelDraft: () => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLTextAreaElement>) => void;
  onCompositionStart: () => void;
  onCompositionEnd: () => void;
}) {
  const disabled = !selectedRobot?.isAvailable || connecting || viewOnly;
  const placeholder = !selectedRobot
    ? "请先从左侧选择机器人"
    : !selectedRobot.isAvailable
      ? "当前机器人未运行，暂时无法发送消息"
      : viewOnly
        ? viewOnlyHint ?? "当前选中的是其他会话，本版先支持查看；继续聊天请切回当前会话或新建会话"
      : interactionDraft
        ? `请输入你对「${formatInteractionDraftLabel(interactionDraft.stateId)}」的修改意见`
        : connected
          ? "继续给当前机器人发送消息，Enter 发送，Shift + Enter 换行"
          : "输入消息后会自动建立会话连接，Enter 发送，Shift + Enter 换行";

  return (
    <div className="border-t border-slate-200/80 bg-white/88 px-5 py-4 backdrop-blur-xl sm:px-6">
      {interactionDraft ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[22px] bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <div className="flex items-center gap-2">
            <Sparkles size={16} />
            当前正在修改：{formatInteractionDraftLabel(interactionDraft.stateId)}
          </div>
          <button
            type="button"
            onClick={onCancelDraft}
            className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 shadow-sm"
          >
            取消修改
          </button>
        </div>
      ) : null}

      <div className="rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,252,0.94))] p-3 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <div className="flex items-center gap-2 px-2 pb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          <PenSquare size={14} />
          Message Composer
        </div>

        <textarea
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={onKeyDown}
          onCompositionStart={onCompositionStart}
          onCompositionEnd={onCompositionEnd}
          disabled={disabled}
          placeholder={placeholder}
          className="min-h-[112px] w-full resize-none rounded-[24px] border border-slate-100 bg-white px-4 py-4 text-[15px] leading-7 text-slate-900 outline-none transition focus:border-cyan-200 focus:ring-4 focus:ring-cyan-50 disabled:cursor-not-allowed disabled:bg-slate-50"
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs leading-6 text-slate-500">
            {selectedRobot
              ? viewOnly
                ? "当前处于会话查看模式"
                : `当前发送对象：${selectedRobot.displayName} · ${selectedRobot.agentId}`
              : "选择机器人后即可开始消息会话"}
          </div>

          <button
            type="button"
            onClick={onSend}
            disabled={!canSend}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-sm transition-transform duration-300",
              canSend
                ? "bg-slate-950 hover:scale-[1.02]"
                : "cursor-not-allowed bg-slate-300",
            )}
          >
            <SendHorizonal size={16} />
            发送消息
          </button>
        </div>
      </div>
    </div>
  );
}
