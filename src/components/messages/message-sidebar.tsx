"use client";

import Link from "next/link";
import { ArrowLeft, Bot, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRobotStatus } from "./messages-data";
import type { MessageRobotTarget } from "./messages-types";

export function MessageSidebar({
  robots,
  selectedRobotId,
  loading,
  error,
  onSelect,
  onRefresh,
}: {
  robots: MessageRobotTarget[];
  selectedRobotId?: string;
  loading: boolean;
  error?: string;
  onSelect: (robotId: string) => void;
  onRefresh: () => void;
}) {
  return (
    <aside className="flex min-h-0 h-full flex-col rounded-[32px] border border-white/70 bg-white/80 p-5 shadow-[0_24px_60px_rgba(81,38,145,0.08)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-3 py-2 text-sm font-bold text-slate-950 shadow-sm transition-transform duration-300 hover:scale-[1.02]"
        >
          <ArrowLeft size={16} />
          返回首页
        </Link>

        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-900 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(81,38,145,0.1)]"
          aria-label="刷新机器人列表"
        >
          <RefreshCw size={16} className={cn(loading && "animate-spin")} />
        </button>
      </div>

      <div className="mt-6 rounded-[28px] bg-[linear-gradient(135deg,rgba(255,122,24,0.16),rgba(139,61,255,0.14))] px-5 py-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/75 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-md-primary">
          Direct Agent
        </div>
        <h1 className="mt-4 text-[28px] font-black tracking-[-0.04em] text-slate-950">
          消息
        </h1>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 px-1">
        <div>
          <div className="text-sm font-bold text-slate-950">机器人列表</div>
          <div className="text-xs text-slate-500">
            基于实例与 agent 绑定实时生成
          </div>
        </div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {robots.length}
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-[24px] border border-rose-100 bg-rose-50 px-4 py-4 text-sm text-rose-600">
          {error}
        </div>
      ) : null}

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={`robot-skeleton-${index + 1}`}
                className="rounded-[24px] border border-white/70 bg-white/70 px-4 py-4 shadow-sm"
              >
                <div className="h-4 w-24 rounded-full bg-slate-200" />
                <div className="mt-3 h-3 w-40 rounded-full bg-slate-100" />
                <div className="mt-2 h-3 w-32 rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        ) : robots.length > 0 ? (
          <div className="space-y-3">
            {robots.map((robot) => {
              const isSelected = robot.id === selectedRobotId;

              return (
                <button
                  key={robot.id}
                  type="button"
                  onClick={() => onSelect(robot.id)}
                  className={cn(
                    "w-full rounded-[26px] border px-4 py-4 text-left transition-all duration-300",
                    isSelected
                      ? "border-violet-200 bg-violet-50 shadow-[0_18px_40px_rgba(139,61,255,0.14)]"
                      : "border-white/70 bg-white/72 shadow-sm hover:bg-white hover:shadow-[0_18px_36px_rgba(81,38,145,0.08)]",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] text-sm font-black",
                        isSelected ? "bg-[linear-gradient(135deg,#ff7a18_0%,#8b3dff_100%)] text-white" : "bg-slate-100 text-slate-700",
                      )}
                    >
                      <Bot size={18} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-sm font-bold text-slate-950">
                          {robot.displayName}
                        </div>
                        <span
                          className={cn(
                            "inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            robot.isAvailable
                              ? "bg-orange-100 text-orange-700"
                              : "bg-slate-100 text-slate-500",
                          )}
                        >
                          {formatRobotStatus(robot)}
                        </span>
                      </div>

                      <div className="mt-1 truncate text-xs text-slate-500">
                        {robot.agentId}
                      </div>
                      {robot.description ? (
                        <div className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                          {robot.description}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[26px] border border-dashed border-slate-200 bg-white/70 px-5 py-8 text-center">
            <div className="text-sm font-semibold text-slate-900">暂无可用机器人</div>
            <div className="mt-2 text-sm leading-6 text-slate-500">
              先到控制台给实例安装并启用 agent，消息页才会显示真实机器人入口。
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
