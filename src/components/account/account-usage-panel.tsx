"use client";

import Link from "next/link";
import { Crown, RefreshCw } from "lucide-react";
import { useMemo } from "react";
import { XiamiIcon } from "@/components/ui/xiami-icon";
import { useUserCenterOrders } from "@/lib/use-user-center-orders";
import { useUserCenterVipInfo } from "@/lib/use-user-center-vip-info";
import type { UserCenterOrderRecord } from "@/types/user-center";

type UsageRecordItem = {
  id: string;
  title: string;
  detail: string;
  time: string;
  amountLabel: string;
  tone: "default" | "success";
};

const currencyFormatter = new Intl.NumberFormat("zh-CN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

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

function formatAmount(value: number) {
  return currencyFormatter.format(Number.isFinite(value) ? value : 0);
}

function resolveOrderStatusLabel(order: UserCenterOrderRecord) {
  if (order.status.trim()) {
    return order.status.trim();
  }
  if (order.refundAmount > 0) {
    return "已退款";
  }
  if (order.billStatus > 0) {
    return `账单状态 ${order.billStatus}`;
  }
  return "订单处理中";
}

function resolveOrderTitle(order: UserCenterOrderRecord) {
  return order.commodityName.trim()
    || order.orderType.trim()
    || "购买记录";
}

function buildOrderRecords(orders: UserCenterOrderRecord[]) {
  const sortedOrders = [...orders].sort((left, right) => {
    const rightTime = new Date(right.statusUpdateTime || right.updated || right.created).getTime();
    const leftTime = new Date(left.statusUpdateTime || left.updated || left.created).getTime();
    return rightTime - leftTime;
  });

  const records: UsageRecordItem[] = [];

  sortedOrders.forEach((order) => {
    const title = resolveOrderTitle(order);
    const time = formatDateTime(order.statusUpdateTime || order.updated || order.created);
    const cashSpent = order.consumeMoney > 0 ? order.consumeMoney : order.payMoney;
    const detailParts = [
      resolveOrderStatusLabel(order),
      order.orderCode.trim() ? `订单号：${order.orderCode.trim()}` : "",
    ].filter(Boolean);
    const detail = detailParts.join(" · ");

    if (cashSpent > 0) {
      records.push({
        id: `${order.id || order.orderCode}-pay`,
        title,
        detail,
        time,
        amountLabel: `-￥ ${formatAmount(cashSpent)}`,
        tone: "default",
      });
    }

    if (order.coinAmount > 0) {
      records.push({
        id: `${order.id || order.orderCode}-coin`,
        title: `${title} 到账`,
        detail,
        time,
        amountLabel: `+${formatAmount(order.coinAmount)} 虾米`,
        tone: "success",
      });
    }

    if (order.refundAmount > 0) {
      records.push({
        id: `${order.id || order.orderCode}-refund`,
        title: `${title} 退款`,
        detail,
        time,
        amountLabel: `+￥ ${formatAmount(order.refundAmount)}`,
        tone: "success",
      });
    }

    if (cashSpent <= 0 && order.coinAmount <= 0 && order.refundAmount <= 0) {
      records.push({
        id: `${order.id || order.orderCode || title}-plain`,
        title,
        detail,
        time,
        amountLabel: "--",
        tone: "default",
      });
    }
  });

  return records;
}

export function AccountUsagePanel() {
  const {
    vipInfo,
    loading: vipLoading,
    error: vipError,
    refresh: refreshVipInfo,
  } = useUserCenterVipInfo();
  const {
    orders,
    loading: ordersLoading,
    error: ordersError,
    refresh: refreshOrders,
  } = useUserCenterOrders();

  const loading = vipLoading || ordersLoading;
  const orderRecords = useMemo(() => buildOrderRecords(orders), [orders]);

  const balanceLabel = loading && !vipInfo ? "..." : formatAmount(vipInfo?.coinAmount ?? 0);
  const vipStatusLabel = vipInfo?.isVip ? "会员已开通" : "当前未开通会员";
  const ordersEmptyDescription = ordersError || vipError || "当前还没有可展示的订单数据。";

  return (
    <div>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-5xl font-black tracking-[-0.05em] text-slate-950">我的钱包</h1>
        </div>
        <div className="flex flex-wrap gap-4">
          <button
            type="button"
            onClick={() => {
              void Promise.allSettled([refreshVipInfo(), refreshOrders()]);
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

      <div className="mt-10 flex justify-center lg:justify-start">
        <div className="inline-flex max-w-full items-center gap-3 rounded-full border border-white/80 bg-white/84 px-5 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur-sm">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold tracking-[0.08em] text-slate-500">
            余额
          </span>
          <span className="bg-[linear-gradient(135deg,#ff7a18_0%,#ff4d8d_58%,#8b3dff_100%)] bg-clip-text text-[28px] font-black leading-none tracking-[-0.05em] text-transparent sm:text-[34px]">
            {balanceLabel}
          </span>
          <XiamiIcon size={24} title="虾米" />
          <span className="text-[20px] font-black tracking-[-0.03em] text-slate-700 sm:text-[24px]">
            虾米
          </span>
        </div>
      </div>

      <section className="mt-12">
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
      </section>

      <section className="mt-12 rounded-[28px] border border-slate-900/18 bg-white/58 p-8 shadow-[0_20px_50px_rgba(15,23,42,0.04)]">
        <div className="text-[28px] font-black tracking-[-0.04em] text-slate-950">购买记录</div>

        {loading ? (
          <div className="mt-14 rounded-[24px] border border-dashed border-slate-300 bg-white/70 px-6 py-10 text-center">
            <div className="text-[22px] font-black tracking-[-0.03em] text-slate-950">正在加载购买记录...</div>
            <div className="mt-3 text-lg font-semibold text-slate-400">
              稍等一下，正在同步你的最新订单数据。
            </div>
          </div>
        ) : null}

        {!loading && orderRecords.length > 0 ? (
          <div className="mt-10 space-y-10">
            {orderRecords.map((item) => (
              <div
                key={item.id}
                className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-center"
              >
                <div>
                  <div className="text-[20px] font-black tracking-[-0.03em] text-slate-950">{item.title}</div>
                  <div className="mt-2 text-[16px] font-bold text-slate-500">{item.detail}</div>
                  <div className="mt-2 text-[18px] font-bold text-slate-400">{item.time}</div>
                </div>
                <div
                  className={`text-right text-[24px] font-black tracking-[-0.03em] ${
                    item.tone === "success" ? "text-emerald-600" : "text-slate-950"
                  }`}
                >
                  {item.amountLabel}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {!loading && orderRecords.length === 0 ? (
          <div className="mt-14 rounded-[24px] border border-dashed border-slate-300 bg-white/70 px-6 py-10 text-center">
            <div className="text-[22px] font-black tracking-[-0.03em] text-slate-950">暂无购买记录</div>
            <div className="mt-3 text-lg font-semibold text-slate-400">
              {ordersEmptyDescription}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
