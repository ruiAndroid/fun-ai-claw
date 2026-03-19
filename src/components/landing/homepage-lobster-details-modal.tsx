"use client";

import Link from "next/link";
import { Modal } from "antd";
import { CalendarClock, MessageSquareText, Rocket, UserRound } from "lucide-react";
import { XiamiIcon } from "@/components/ui/xiami-icon";
import type { HomepageRecentSessionPreview } from "@/lib/homepage-api";
import type { ConsumerBoundInstance } from "@/types/consumer";

function formatDateTime(value?: string | null) {
  if (!value) {
    return "暂无";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "暂无";
  }
  return parsed.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatInstanceStatus(status?: string) {
  switch (status) {
    case "RUNNING":
      return "运行中";
    case "STOPPED":
      return "已停止";
    case "CREATING":
      return "初始化中";
    case "ERROR":
      return "异常";
    default:
      return status || "未知";
  }
}

function formatSourceType(sourceType?: string) {
  switch (sourceType) {
    case "ADOPTION":
      return "首页领取";
    case "MANUAL":
      return "手动绑定";
    default:
      return sourceType || "系统";
  }
}

function DetailCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[18px] border border-white/80 bg-white/84 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-md-on-surface-variant/80">
        {label}
      </div>
      <div className="mt-2 text-sm font-bold text-md-on-surface">{value}</div>
    </div>
  );
}

export function HomepageLobsterDetailsModal({
  open,
  onClose,
  instance,
  conversationHref,
  recentSession,
}: {
  open: boolean;
  onClose: () => void;
  instance?: ConsumerBoundInstance;
  conversationHref: string;
  recentSession?: HomepageRecentSessionPreview;
}) {
  if (!instance) {
    return null;
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={680}
      destroyOnHidden
      styles={{
        content: {
          overflow: "hidden",
          borderRadius: 28,
          padding: 0,
          background:
            "linear-gradient(180deg, rgba(255,250,247,0.98) 0%, rgba(255,247,251,0.98) 100%)",
          boxShadow: "0 32px 80px rgba(76, 29, 149, 0.16)",
        },
        body: {
          padding: 0,
        },
      }}
    >
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-3rem] top-[-3rem] h-40 w-40 rounded-full bg-orange-300/18 blur-3xl" />
          <div className="absolute right-[-2rem] top-10 h-36 w-36 rounded-full bg-violet-300/18 blur-3xl" />
          <div className="absolute bottom-[-2rem] left-1/3 h-32 w-32 rounded-full bg-fuchsia-300/14 blur-3xl" />
        </div>

        <div className="relative border-b border-white/70 bg-[linear-gradient(135deg,rgba(255,122,24,0.12)_0%,rgba(139,61,255,0.10)_100%)] px-6 py-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/76 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-md-primary shadow-sm">
            <Rocket size={13} />
            Lobster Ready
          </div>
          <div className="mt-4 flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,rgba(255,122,24,0.18),rgba(139,61,255,0.14))] text-md-primary shadow-[0_14px_28px_rgba(139,61,255,0.12)]">
              <XiamiIcon size={28} title={instance.name} />
            </div>
            <div className="min-w-0">
              <h2 className="text-[26px] font-black tracking-tight text-md-on-surface">{instance.name}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-md-on-surface-variant">
                你的龙虾已经绑定到当前账号，可以直接进入对话，也可以先查看当前状态与最近动作。
              </p>
            </div>
          </div>
        </div>

        <div className="relative px-6 py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailCard label="运行状态" value={formatInstanceStatus(instance.status)} />
            <DetailCard label="绑定来源" value={formatSourceType(instance.sourceType)} />
            <DetailCard label="绑定时间" value={formatDateTime(instance.boundAt)} />
            <DetailCard label="最近更新" value={formatDateTime(instance.bindingUpdatedAt)} />
          </div>

          <div className="mt-4 rounded-[22px] border border-white/80 bg-white/84 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
            <div className="flex items-center gap-2 text-base font-bold text-md-on-surface">
              <CalendarClock size={16} />
              <span>最近动作</span>
            </div>

            {recentSession ? (
              <div className="mt-3 rounded-[18px] border border-md-outline-variant/25 bg-[linear-gradient(135deg,rgba(255,122,24,0.08),rgba(139,61,255,0.06))] p-4">
                <div className="text-sm font-semibold text-md-on-surface">最近会话</div>
                <div className="mt-1 text-sm text-md-on-surface-variant">{recentSession.title}</div>
                <Link
                  href={recentSession.href}
                  onClick={onClose}
                  className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-md-primary transition hover:text-md-primary/80"
                >
                  <MessageSquareText size={15} />
                  继续最近会话
                </Link>
              </div>
            ) : (
              <div className="mt-3 rounded-[18px] border border-md-outline-variant/25 bg-[linear-gradient(135deg,rgba(255,122,24,0.08),rgba(139,61,255,0.06))] p-4 text-sm text-md-on-surface-variant">
                还没有历史会话，直接进入龙虾即可开始第一段对话。
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              href={conversationHref}
              onClick={onClose}
              style={{ color: "#fff" }}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#ff7a18_0%,#ff9f43_42%,#8b3dff_100%)] px-4 py-3 text-sm font-semibold shadow-[0_14px_28px_rgba(139,61,255,0.16)] transition hover:shadow-[0_18px_36px_rgba(139,61,255,0.22)]"
            >
              <XiamiIcon size={16} title="龙虾" />
              进入龙虾
            </Link>
          </div>
        </div>
      </div>
    </Modal>
  );
}
