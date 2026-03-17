"use client";

import { cn } from "@/lib/utils";
import type { RechargeTabKey } from "./recharge-data";

export function RechargeSegment({
  activeTab,
  tabs,
  onChange,
}: {
  activeTab: RechargeTabKey;
  tabs: Array<{
    key: RechargeTabKey;
    label: string;
    disabled?: boolean;
    badge?: string;
  }>;
  onChange: (tab: RechargeTabKey) => void;
}) {
  return (
    <div className="relative flex w-full max-w-[760px] items-center rounded-[26px] bg-slate-100/90 p-2 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;

        return (
          <div key={tab.key} className="relative flex-1">
            {tab.badge ? (
              <div className="pointer-events-none absolute -top-11 left-1/2 z-10 -translate-x-1/2 rounded-full bg-slate-800 px-4 py-2 text-xs font-bold text-white shadow-[0_16px_28px_rgba(15,23,42,0.25)]">
                🌟{tab.badge}
                <span className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-l-[10px] border-r-[10px] border-t-[14px] border-l-transparent border-r-transparent border-t-slate-800" />
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => !tab.disabled && onChange(tab.key)}
              disabled={tab.disabled}
              className={cn(
                "flex h-[72px] w-full items-center justify-center rounded-[20px] text-[22px] font-black tracking-[-0.03em] transition-all duration-300",
                isActive
                  ? "bg-white text-slate-950 shadow-[0_14px_30px_rgba(15,23,42,0.08)]"
                  : "text-slate-700",
                tab.disabled && "cursor-not-allowed opacity-90",
              )}
            >
              {tab.label}
            </button>
          </div>
        );
      })}
    </div>
  );
}
