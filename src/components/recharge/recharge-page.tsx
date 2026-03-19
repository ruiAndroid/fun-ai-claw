"use client";

import { message } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  RechargeCommodityCatalog,
  RechargeConsumeOrder,
  RechargeConsumeOrderStatus,
} from "@/lib/recharge-api";
import {
  getRechargeConsumeOrder,
  getRechargeConsumeOrderStatus,
  listRechargeCommodities,
} from "@/lib/recharge-api";
import { refreshUserCenterVipInfo } from "@/lib/user-center-api";
import { useRequireUserCenterAuth } from "@/lib/use-require-user-center-auth";
import { RechargeHeader } from "./recharge-header";
import {
  isRechargeCommodityVisible,
  mapCommodityToRechargePlan,
  rechargeTabs,
  type RechargePlan,
  type RechargeTabKey,
} from "./recharge-data";
import { RechargePaymentDialog } from "./recharge-payment-dialog";
import { RechargePlanCard } from "./recharge-plan-card";
import { RechargeSegment } from "./recharge-segment";
import { RechargeVoucherDialog } from "./recharge-voucher-dialog";

const EMPTY_COMMODITY_CATALOG: RechargeCommodityCatalog = {
  vips: [],
  packages: [],
  materials: [],
};

const PAYMENT_STATUS_POLL_INTERVAL_MS = 3000;
const PAYMENT_STATUS_RETRY_INTERVAL_MS = 5000;
const PAYMENT_STATUS_MAX_ERROR_RETRIES = 5;
const PAYMENT_SUCCESS_AUTO_CLOSE_MS = 1200;
const EXPIRED_PAYMENT_MESSAGE = "当前支付二维码已过期，请重新生成。";

type PaymentDialogError = {
  title?: string;
  message: string;
  retryMode: "createOrder" | "checkStatus";
};

function formatRechargeError(error: unknown) {
  return error instanceof Error ? error.message : "商品列表加载失败，请稍后重试。";
}

function formatPaymentCreateError(error: unknown) {
  return error instanceof Error ? error.message : "支付二维码获取失败，请稍后重试。";
}

function formatPaymentStatusError(error: unknown) {
  return error instanceof Error ? error.message : "订单状态查询失败，请稍后重新查询。";
}

function buildVisiblePlans(data: RechargeCommodityCatalog, activeTab: RechargeTabKey): RechargePlan[] {
  if (activeTab === "membership") {
    return data.vips
      .filter(isRechargeCommodityVisible)
      .map((item) => mapCommodityToRechargePlan(item, "vip"));
  }

  return [
    ...data.packages
      .filter(isRechargeCommodityVisible)
      .map((item) => mapCommodityToRechargePlan(item, "package")),
    ...data.materials
      .filter(isRechargeCommodityVisible)
      .map((item) => mapCommodityToRechargePlan(item, "material")),
  ];
}

function resolvePaymentStatusLabel(status?: RechargeConsumeOrderStatus | null) {
  if (!status) {
    return "";
  }

  if (status.statusDetail) {
    return status.statusDetail;
  }

  switch (status.statusText) {
    case "WAIT_BUYER_PAY":
    case "USERPAYING":
    case "NOTPAY":
    case "NOT_PAID":
    case "UNPAID":
    case "PENDING":
    case "WAITING":
    case "CREATED":
    case "PROCESSING":
    case "PAYING":
    case "INIT":
    case "INITIALIZED":
    case "NEW":
      return "等待支付";
    case "SUCCESS":
    case "SUCCEEDED":
    case "PAID":
    case "PAY_SUCCESS":
    case "PAYMENT_SUCCESS":
    case "TRADE_SUCCESS":
    case "COMPLETED":
    case "COMPLETE":
    case "FINISHED":
    case "DONE":
      return "支付成功";
    case "FAILED":
    case "FAIL":
    case "CLOSED":
    case "CANCELLED":
    case "CANCELED":
    case "EXPIRED":
    case "TIMEOUT":
    case "PAYERROR":
    case "PAY_ERROR":
    case "ERROR":
    case "TRADE_CLOSED":
    case "REVOKED":
    case "ABORTED":
      return "订单已结束";
    default:
      return status.statusText || "";
  }
}

