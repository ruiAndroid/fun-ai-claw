"use client";

import { XiamiIcon } from "@/components/ui/xiami-icon";
import { cn } from "@/lib/utils";
import type { RechargePlan } from "./recharge-data";

const currencyFormatter = new Intl.NumberFormat("zh-CN", {
  maximumFractionDigits: 2,
});

function formatCurrency(value: number) {
  return currencyFormatter.format(Number.isFinite(value) ? value : 0);
}

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
          ? "border-violet-300 shadow-[0_28px_70px_rgba(147,51,234,0.18)]"
          : "border-white hover:-translate-y-1 hover:shadow-[0_28px_70px_rgba(15,23,42,0.12)]",
      )}
    >
      {plan.badge ? (
        <div className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-bold text-orange-600">
          {plan.badge}
        </div>
      ) : null}

      <div className="text-[28px] font-black tracking-[-0.04em] text-slate-950 sm:text-[32px]">
        {plan.title}
      </div>

      <div className="mt-10 text-[64px] font-black tracking-[-0.07em] text-slate-950 sm:text-[78px]">
        ¥ {formatCurrency(plan.price)}
      </div>

      {typeof plan.originalPrice === "number" && plan.originalPrice > plan.price ? (
        <div className="mt-3 text-lg font-bold text-slate-400 line-through">
          原价 ¥ {formatCurrency(plan.originalPrice)}
        </div>
      ) : null}

      <div className="mt-7 flex flex-wrap items-center gap-3 text-[36px] font-black tracking-[-0.04em] text-slate-950 sm:text-[44px]">
        <span>{plan.benefitValue}</span>
        {plan.benefitLabel === "虾米" ? (
          <>
            <XiamiIcon size={34} />
            <span className="text-[24px] font-bold text-slate-500 sm:text-[28px]">虾米</span>
          </>
        ) : (
          <span className="rounded-full bg-slate-100 px-4 py-2 text-[18px] font-bold text-slate-500 sm:text-[22px]">
            {plan.benefitLabel}
          </span>
        )}
      </div>

      {plan.meta ? (
        <div className="mt-4 text-base font-semibold text-slate-500">
          {plan.meta}
        </div>
      ) : null}

      <p className="mt-12 min-h-[96px] text-[18px] font-bold leading-9 text-slate-400">
        {plan.description}
      </p>

      <button
        type="button"
        onClick={() => onSelect(plan.id)}
        className={cn(
          "mt-8 inline-flex h-18 w-full items-center justify-center rounded-[18px] text-[24px] font-black text-slate-950 transition-transform duration-300",
          selected
            ? "bg-[linear-gradient(135deg,#ff7a18_0%,#ff9f43_42%,#8b3dff_100%)] shadow-[0_18px_40px_rgba(139,61,255,0.24)] hover:scale-[1.01]"
            : "bg-violet-300/95 hover:scale-[1.01]",
        )}
      >
        {selected ? "已选择" : "购买"}
      </button>
    </article>
  );
}
