"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { XiamiIcon } from "@/components/ui/xiami-icon";
import type { UsageFilterKey } from "./account-data";
import { accountXiamiBalance, usageEntries, usageFilters } from "./account-data";

export function AccountUsagePanel() {
  const [activeFilter, setActiveFilter] = useState<UsageFilterKey>("all");

  const filteredEntries = useMemo(() => {
    if (activeFilter === "all") {
      return usageEntries;
    }
    return usageEntries.filter((item) => item.type === activeFilter);
  }, [activeFilter]);

  return (
    <div>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <h1 className="text-5xl font-black tracking-[-0.05em] text-slate-950">虾米账单</h1>

        <div className="flex flex-wrap gap-4">
          <button
            type="button"
            className="inline-flex h-16 items-center justify-center rounded-full bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 px-12 text-[22px] font-black text-white shadow-[0_18px_40px_rgba(45,212,191,0.22)] transition-transform duration-300 hover:scale-[1.01]"
          >
            刷新
          </button>
          <Link
            href="/recharge"
            className="inline-flex h-16 items-center justify-center rounded-full bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 px-12 text-[22px] font-black text-white shadow-[0_18px_40px_rgba(45,212,191,0.22)] transition-transform duration-300 hover:scale-[1.01]"
          >
            去充值
          </Link>
        </div>
      </div>

      <div className="mt-16 text-center">
        <div className="text-4xl font-black tracking-[-0.04em] text-slate-950">当前余额</div>
        <div className="mt-6 flex items-center justify-center gap-4 text-[64px] font-black leading-none tracking-[-0.05em] text-slate-950">
          <span>{accountXiamiBalance ?? "--"}</span>
          <XiamiIcon size={44} />
          <span className="text-[32px] font-bold text-slate-500">虾米</span>
        </div>
        <div className="mt-4 text-lg font-semibold text-slate-400">余额与账单数据将在后续接入</div>
      </div>

      <section className="mt-12 rounded-[28px] border border-slate-900/18 bg-white/58 p-8 shadow-[0_20px_50px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap gap-6">
          {usageFilters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setActiveFilter(filter.key)}
              className={`min-w-[180px] rounded-full px-8 py-4 text-[22px] font-black tracking-[-0.03em] transition-colors duration-300 ${
                activeFilter === filter.key
                  ? "bg-slate-200 text-slate-950"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-950"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {filteredEntries.length > 0 ? (
          <div className="mt-14 space-y-10">
            {filteredEntries.map((item) => (
              <div
                key={`${item.title}-${item.time}`}
                className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-center"
              >
                <div>
                  <div className="text-[20px] font-black tracking-[-0.03em] text-slate-950">
                    {item.title}
                  </div>
                  <div className="mt-2 text-[18px] font-bold text-slate-400">{item.time}</div>
                </div>
                <div className="flex items-center justify-end gap-2 text-[22px] font-black tracking-[-0.03em] text-slate-950">
                  <span>{item.amount >= 0 ? `+${item.amount}` : item.amount}</span>
                  <XiamiIcon size={22} />
                  <span className="text-base font-bold text-slate-500">虾米</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-14 rounded-[24px] border border-dashed border-slate-300 bg-white/70 px-6 py-10 text-center">
            <div className="text-[22px] font-black tracking-[-0.03em] text-slate-950">暂无虾米明细</div>
            <div className="mt-3 text-lg font-semibold text-slate-400">
              接入真实账单后，这里会展示充值、消耗与奖励记录。
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