function isOrderExpired(validEndTime?: string) {
  if (!validEndTime) {
    return false;
  }

  const expiresAt = new Date(validEndTime).getTime();
  if (Number.isNaN(expiresAt)) {
    return false;
  }

  return Date.now() >= expiresAt;
}

function createExpiredPaymentStatus(): RechargeConsumeOrderStatus {
  return {
    raw: {},
    statusText: "EXPIRED",
    statusDetail: EXPIRED_PAYMENT_MESSAGE,
    isSuccess: false,
    isFailure: true,
    isPending: false,
  };
}

function RechargeLoadingState() {
  return (
    <div className="mx-auto max-w-[960px] rounded-[36px] border border-slate-200 bg-white/84 px-10 py-16 text-center shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
      <div className="text-[36px] font-black tracking-[-0.04em] text-slate-950">
        正在加载商品...
      </div>
      <p className="mt-5 text-[20px] font-bold leading-9 text-slate-400">
        稍等一下，充值商品正在从服务端同步。
      </p>
    </div>
  );
}

function RechargeErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="mx-auto max-w-[960px] rounded-[36px] border border-rose-200 bg-white/84 px-10 py-16 text-center shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
      <div className="text-[36px] font-black tracking-[-0.04em] text-slate-950">
        商品加载失败
      </div>
      <p className="mt-5 text-[20px] font-bold leading-9 text-slate-400">
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mx-auto mt-10 inline-flex h-16 min-w-[240px] items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#ff7a18_0%,#ff9f43_42%,#8b3dff_100%)] px-8 text-[24px] font-black text-white shadow-[0_18px_40px_rgba(139,61,255,0.24)] transition-transform duration-300 hover:scale-[1.01]"
      >
        重新加载
      </button>
    </div>
  );
}

function RechargeEmptyState({ activeTab }: { activeTab: RechargeTabKey }) {
  const title = activeTab === "membership" ? "暂无会员商品" : "暂无充值商品";
  const description = activeTab === "membership"
    ? "会员服务上架后会展示在这里。"
    : "加油包或素材商品上架后会展示在这里。";

  return (
    <div className="mx-auto max-w-[960px] rounded-[36px] border border-dashed border-slate-200 bg-white/84 px-10 py-16 text-center shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
      <div className="text-[36px] font-black tracking-[-0.04em] text-slate-950">
        {title}
      </div>
      <p className="mt-5 text-[20px] font-bold leading-9 text-slate-400">
        {description}
      </p>
    </div>
  );
}

