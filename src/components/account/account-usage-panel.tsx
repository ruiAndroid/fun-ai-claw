"use client";

import Link from "next/link";
import { Crown, PackageCheck, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { useUserCenterVipInfo } from "@/lib/use-user-center-vip-info";
import type { UsageFilterKey } from "./account-data";
import { usageEntries, usageFilters } from "./account-data";

function formatDateTime(value?: string | null) {
  if (!value) {
    return "暂无";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatVipPeriod(start?: string | null, end?: string | null) {
  if (!start && !end) {
    return "暂无会员有效期";
  }
  return `${formatDateTime(start)} - ${formatDateTime(end)}`;
}

export function AccountUsagePanel() {
  const [activeFilter, setActiveFilter] = useState<UsageFilterKey>("all");
  const { vipInfo, loading, error, refresh } = useUserCenterVipInfo();

  const filteredEntries = useMemo(() => {
    if (activeFilter === "all") {
      return usageEntries;
    }
    return usageEntries.filter((item) => item.type === activeFilter);
  }, [activeFilter]);

  const balanceLabel = loading && !vipInfo ? "..." : `${vipInfo?.coinAmount ?? 0}`;
  const vipStatusLabel = vipInfo?.isVip ? "会员已开通" : "当前未开通会员";
  const materialStatusLabel = vipInfo?.isBuyMaterial ? "已购买素材包" : "未购买素材包";

  return (
    <div>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-5xl font-black tracking-[-0.05em] text-slate-950">积分中心</h1>
          <div className="mt-3 text-lg font-semibold text-slate-500">
            会员状态、素材包权益和虾米余额都会在这里同步展示。
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <button
            type="button"
            onClick={() => {
              void refresh();
            }}
            className="inline-flex h-16 items-center justify-center gap-3 rounded-full bg-gradient-to-r from-orange-400 via-orange-500 to-violet-500 px-12 text-[22px] font-black text-white shadow-[0_18px_40px_rgba(147,51,234,0.22)] transition-transform duration-300 hover:scale-[1.01]"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            {loading ? "刷新中..." : "刷新"}
          </button>
          <Link
            href="/recharge"
            className="inline-flex h-16 items-center justify-center rounded-full border border-slate-200 bg-white px-12 text-[22px] font-black text-slate-700 transition-transform duration-300 hover:scale-[1.01]"
          >
            去充值
          </Link>
        </div>
      </div>

      <div className="mt-16 text-center">
        <div className="text-4xl font-black tracking-[-0.04em] text-slate-950">当前虾米</div>
        <div className="mt-6 flex items-center justify-center gap-4 text-[64px] font-black leading-none tracking-[-0.05em] text-slate-950">
          <span>{balanceLabel}</span>
          <span className="text-[40px]">虾米</span>
        </div>
        <div className="mt-4 text-lg font-semibold text-slate-400">
          {error || "登录后或支付成功后，会员信息会自动刷新到这里。"}
        </div>
      </div>

      <section className="mt-12 grid gap-6 lg:grid-cols-3">
        <article className="rounded-[28px] border border-slate-900/18 bg-white/58 p-8 shadow-[0_20px_50px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-3 text-slate-950">
            <Crown size={22} />
            <div className="text-[22px] font-black tracking-[-0.03em]">会员状态</div>
          </div>
          <div className="mt-6 text-[30px] font-black tracking-[-0.04em] text-slate-950">
            {vipStatusLabel}
          </div>
          <div className="mt-3 text-base font-semibold text-slate-500">
            {formatVipPeriod(vipInfo?.validStartTime, vipInfo?.validEndTime)}
          </div>
        </article>

        <article className="rounded-[28px] border border-slate-900/18 bg-white/58 p-8 shadow-[0_20px_50px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-3 text-slate-950">
            <PackageCheck size={22} />
            <div className="text-[22px] font-black tracking-[-0.03em]">素材包权益</div>
          </div>
          <div className="mt-6 text-[30px] font-black tracking-[-0.04em] text-slate-950">
            {materialStatusLabel}
          </div>
          <div className="mt-3 text-base font-semibold text-slate-500">
            {vipInfo?.username?.trim() ? `当前账户：${vipInfo.username}` : "登录账户的购买状态会实时同步"}
          </div>
        </article>

        <article className="rounded-[28px] border border-slate-900/18 bg-white/58 p-8 shadow-[0_20px_50px_rgba(15,23,42,0.04)]">
          <div className="text-[22px] font-black tracking-[-0.03em] text-slate-950">同步说明</div>
          <div className="mt-6 space-y-3 text-base font-semibold leading-7 text-slate-500">
            <p>登录成功后会主动刷新一次会员信息缓存。</p>
            <p>支付成功后也会主动刷新，首页和个人中心都会读取最新数据。</p>
            <p>如果你怀疑余额没更新，可以直接点上方“刷新”。</p>
          </div>
        </article>
      </section>

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
                className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center"
              >
                <div>
                  <div className="text-[20px] font-black tracking-[-0.03em] text-slate-950">{item.title}</div>
                  <div className="mt-2 text-[18px] font-bold text-slate-400">{item.time}</div>
                </div>
                <div className="text-right text-[22px] font-black tracking-[-0.03em] text-slate-950">
                  {item.amount >= 0 ? `+${item.amount}` : item.amount}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-14 rounded-[24px] border border-dashed border-slate-300 bg-white/70 px-6 py-10 text-center">
            <div className="text-[22px] font-black tracking-[-0.03em] text-slate-950">暂无积分明细</div>
            <div className="mt-3 text-lg font-semibold text-slate-400">
              当前已接入会员信息与余额查询，积分流水后续再接真实账单接口。
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
