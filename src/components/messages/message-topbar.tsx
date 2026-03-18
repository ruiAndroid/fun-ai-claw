"use client";

import { Bot, Plug, RotateCcw, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MessageRobotTarget } from "./messages-types";

export function MessageTopbar({
  selectedRobot,
  loading,
  connected,
  connecting,
  notice,
  error,
  hasConversation,
  onRefreshRobots,
  onReconnect,
  onDisconnect,
  onNewSession,
}: {
  selectedRobot?: MessageRobotTarget;
  loading: boolean;
  connected: boolean;
  connecting: boolean;
  notice?: string;
  error?: string;
  hasConversation: boolean;
  onRefreshRobots: () => void;
  onReconnect: () => void;
  onDisconnect: () => void;
  onNewSession: () => void;
}) {
  return (
    <header className="rounded-[28px] border border-white/70 bg-white/80 px-5 py-4 shadow-[0_20px_50px_rgba(81,38,145,0.08)] backdrop-blur-xl sm:px-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-slate-100 text-slate-800">
              <Bot size={18} />
            </div>
            <div className="min-w-0">
              <div className="truncate text-[24px] font-black tracking-[-0.04em] text-slate-950">
                {selectedRobot ? selectedRobot.displayName : "请选择机器人"}
              </div>
              <div className="truncate text-sm text-slate-500">
                {selectedRobot
                  ? "已为你准备好，直接开始对话吧"
                  : "选择一个机器人后，就可以开始对话"}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold shadow-sm",
              connected
                  ? "bg-orange-50 text-orange-700"
                  : connecting
                    ? "bg-violet-50 text-violet-700"
                  : "bg-slate-100 text-slate-600",
            )}
          >
            {connected ? <Wifi size={16} /> : <WifiOff size={16} />}
            {connected ? "对话中" : connecting ? "准备中" : "待开始"}
          </div>

          <button
            type="button"
            onClick={onRefreshRobots}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(81,38,145,0.1)]"
          >
            <RotateCcw size={16} className={cn(loading && "animate-spin")} />
            刷新列表
          </button>

          <button
            type="button"
            onClick={onNewSession}
            className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#ff7a18_0%,#8b3dff_100%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(139,61,255,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(139,61,255,0.24)]"
          >
            新对话
          </button>

          {connected ? (
            <button
              type="button"
              onClick={onDisconnect}
              className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(244,63,94,0.12)]"
            >
              <Plug size={16} />
              暂停对话
            </button>
          ) : (
            <button
              type="button"
              onClick={onReconnect}
              disabled={!selectedRobot?.isAvailable || connecting || (!hasConversation && !selectedRobot)}
              className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(139,61,255,0.12)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Wifi size={16} />
              {hasConversation ? "继续对话" : "开始对话"}
            </button>
          )}
        </div>
      </div>

      {notice || error ? (
        <div
          className={cn(
            "mt-4 rounded-[20px] px-4 py-3 text-sm",
            error ? "bg-rose-50 text-rose-600" : "bg-violet-50 text-violet-700",
          )}
        >
          {error ?? notice}
        </div>
      ) : null}
    </header>
  );
}
