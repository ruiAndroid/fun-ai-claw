"use client";

import type { CSSProperties } from "react";
import { XiamiIcon } from "@/components/ui/xiami-icon";
import { cn } from "@/lib/utils";
import type { RechargePlan } from "./recharge-data";

const currencyFormatter = new Intl.NumberFormat("zh-CN", {
  maximumFractionDigits: 2,
});

function formatCurrency(value: number) {
  return currencyFormatter.format(Number.isFinite(value) ? value : 0);
}

const twoLineClampStyle: CSSProperties = {
  display: "-webkit-box",
  overflow: "hidden",
  WebkitBoxOrient: "vertical",
  WebkitLineClamp: 2,
};

export function RechargePlanCard({
  plan,
  selected,
  loading,
  onSelect,
}: {
  plan: RechargePlan;
  selected: boolean;
  loading?: boolean;
  onSelect: (plan: RechargePlan) => void;
}) {
  return (
    <article
      className={cn(
        "relative flex h-full flex-col rounded-[32px] border bg-white px-8 py-7 shadow-[0_24px_60px_rgba(15,23,42,0.08)] transition-all duration-300",
        selected
          ? "border-violet-300 shadow-[0_28px_70px_rgba(147,51,234,0.18)]"
          : "border-white hover:-translate-y-1 hover:shadow-[0_28px_70px_rgba(15,23,42,0.12)]",
      )}
    >
      {plan.badge ? (
        <div className="absolute left-0 top-0 z-10 rounded-br-[20px] rounded-tl-[30px] bg-[linear-gradient(135deg,#ff7a18_0%,#ff9f43_100%)] px-4 py-2 text-sm font-bold text-white shadow-[0_12px_28px_rgba(255,122,24,0.28)]">
          {plan.badge}
        </div>
      ) : null}

      <div className="text-[28px] font-black tracking-[-0.04em] text-slate-950 sm:text-[32px]">
        {plan.title}
      </div>

      <div className="mt-8 text-[64px] font-black tracking-[-0.07em] text-slate-950 sm:text-[78px]">
        ¥ {formatCurrency(plan.price)}
      </div>

      {typeof plan.originalPrice === "number" && plan.originalPrice > plan.price ? (
        <div className="mt-3 text-lg font-bold text-slate-400 line-through">
          原价 ¥ {formatCurrency(plan.originalPrice)}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3 text-[36px] font-black tracking-[-0.04em] text-slate-950 sm:text-[44px]">
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
        <div className="mt-3 text-sm font-semibold text-slate-500">
          {plan.meta}
        </div>
      ) : null}

      <p
        className="mt-5 min-h-[56px] text-base font-bold leading-7 text-slate-400"
        style={twoLineClampStyle}
        title={plan.description}
      >
        {plan.description}
      </p>

      <div className="mt-auto pt-5">
        <button
          type="button"
          onClick={() => onSelect(plan)}
          disabled={loading}
          className={cn(
            "inline-flex h-16 w-full items-center justify-center rounded-[18px] text-[22px] font-black text-slate-950 transition-transform duration-300",
            loading || selected
              ? "bg-[linear-gradient(135deg,#ff7a18_0%,#ff9f43_42%,#8b3dff_100%)] shadow-[0_18px_40px_rgba(139,61,255,0.24)] hover:scale-[1.01]"
              : "bg-violet-300/95 hover:scale-[1.01]",
            loading ? "cursor-wait" : "",
          )}
        >
          {loading ? "生成中..." : "立即支付"}
        </button>
      </div>
    </article>
  );
}
