"use client";

import { QRCode } from "antd";
import { RefreshCw, X } from "lucide-react";
import type { RechargeConsumeOrder } from "@/lib/recharge-api";

function formatDateTime(value?: string | null) {
  if (!value) {
    return "--";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("zh-CN", {
    hour12: false,
  });
}

export function RechargePaymentDialog({
  open,
  planTitle,
  loading,
  error,
  order,
  onRetry,
  onClose,
}: {
  open: boolean;
  planTitle?: string;
  loading: boolean;
  error?: string;
  order?: RechargeConsumeOrder | null;
  onRetry: () => void;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-[920px] rounded-[32px] border border-white/70 bg-white/92 p-8 shadow-[0_32px_100px_rgba(15,23,42,0.22)]">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-sm font-bold uppercase tracking-[0.2em] text-orange-500">
              Payment
            </div>
            <h2 className="mt-3 text-[34px] font-black tracking-[-0.05em] text-slate-950">
              {planTitle ? `${planTitle} 支付` : "扫码支付"}
            </h2>
            <p className="mt-3 text-base font-semibold text-slate-500">
              扫描二维码完成支付，支付成功后页面可继续联动订单状态。
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            aria-label="关闭支付弹窗"
          >
            <X size={22} />
          </button>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[340px_minmax(0,1fr)]">
          <div className="rounded-[28px] bg-[linear-gradient(180deg,#fff7f2_0%,#ffffff_100%)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
            <div className="flex min-h-[320px] items-center justify-center rounded-[24px] border border-dashed border-orange-200 bg-white px-6">
              {loading ? (
                <div className="flex w-full flex-col items-center justify-center text-center">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />
                  <div className="mt-5 text-xl font-black text-slate-950">正在生成支付二维码...</div>
                  <div className="mt-2 text-sm font-semibold text-slate-400">
                    稍等一下，订单创建成功后会自动展示二维码。
                  </div>
                </div>
              ) : null}

              {!loading && error ? (
                <div className="flex w-full flex-col items-center justify-center text-center">
                  <div className="text-xl font-black text-slate-950">二维码获取失败</div>
                  <div className="mt-3 text-sm font-semibold leading-6 text-slate-400">
                    {error}
                  </div>
                  <button
                    type="button"
                    onClick={onRetry}
                    className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#ff7a18_0%,#ff9f43_42%,#8b3dff_100%)] px-6 text-sm font-bold text-white shadow-[0_14px_30px_rgba(139,61,255,0.24)] transition-transform duration-300 hover:scale-[1.01]"
                  >
                    <RefreshCw size={16} />
                    重新获取
                  </button>
                </div>
              ) : null}

              {!loading && !error && order?.payUrl ? (
                <div className="flex w-full flex-col items-center justify-center text-center">
                  <div className="mx-auto flex justify-center">
                    <QRCode value={order.payUrl} size={220} bordered={false} />
                  </div>
                  <div className="mt-4 max-w-[220px] text-center text-sm font-semibold text-slate-400">
                    请使用微信或支持该链接的支付工具扫码
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-[28px] border border-slate-100 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.04)]">
            <div className="rounded-[22px] bg-slate-50 px-5 py-4">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                Order Code
              </div>
              <div className="mt-2 break-all text-lg font-black text-slate-950">
                {order?.orderCode || "--"}
              </div>
            </div>

            <div className="rounded-[22px] bg-slate-50 px-5 py-4">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                Price
              </div>
              <div className="mt-2 text-lg font-black text-slate-950">
                {order?.price ? `¥ ${order.price}` : "--"}
              </div>
            </div>

            <div className="rounded-[22px] bg-slate-50 px-5 py-4">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                Expires At
              </div>
              <div className="mt-2 text-lg font-black text-slate-950">
                {formatDateTime(order?.validEndTime)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
