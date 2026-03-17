"use client";

import { Clock3, MessagesSquare, Radio, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMessageTimestamp } from "./messages-data";
import type { MessageSessionListItem } from "./use-message-session-list";

export function MessageSessionPanel({
  sessions,
  selectedSessionId,
  loading,
  error,
  onSelect,
  onRefresh,
}: {
  sessions: MessageSessionListItem[];
  selectedSessionId?: string;
  loading: boolean;
  error?: string;
  onSelect: (sessionId: string) => void;
  onRefresh: () => void;
}) {
  return (
    <aside className="flex min-h-0 h-full flex-col rounded-[32px] border border-white/70 bg-white/78 p-4 shadow-[0_24px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 px-2 py-1">
        <div>
          <div className="text-sm font-bold text-slate-950">会话列表</div>
          <div className="text-xs text-slate-500">展示当前机器人的所有会话概览</div>
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

              return (
                <button
                  key={session.sessionId}
                  type="button"
                  onClick={() => onSelect(session.sessionId)}
                  className={cn(
                    "w-full rounded-[24px] border px-4 py-4 text-left transition-all duration-300",
                    isSelected
                      ? "border-violet-200 bg-violet-50 shadow-[0_18px_40px_rgba(147,51,234,0.12)]"
                      : "border-white/70 bg-white/72 shadow-sm hover:bg-white",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px]",
                        session.connected ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-600",
                      )}
                    >
                      {session.connected ? <Radio size={16} /> : <MessagesSquare size={16} />}
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
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                          {session.sourceLabel}
                        </span>
                        <span>{session.statusLabel}</span>
                        {typeof session.messageCount === "number" ? (
                          <span>{session.messageCount} 条</span>
                        ) : null}
                      </div>

                      <div className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                        {session.subtitle}
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
              );
            })}
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/72 px-5 py-8 text-center">
            <div className="text-sm font-semibold text-slate-900">暂无会话</div>
            <div className="mt-2 text-sm leading-6 text-slate-500">
              当前机器人还没有可展示的会话，发起第一条消息后这里会出现新会话。
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
