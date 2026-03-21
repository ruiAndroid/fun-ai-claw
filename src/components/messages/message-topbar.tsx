"use client";

import { Bot, Power, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MessageRobotTarget } from "./messages-types";

const text = {
  emptyTitle: "\u8bf7\u5148\u9009\u62e9\u667a\u80fd\u4f53",
  emptySubtitle: "\u9009\u62e9\u4e00\u4e2a\u667a\u80fd\u4f53\u540e\uff0c\u5373\u53ef\u5f00\u59cb\u4e13\u5c5e\u4f1a\u8bdd",
  readySubtitle: "\u5df2\u4e3a\u4f60\u51c6\u5907\u5c31\u7eea\uff0c\u76f4\u63a5\u5f00\u59cb\u5bf9\u8bdd\u5373\u53ef",
  newSession: "\u65b0\u4f1a\u8bdd",
  closeSession: "\u7ed3\u675f\u5bf9\u8bdd",
  closingSession: "\u7ed3\u675f\u4e2d...",
  sessionLimitHint: "\u8bf4\u660e\uff1a\u7ed3\u675f\u5bf9\u8bdd\u4e0d\u4f1a\u91ca\u653e\u4f1a\u8bdd\u540d\u989d\uff0c\u5220\u9664\u65e7\u4f1a\u8bdd\u540e\u624d\u80fd\u65b0\u5efa\u3002",
};

export function MessageTopbar({
  selectedRobot,
  connected,
  connecting,
  remoteConnected,
  generating,
  statusLabel,
  statusTone,
  notice,
  error,
  canCloseSession = false,
  closingSession = false,
  onCloseSession,
  onNewSession,
}: {
  selectedRobot?: MessageRobotTarget;
  connected: boolean;
  connecting: boolean;
  remoteConnected?: boolean;
  generating?: boolean;
  statusLabel: string;
  statusTone: "idle" | "starting" | "sending" | "generating" | "connected" | "remote" | "closed";
  notice?: string;
  error?: string;
  canCloseSession?: boolean;
  closingSession?: boolean;
  onCloseSession: () => void;
  onNewSession: () => void;
}) {
  const hasRemotePresence = Boolean(
    connected
    || generating
    || remoteConnected
    || statusTone === "starting"
    || statusTone === "sending"
    || statusTone === "connected"
    || statusTone === "remote"
    || statusTone === "generating",
  );

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
                {selectedRobot ? selectedRobot.displayName : text.emptyTitle}
              </div>
              <div className="truncate text-sm text-slate-500">
                {selectedRobot ? text.readySubtitle : text.emptySubtitle}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold shadow-sm",
              statusTone === "connected"
                ? "bg-orange-50 text-orange-700"
                : statusTone === "generating"
                  ? "bg-rose-50 text-rose-600"
                  : statusTone === "sending"
                    ? "bg-sky-50 text-sky-700"
                    : statusTone === "starting" || statusTone === "remote"
                      ? "bg-violet-50 text-violet-700"
                      : statusTone === "closed"
                        ? "bg-slate-200 text-slate-600"
                        : "bg-slate-100 text-slate-600",
            )}
          >
            {hasRemotePresence || connecting ? <Wifi size={16} /> : <WifiOff size={16} />}
            {statusLabel}
          </div>

          <button
            type="button"
            onClick={onNewSession}
            disabled={!selectedRobot || closingSession}
            className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#ff7a18_0%,#8b3dff_100%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(139,61,255,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(139,61,255,0.24)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {text.newSession}
          </button>

          {canCloseSession ? (
            <button
              type="button"
              onClick={onCloseSession}
              disabled={closingSession}
              className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(244,63,94,0.12)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Power size={16} />
              {closingSession ? text.closingSession : text.closeSession}
            </button>
          ) : null}
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

      {selectedRobot ? (
        <div className="mt-3 text-xs leading-6 text-slate-500">
          {text.sessionLimitHint}
        </div>
      ) : null}
    </header>
  );
}
