"use client";

import { useMemo, useState } from "react";
import { useRequireUserCenterAuth } from "@/lib/use-require-user-center-auth";
import { RechargeHeader } from "./recharge-header";
import { rechargePlans, rechargeTabs, type RechargeTabKey } from "./recharge-data";
import { RechargePlanCard } from "./recharge-plan-card";
import { RechargeSegment } from "./recharge-segment";
import { RechargeVoucherDialog } from "./recharge-voucher-dialog";

function RechargePageContent() {
  const [activeTab, setActiveTab] = useState<RechargeTabKey>("boost");
  const [selectedPlanId, setSelectedPlanId] = useState<string>(rechargePlans[1]?.id ?? rechargePlans[0]!.id);
  const [voucherOpen, setVoucherOpen] = useState(false);
  const [voucherCode, setVoucherCode] = useState("");

  const visiblePlans = useMemo(() => {
    if (activeTab === "membership") {
      return [];
    }
    return rechargePlans;
  }, [activeTab]);

  return (
    <>
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
            {activeTab === "boost" ? (
              <div className="grid gap-8 xl:grid-cols-4">
                {visiblePlans.map((plan) => (
                  <RechargePlanCard
                    key={plan.id}
                    plan={plan}
                    selected={selectedPlanId === plan.id}
                    onSelect={setSelectedPlanId}
                  />
                ))}
              </div>
            ) : (
              <div className="mx-auto max-w-[960px] rounded-[36px] border border-dashed border-slate-200 bg-white/84 px-10 py-16 text-center shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
                <div className="text-[36px] font-black tracking-[-0.04em] text-slate-950">
                  会员服务即将上线
                </div>
                <p className="mt-5 text-[20px] font-bold leading-9 text-slate-400">
                  后续这里会补充会员权益、包月说明与专属购买入口，这一版先保留视觉占位。
                </p>
              </div>
            )}
          </section>
        </div>
      </main>

      <RechargeVoucherDialog
        open={voucherOpen}
        value={voucherCode}
        onChange={setVoucherCode}
        onClose={() => setVoucherOpen(false)}
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
