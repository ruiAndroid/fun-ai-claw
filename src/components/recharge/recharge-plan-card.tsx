"use client";

import { XiamiIcon } from "@/components/ui/xiami-icon";
import { cn } from "@/lib/utils";
import type { RechargePlan } from "./recharge-data";

export function RechargePlanCard({
  plan,
  selected,
  onSelect,
}: {
  plan: RechargePlan;
  selected: boolean;
  onSelect: (planId: string) => void;
}) {
  return (
    <article
      className={cn(
        "rounded-[32px] border bg-white px-8 py-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)] transition-all duration-300",
        selected
          ? "border-emerald-300 shadow-[0_28px_70px_rgba(20,184,166,0.18)]"
          : "border-white hover:-translate-y-1 hover:shadow-[0_28px_70px_rgba(15,23,42,0.12)]",
      )}
    >
      <div className="text-[28px] font-black tracking-[-0.04em] text-slate-950 sm:text-[32px]">
        {plan.title}
      </div>

      <div className="mt-10 text-[64px] font-black tracking-[-0.07em] text-slate-950 sm:text-[78px]">
        ¥ {plan.price}
      </div>

      <div className="mt-7 flex items-center gap-3 text-[36px] font-black tracking-[-0.04em] text-slate-950 sm:text-[44px]">
        <span>{plan.xiami}</span>
        <XiamiIcon size={34} />
        <span className="text-[24px] font-bold text-slate-500 sm:text-[28px]">虾米</span>
      </div>

      <p className="mt-12 min-h-[96px] text-[18px] font-bold leading-9 text-slate-400">
        {plan.description}
      </p>

      <button
        type="button"
        onClick={() => onSelect(plan.id)}
        className={cn(
          "mt-8 inline-flex h-18 w-full items-center justify-center rounded-[18px] text-[24px] font-black text-slate-950 transition-transform duration-300",
          selected
            ? "bg-emerald-400 shadow-[0_18px_40px_rgba(20,184,166,0.24)] hover:scale-[1.01]"
            : "bg-cyan-300/95 hover:scale-[1.01]",
        )}
      >
        {selected ? "已选择" : "购买"}
      </button>
    </article>
  );
}