function RechargePageContent() {
  const [messageApi, contextHolder] = message.useMessage();
  const [activeTab, setActiveTab] = useState<RechargeTabKey>("boost");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [voucherOpen, setVoucherOpen] = useState(false);
  const [voucherCode, setVoucherCode] = useState("");
  const [commodityCatalog, setCommodityCatalog] = useState<RechargeCommodityCatalog>(EMPTY_COMMODITY_CATALOG);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string>();
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentPlanTitle, setPaymentPlanTitle] = useState("");
  const [paymentOrder, setPaymentOrder] = useState<RechargeConsumeOrder | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<RechargeConsumeOrderStatus | null>(null);
  const [paymentDialogError, setPaymentDialogError] = useState<PaymentDialogError>();
  const [creatingPaymentPlanId, setCreatingPaymentPlanId] = useState("");
  const [pollingPaymentStatus, setPollingPaymentStatus] = useState(false);
  const paymentRequestSequence = useRef(0);
  const paymentSuccessCloseTimerRef = useRef<number | null>(null);

  const clearPaymentSuccessCloseTimer = useCallback(() => {
    if (paymentSuccessCloseTimerRef.current !== null) {
      window.clearTimeout(paymentSuccessCloseTimerRef.current);
      paymentSuccessCloseTimerRef.current = null;
    }
  }, []);

  const loadCommodityCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(undefined);

    try {
      const nextCatalog = await listRechargeCommodities();
      setCommodityCatalog(nextCatalog);
    } catch (loadError) {
      setCatalogError(formatRechargeError(loadError));
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCommodityCatalog();
  }, [loadCommodityCatalog]);

  useEffect(() => () => {
    clearPaymentSuccessCloseTimer();
  }, [clearPaymentSuccessCloseTimer]);

  const visiblePlans = useMemo(
    () => buildVisiblePlans(commodityCatalog, activeTab),
    [activeTab, commodityCatalog],
  );

  useEffect(() => {
    if (visiblePlans.length === 0) {
      if (selectedPlanId) {
        setSelectedPlanId("");
      }
      return;
    }

    const hasSelectedPlan = visiblePlans.some((plan) => plan.id === selectedPlanId);
    if (hasSelectedPlan) {
      return;
    }

    setSelectedPlanId(visiblePlans.find((plan) => plan.featured)?.id ?? visiblePlans[0]?.id ?? "");
  }, [selectedPlanId, visiblePlans]);

  const handleClosePaymentDialog = useCallback(() => {
    clearPaymentSuccessCloseTimer();
    paymentRequestSequence.current += 1;
    setPollingPaymentStatus(false);
    setPaymentDialogOpen(false);
    setPaymentOrder(null);
    setPaymentStatus(null);
    setPaymentDialogError(undefined);
    setCreatingPaymentPlanId("");
    setPaymentPlanTitle("");
  }, [clearPaymentSuccessCloseTimer]);

  const handlePurchasePlan = useCallback(async (plan: RechargePlan) => {
    clearPaymentSuccessCloseTimer();

    if (!plan.commodityId.trim()) {
      setSelectedPlanId(plan.id);
      setPaymentPlanTitle(plan.title);
      setPaymentDialogOpen(true);
      setPaymentOrder(null);
      setPaymentStatus(null);
      setPaymentDialogError({
        title: "无法创建支付订单",
        message: "当前商品缺少 commodity_id，暂时无法创建支付订单。",
        retryMode: "createOrder",
      });
      setCreatingPaymentPlanId("");
      return;
    }

    setSelectedPlanId(plan.id);
    setPaymentPlanTitle(plan.title);
    setPaymentDialogOpen(true);
    setPaymentOrder(null);
    setPaymentStatus(null);
    setPaymentDialogError(undefined);
    setCreatingPaymentPlanId(plan.id);

    const currentSequence = paymentRequestSequence.current + 1;
    paymentRequestSequence.current = currentSequence;

    try {
      const nextOrder = await getRechargeConsumeOrder({
        commodityId: plan.commodityId,
        price: plan.price,
        couponCode: voucherCode.trim() || undefined,
      });

      if (paymentRequestSequence.current !== currentSequence) {
        return;
      }

      if (!nextOrder.payUrl) {
        throw new Error("支付链接为空，请稍后重试。");
      }

      setPaymentOrder(nextOrder);
    } catch (createError) {
      if (paymentRequestSequence.current !== currentSequence) {
        return;
      }
      setPaymentDialogError({
        title: "二维码获取失败",
        message: formatPaymentCreateError(createError),
        retryMode: "createOrder",
      });
    } finally {
      if (paymentRequestSequence.current === currentSequence) {
        setCreatingPaymentPlanId("");
      }
    }
  }, [clearPaymentSuccessCloseTimer, voucherCode]);

  const handleRetryPayment = useCallback(() => {
    if (paymentDialogError?.retryMode === "checkStatus") {
      setPaymentDialogError(undefined);
      return;
    }

    const currentPlan = visiblePlans.find((plan) => plan.id === selectedPlanId);
    if (!currentPlan) {
      return;
    }
    void handlePurchasePlan(currentPlan);
  }, [handlePurchasePlan, paymentDialogError?.retryMode, selectedPlanId, visiblePlans]);

  useEffect(() => {
    if (!paymentDialogOpen || !paymentOrder?.orderCode || creatingPaymentPlanId || paymentDialogError) {
      setPollingPaymentStatus(false);
      return;
    }

    if (isOrderExpired(paymentOrder.validEndTime)) {
      setPaymentStatus(createExpiredPaymentStatus());
      setPaymentDialogError({
        title: "支付二维码已过期",
        message: EXPIRED_PAYMENT_MESSAGE,
        retryMode: "createOrder",
      });
      setPollingPaymentStatus(false);
      return;
    }

    let cancelled = false;
    let timerId: number | null = null;
    let consecutiveFailures = 0;

    const scheduleNextPoll = (delay: number) => {
      if (cancelled) {
        return;
      }

      timerId = window.setTimeout(() => {
        void pollOrderStatus();
      }, delay);
    };

    const pollOrderStatus = async () => {
      if (cancelled) {
        return;
      }

      if (isOrderExpired(paymentOrder.validEndTime)) {
        setPollingPaymentStatus(false);
        setPaymentStatus(createExpiredPaymentStatus());
        setPaymentDialogError({
          title: "支付二维码已过期",
          message: EXPIRED_PAYMENT_MESSAGE,
          retryMode: "createOrder",
        });
        return;
      }

      setPollingPaymentStatus(true);

      try {
        const nextStatus = await getRechargeConsumeOrderStatus(paymentOrder.orderCode);
        if (cancelled) {
          return;
        }

        consecutiveFailures = 0;
        setPaymentStatus(nextStatus);

        if (nextStatus.isSuccess) {
          setPollingPaymentStatus(false);
          setPaymentDialogError(undefined);
          void messageApi.success(`${paymentPlanTitle || "当前订单"}支付成功`);
          void refreshUserCenterVipInfo();
          clearPaymentSuccessCloseTimer();
          paymentSuccessCloseTimerRef.current = window.setTimeout(() => {
            void loadCommodityCatalog();
            handleClosePaymentDialog();
          }, PAYMENT_SUCCESS_AUTO_CLOSE_MS);
          return;
        }

        if (nextStatus.isFailure) {
          setPollingPaymentStatus(false);
          setPaymentDialogError({
            title: "支付未完成",
            message: resolvePaymentStatusLabel(nextStatus) || "订单已结束，请重新生成支付二维码。",
            retryMode: "createOrder",
          });
          return;
        }

        scheduleNextPoll(PAYMENT_STATUS_POLL_INTERVAL_MS);
      } catch (statusError) {
        if (cancelled) {
          return;
        }

        consecutiveFailures += 1;

        if (consecutiveFailures >= PAYMENT_STATUS_MAX_ERROR_RETRIES) {
          setPollingPaymentStatus(false);
          setPaymentDialogError({
            title: "订单状态查询失败",
            message: formatPaymentStatusError(statusError),
            retryMode: "checkStatus",
          });
          return;
        }

        scheduleNextPoll(PAYMENT_STATUS_RETRY_INTERVAL_MS);
      }
    };

    void pollOrderStatus();

    return () => {
      cancelled = true;
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
    };
  }, [
    clearPaymentSuccessCloseTimer,
    creatingPaymentPlanId,
    handleClosePaymentDialog,
    loadCommodityCatalog,
    messageApi,
    paymentDialogError,
    paymentDialogOpen,
    paymentOrder,
    paymentPlanTitle,
  ]);

  const paymentDialogStatus = useMemo(() => {
    if (creatingPaymentPlanId) {
      return {
        label: "正在创建支付订单",
        tone: "default" as const,
      };
    }

    if (paymentDialogError) {
      return {
        label: paymentDialogError.retryMode === "checkStatus" ? "订单状态查询受阻" : "支付未完成",
        tone: "error" as const,
      };
    }

    if (paymentStatus?.isSuccess) {
      return {
        label: resolvePaymentStatusLabel(paymentStatus) || "支付成功",
        tone: "success" as const,
      };
    }

    if (paymentStatus?.isFailure) {
      return {
        label: resolvePaymentStatusLabel(paymentStatus) || "订单已结束",
        tone: "error" as const,
      };
    }

    if (pollingPaymentStatus && paymentOrder?.orderCode) {
      return {
        label: resolvePaymentStatusLabel(paymentStatus) || "等待支付完成",
        tone: "default" as const,
      };
    }

    return undefined;
  }, [creatingPaymentPlanId, paymentDialogError, paymentOrder?.orderCode, paymentStatus, pollingPaymentStatus]);

  const paymentDialogRetryLabel = paymentDialogError?.retryMode === "checkStatus" ? "重新查询" : "重新获取";

  return (
    <>
      {contextHolder}
      <main className="brand-sunset-theme min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.98),rgba(255,247,250,0.98)_38%,rgba(243,232,255,0.96)),linear-gradient(180deg,#ffffff_0%,#fff8fc_60%,#faf5ff_100%)] px-5 py-6 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1840px]">
          <RechargeHeader />

          <section className="mt-12">
            <div className="relative flex w-full flex-col gap-6 xl:min-h-[96px] xl:justify-center">
              <div className="mx-auto w-full max-w-[760px]">
                <RechargeSegment
                  activeTab={activeTab}
                  tabs={rechargeTabs}
                  onChange={setActiveTab}
                />
              </div>

              <button
                type="button"
                onClick={() => setVoucherOpen(true)}
                className="mx-auto inline-flex h-[86px] w-full max-w-[240px] items-center justify-center rounded-full bg-[linear-gradient(135deg,#ff7a18_0%,#ff9f43_42%,#8b3dff_100%)] px-10 text-[30px] font-black tracking-[-0.03em] text-white shadow-[0_18px_40px_rgba(139,61,255,0.22)] transition-transform duration-300 hover:scale-[1.01] xl:absolute xl:right-0 xl:top-1/2 xl:mx-0 xl:-translate-y-1/2"
              >
                代金券兑换
              </button>
            </div>
          </section>

          <section className="mt-20">
            {catalogLoading ? <RechargeLoadingState /> : null}

            {!catalogLoading && catalogError ? (
              <RechargeErrorState message={catalogError} onRetry={() => {
                void loadCommodityCatalog();
              }}
              />
            ) : null}

            {!catalogLoading && !catalogError && visiblePlans.length > 0 ? (
              <div className="grid gap-8 xl:grid-cols-4">
                {visiblePlans.map((plan) => (
                  <RechargePlanCard
                    key={plan.id}
                    plan={plan}
                    selected={selectedPlanId === plan.id}
                    loading={creatingPaymentPlanId === plan.id}
                    onSelect={(nextPlan) => {
                      void handlePurchasePlan(nextPlan);
                    }}
                  />
                ))}
              </div>
            ) : null}

            {!catalogLoading && !catalogError && visiblePlans.length === 0 ? (
              <RechargeEmptyState activeTab={activeTab} />
            ) : null}
          </section>
        </div>
      </main>

      <RechargeVoucherDialog
        open={voucherOpen}
        value={voucherCode}
        onChange={setVoucherCode}
        onClose={() => setVoucherOpen(false)}
      />

      <RechargePaymentDialog
        open={paymentDialogOpen}
        planTitle={paymentPlanTitle}
        loading={Boolean(creatingPaymentPlanId)}
        polling={pollingPaymentStatus}
        statusLabel={paymentDialogStatus?.label}
        statusTone={paymentDialogStatus?.tone}
        error={paymentDialogError?.message}
        errorTitle={paymentDialogError?.title}
        retryLabel={paymentDialogRetryLabel}
        order={paymentOrder}
        onRetry={handleRetryPayment}
        onClose={handleClosePaymentDialog}
      />
    </>
  );
}

export function RechargePage() {
  const { checking, authenticated } = useRequireUserCenterAuth();

  if (checking || !authenticated) {
    return (
      <main className="brand-sunset-theme min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#ffffff_0%,#fffaf7_100%)] px-5 py-4 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-[1200px] rounded-[28px] bg-white/70 px-8 py-12 text-center shadow-[0_20px_48px_rgba(15,23,42,0.05)]">
          <div className="text-3xl font-black tracking-[-0.04em] text-slate-950">正在校验登录状态...</div>
          <div className="mt-4 text-base font-semibold text-slate-500">未登录用户将自动跳转到登录页</div>
        </div>
      </main>
    );
  }

  return <RechargePageContent />;
}
