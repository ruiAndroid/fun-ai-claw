"use client";

import { Popconfirm } from "antd";
import { Clock3, LoaderCircle, MessagesSquare, Radio, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMessageTimestamp } from "./messages-data";
import type { MessageSessionListItem } from "./use-message-session-list";

export function MessageSessionPanel({
  sessions,
  selectedSessionId,
  loading,
  switching,
  error,
  onSelect,
  onRefresh,
  onClose,
  onDelete,
  closingSessionId,
  deletingSessionId,
}: {
  sessions: MessageSessionListItem[];
  selectedSessionId?: string;
  loading: boolean;
  switching?: boolean;
  error?: string;
  onSelect: (sessionId: string) => void;
  onRefresh: () => void;
  onClose?: (sessionId: string) => void;
  onDelete?: (sessionId: string) => void;
  closingSessionId?: string;
  deletingSessionId?: string;
}) {
  return (
    <aside className="flex min-h-0 h-full flex-col rounded-[32px] border border-white/70 bg-white/78 p-4 shadow-[0_24px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 px-2 py-1">
        <div>
          <div className="text-sm font-bold text-slate-950">会话列表</div>
          <div className="text-xs text-slate-500">展示当前机器人的全部会话状态</div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm"
          aria-label="刷新会话列表"
        >
          <RefreshCw size={15} className={cn(loading && "animate-spin")} />
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-[20px] bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </div>
      ) : null}

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
        {sessions.length > 0 ? (
          <div className="space-y-3">
            {sessions.map((session) => {
              const isSelected = session.sessionId === selectedSessionId;
              const isClosing = closingSessionId === session.sessionId;
              const isDeleting = deletingSessionId === session.sessionId;
              const isSwitching = Boolean(switching && isSelected);

              return (
                <div
                  key={session.sessionId}
                  className={cn(
                    "flex items-start gap-2 rounded-[24px] border px-3 py-3 transition-all duration-300",
                    isSelected
                      ? "border-violet-200 bg-violet-50 shadow-[0_18px_40px_rgba(147,51,234,0.12)]"
                      : "border-white/70 bg-white/72 shadow-sm hover:bg-white",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(session.sessionId)}
                    disabled={switching}
                    className="min-w-0 flex-1 text-left disabled:cursor-wait disabled:opacity-80"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px]",
                          session.generating
                            ? "bg-rose-100 text-rose-700"
                            : session.connected
                              ? "bg-orange-100 text-orange-700"
                              : "bg-slate-100 text-slate-600",
                        )}
                      >
                        {session.connected || session.generating ? <Radio size={16} /> : <MessagesSquare size={16} />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-bold text-slate-950">
                            {session.title}
                          </div>
                          {session.isCurrent ? (
                            <span className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
                              当前
                            </span>
                          ) : null}
                          {isSwitching ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                              <LoaderCircle size={11} className="animate-spin" />
                              切换中
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                            {session.sourceLabel}
                          </span>
                          {session.generating ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 font-semibold text-rose-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                              思考中
                            </span>
                          ) : null}
                          {session.remoteConnected && !session.isCurrent ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 font-semibold text-violet-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                              后台在线
                            </span>
                          ) : null}
                          <span>{session.statusLabel}</span>
                          {typeof session.messageCount === "number" ? (
                            <span>{session.messageCount} 条</span>
                          ) : null}
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-slate-400">
                          <div className="inline-flex items-center gap-1">
                            <Clock3 size={12} />
                            {session.updatedAt ? formatMessageTimestamp(session.updatedAt) : "--"}
                          </div>
                          <div>{session.hasTranscript ? "可查看内容" : "仅会话信息"}</div>
                        </div>
                      </div>
                    </div>
                  </button>

                  {session.canClose ? (
                    <button
                      type="button"
                      disabled={isClosing || isDeleting || switching}
                      className={cn(
                        "mt-1 inline-flex shrink-0 items-center justify-center rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                        "border-slate-200 bg-white text-slate-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                      )}
                      aria-label={`关闭会话 ${session.title}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onClose?.(session.sessionId);
                      }}
                    >
                      {isClosing ? "关闭中..." : "关闭"}
                    </button>
                  ) : session.canDelete ? (
                    <Popconfirm
                      title="确认删除会话？"
                      description={`删除后将无法恢复「${session.title}」的聊天记录。`}
                      okText="确认删除"
                      cancelText="取消"
                      okButtonProps={{
                        danger: true,
                        loading: isDeleting,
                      }}
                      cancelButtonProps={{
                        disabled: isDeleting || switching,
                      }}
                      onConfirm={(event) => {
                        event?.stopPropagation();
                        onDelete?.(session.sessionId);
                      }}
                    >
                      <button
                        type="button"
                        disabled={isDeleting || switching}
                        className={cn(
                          "mt-1 inline-flex shrink-0 items-center justify-center rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                          "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700",
                          "disabled:cursor-not-allowed disabled:opacity-50",
                        )}
                        aria-label={`删除会话 ${session.title}`}
                        onClick={(event) => {
                          event.stopPropagation();
                        }}
                      >
                        {isDeleting ? "删除中..." : "删除"}
                      </button>
                    </Popconfirm>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/72 px-5 py-8 text-center">
            <div className="text-sm font-semibold text-slate-900">暂无会话</div>
            <div className="mt-2 text-sm leading-6 text-slate-500">
              当前机器人还没有可展示的会话，发出第一条消息后这里就会出现新会话。
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
