"use client";

import Link from "next/link";
import { Modal } from "antd";
import { Bot, Clock, Cpu, Sparkles, Thermometer, Wrench, Zap } from "lucide-react";
import type { AgentBaselineSummary } from "@/types/contracts";

function formatFullTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="w-20 shrink-0 text-xs font-semibold text-md-on-surface-variant">{label}</span>
      <div className="min-w-0 flex-1 text-sm text-md-on-surface">{children}</div>
    </div>
  );
}

function TagList({ items, emptyText }: { items: string[] | null | undefined; emptyText: string }) {
  const list = items?.filter(Boolean) ?? [];
  if (list.length === 0) {
    return <span className="text-xs text-md-on-surface-variant">{emptyText}</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map((item) => (
        <span
          key={item}
          className="rounded-full border border-md-outline-variant/35 bg-white/72 px-2.5 py-0.5 text-xs font-medium text-md-on-surface-variant"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

export function HomepageAgentDetailModal({
  agent,
  open,
  onClose,
  messagesHref,
  authenticated,
}: {
  agent: AgentBaselineSummary | null;
  open: boolean;
  onClose: () => void;
  messagesHref: string;
  authenticated: boolean;
}) {
  if (!agent) {
    return null;
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={720}
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
        {/* Background blurs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-3rem] top-[-3rem] h-40 w-40 rounded-full bg-orange-300/18 blur-3xl" />
          <div className="absolute right-[-2rem] top-10 h-36 w-36 rounded-full bg-violet-300/18 blur-3xl" />
          <div className="absolute bottom-[-2rem] left-1/3 h-32 w-32 rounded-full bg-fuchsia-300/14 blur-3xl" />
        </div>

        {/* Header */}
        <div className="relative border-b border-white/70 bg-[linear-gradient(135deg,rgba(255,122,24,0.12)_0%,rgba(139,61,255,0.10)_100%)] px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,rgba(255,122,24,0.18),rgba(139,61,255,0.14))] text-md-primary shadow-[0_14px_28px_rgba(139,61,255,0.12)]">
              <Bot size={28} strokeWidth={2.1} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-[26px] font-black tracking-tight text-md-on-surface">
                  {agent.displayName || agent.agentKey}
                </h2>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    agent.enabled
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {agent.enabled ? "已启用" : "已禁用"}
                </span>
              </div>
              <p className="mt-1 text-xs font-medium tracking-[0.12em] text-md-on-surface-variant/80 uppercase">
                {agent.agentKey}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="relative max-h-[72vh] overflow-y-auto px-6 py-5">
          {/* Description */}
          <div className="rounded-[20px] border border-md-outline-variant/25 bg-white/72 px-4 py-4">
            <div className="text-[11px] font-semibold text-md-on-surface-variant">简介</div>
            <div className="mt-2 text-sm leading-7 text-md-on-surface">
              {agent.description?.trim() || "当前暂无机器人简介。"}
            </div>
          </div>

          {/* Configuration */}
          <div className="mt-4 rounded-[20px] border border-md-outline-variant/25 bg-white/72 px-4 py-3">
            <div className="text-[11px] font-semibold text-md-on-surface-variant">配置信息</div>
            <div className="mt-2 divide-y divide-md-outline-variant/15">
              {agent.model ? (
                <DetailRow label="模型">
                  <span className="inline-flex items-center gap-1.5">
                    <Sparkles size={13} className="text-md-primary" />
                    {agent.model}
                  </span>
                </DetailRow>
              ) : null}
              {agent.provider ? (
                <DetailRow label="供应商">
                  <span className="inline-flex items-center gap-1.5">
                    <Cpu size={13} className="text-md-on-surface-variant" />
                    {agent.provider}
                  </span>
                </DetailRow>
              ) : null}
              {agent.temperature != null ? (
                <DetailRow label="温度">
                  <span className="inline-flex items-center gap-1.5">
                    <Thermometer size={13} className="text-md-on-surface-variant" />
                    {agent.temperature}
                  </span>
                </DetailRow>
              ) : null}
              <DetailRow label="Agentic">
                <span className="inline-flex items-center gap-1.5">
                  <Zap size={13} className={agent.agentic ? "text-violet-500" : "text-md-on-surface-variant"} />
                  {agent.agentic ? (
                    <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-600">是</span>
                  ) : "否"}
                </span>
              </DetailRow>
              <DetailRow label="运行时">
                {agent.runtime}
              </DetailRow>
            </div>
          </div>

          {/* Tools & Skills */}
          {(agent.allowedTools?.length || agent.allowedSkills?.length) ? (
            <div className="mt-4 rounded-[20px] border border-md-outline-variant/25 bg-white/72 px-4 py-3">
              <div className="text-[11px] font-semibold text-md-on-surface-variant">工具与技能</div>
              <div className="mt-2 divide-y divide-md-outline-variant/15">
                {agent.allowedTools?.length ? (
                  <DetailRow label="工具">
                    <div className="inline-flex items-start gap-1.5">
                      <Wrench size={13} className="mt-0.5 shrink-0 text-md-on-surface-variant" />
                      <TagList items={agent.allowedTools} emptyText="未配置" />
                    </div>
                  </DetailRow>
                ) : null}
                {agent.allowedSkills?.length ? (
                  <DetailRow label="技能">
                    <TagList items={agent.allowedSkills} emptyText="未配置" />
                  </DetailRow>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Timestamps */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-md-on-surface-variant">
            <span className="inline-flex items-center gap-1.5">
              <Clock size={12} />
              创建：{formatFullTimestamp(agent.createdAt)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={12} />
              更新：{formatFullTimestamp(agent.updatedAt)}
            </span>
          </div>

          {/* CTA */}
          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex flex-1 items-center justify-center rounded-full border border-md-outline-variant/40 bg-white px-4 py-3 text-sm font-semibold text-md-on-surface transition hover:bg-slate-50"
            >
              关闭
            </button>
            <Link
              href={messagesHref}
              className="inline-flex flex-[1.3] items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#ff7a18_0%,#ff9f43_42%,#8b3dff_100%)] px-4 py-3 text-sm font-semibold !text-white shadow-[0_14px_28px_rgba(139,61,255,0.16)] transition-all duration-300 hover:shadow-[0_18px_36px_rgba(139,61,255,0.22)] hover:!text-white"
            >
              {authenticated ? "立即体验" : "登录后体验"}
            </Link>
          </div>
        </div>
      </div>
    </Modal>
  );
}
