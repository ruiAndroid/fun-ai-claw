"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bot,
  Clock,
  Cpu,
  RefreshCw,
  Sparkles,
  Thermometer,
  Zap,
} from "lucide-react";
import { listHomepageAgents } from "@/lib/homepage-api";
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

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 py-3">
      <span className="w-20 shrink-0 text-xs font-semibold text-md-on-surface-variant">
        {label}
      </span>
      <div className="min-w-0 flex-1 text-sm text-md-on-surface">
        {children}
      </div>
    </div>
  );
}

function TagList({
  items,
  emptyText,
}: {
  items: string[] | null | undefined;
  emptyText: string;
}) {
  const list = items?.filter(Boolean) ?? [];
  if (list.length === 0) {
    return (
      <span className="text-xs text-md-on-surface-variant">{emptyText}</span>
    );
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

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="h-8 w-24 animate-pulse rounded-full bg-slate-200" />
      <div className="mt-8 h-14 w-14 animate-pulse rounded-[20px] bg-orange-100/80" />
      <div className="mt-5 h-8 w-2/3 animate-pulse rounded-full bg-slate-200" />
      <div className="mt-3 h-5 w-1/3 animate-pulse rounded-full bg-slate-100" />
      <div className="mt-8 space-y-4">
        <div className="h-28 w-full animate-pulse rounded-[20px] bg-slate-100" />
        <div className="h-44 w-full animate-pulse rounded-[20px] bg-slate-100" />
        <div className="h-28 w-full animate-pulse rounded-[20px] bg-slate-100" />
      </div>
    </div>
  );
}

export function AgentDetailPage() {
  const params = useParams<{ agentKey: string }>();
  const agentKey = params.agentKey;

  const [agent, setAgent] = useState<AgentBaselineSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const loadAgent = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    try {
      const response = await listHomepageAgents();
      const found = response.items?.find((item) => item.agentKey === agentKey);
      if (found) {
        setAgent(found);
      } else {
        setError("未找到该机器人");
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "加载机器人信息失败",
      );
    } finally {
      setLoading(false);
    }
  }, [agentKey]);

  useEffect(() => {
    void loadAgent();
  }, [loadAgent]);

  return (
    <main className="brand-sunset-theme relative min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,122,24,0.22),transparent_34%),radial-gradient(circle_at_top_right,rgba(139,61,255,0.16),transparent_28%),linear-gradient(180deg,#fffaf7_0%,#fff7fb_48%,#fffaf7_100%)]">
      {/* Background blurs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8rem] top-24 h-64 w-64 rounded-full bg-orange-300/16 blur-3xl" />
        <div className="absolute right-[-6rem] top-12 h-72 w-72 rounded-full bg-violet-300/14 blur-3xl" />
        <div className="absolute bottom-[-4rem] left-1/3 h-56 w-56 rounded-full bg-fuchsia-300/8 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-3xl px-6 py-10">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/72 px-4 py-2 text-sm font-semibold text-md-on-surface-variant shadow-sm transition hover:bg-white/90"
        >
          <ArrowLeft size={15} />
          返回首页
        </Link>

        {loading ? <PageSkeleton /> : null}

        {!loading && error ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-10 rounded-[28px] border border-rose-100 bg-white/88 p-8 shadow-[0_24px_60px_rgba(81,38,145,0.08)]"
          >
            <div className="text-lg font-bold text-md-on-surface">{error}</div>
            <p className="mt-2 text-sm text-md-on-surface-variant">
              请检查链接是否正确，或返回首页重新选择。
            </p>
            <button
              type="button"
              onClick={() => void loadAgent()}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-md-outline-variant/50 bg-white px-4 py-2 text-sm font-semibold text-md-primary transition hover:border-md-primary/40 hover:bg-orange-50/60"
            >
              <RefreshCw size={15} />
              重试
            </button>
          </motion.div>
        ) : null}

        {!loading && agent ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Header */}
            <div className="mt-10 flex items-start gap-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[linear-gradient(135deg,rgba(255,122,24,0.18),rgba(139,61,255,0.14))] text-md-primary shadow-[0_14px_28px_rgba(139,61,255,0.12)]">
                <Bot size={32} strokeWidth={2.1} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-black tracking-tight text-md-on-surface">
                    {agent.displayName || agent.agentKey}
                  </h1>
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

            {/* Badges */}
            <div className="mt-5 flex flex-wrap gap-2">
              {agent.model ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-md-outline-variant/40 bg-white/72 px-3 py-1 text-xs font-semibold text-md-on-surface-variant">
                  <Sparkles size={13} />
                  {agent.model}
                </span>
              ) : null}
              {agent.provider ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-md-outline-variant/40 bg-white/72 px-3 py-1 text-xs font-semibold text-md-on-surface-variant">
                  <Cpu size={13} />
                  {agent.provider}
                </span>
              ) : null}
              {agent.agentic ? (
                <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-600">
                  Agentic
                </span>
              ) : null}
            </div>

            {/* Description */}
            <div className="mt-8 rounded-[24px] border border-white/70 bg-white/88 p-6 shadow-[0_24px_60px_rgba(81,38,145,0.08)]">
              <div className="text-xs font-semibold text-md-on-surface-variant">
                简介
              </div>
              <div className="mt-3 text-sm leading-7 text-md-on-surface">
                {agent.description?.trim() || "当前暂无机器人简介。"}
              </div>
            </div>

            {/* Configuration */}
            <div className="mt-4 rounded-[24px] border border-white/70 bg-white/88 p-6 shadow-[0_24px_60px_rgba(81,38,145,0.08)]">
              <div className="text-xs font-semibold text-md-on-surface-variant">
                配置信息
              </div>
              <div className="mt-3 divide-y divide-md-outline-variant/15">
                {agent.model ? (
                  <DetailRow label="模型">
                    <span className="inline-flex items-center gap-1.5">
                      <Sparkles
                        size={13}
                        className="text-md-primary"
                      />
                      {agent.model}
                    </span>
                  </DetailRow>
                ) : null}
                {agent.provider ? (
                  <DetailRow label="供应商">
                    <span className="inline-flex items-center gap-1.5">
                      <Cpu
                        size={13}
                        className="text-md-on-surface-variant"
                      />
                      {agent.provider}
                    </span>
                  </DetailRow>
                ) : null}
                {agent.temperature != null ? (
                  <DetailRow label="温度">
                    <span className="inline-flex items-center gap-1.5">
                      <Thermometer
                        size={13}
                        className="text-md-on-surface-variant"
                      />
                      {agent.temperature}
                    </span>
                  </DetailRow>
                ) : null}
                <DetailRow label="Agentic">
                  <span className="inline-flex items-center gap-1.5">
                    <Zap
                      size={13}
                      className={
                        agent.agentic
                          ? "text-violet-500"
                          : "text-md-on-surface-variant"
                      }
                    />
                    {agent.agentic ? (
                      <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-600">
                        是
                      </span>
                    ) : (
                      "否"
                    )}
                  </span>
                </DetailRow>
                <DetailRow label="运行时">FunClaw</DetailRow>
              </div>
            </div>

            {/* Tools & Skills */}
            <div className="mt-4 rounded-[24px] border border-white/70 bg-white/88 p-6 shadow-[0_24px_60px_rgba(81,38,145,0.08)]">
              <div className="text-xs font-semibold text-md-on-surface-variant">
                工具与技能
              </div>
              <div className="mt-3 divide-y divide-md-outline-variant/15">
                <DetailRow label="技能">
                  <TagList
                    items={agent.allowedSkills}
                    emptyText="暂无技能配置"
                  />
                </DetailRow>
                <DetailRow label="工具">
                  <TagList
                    items={agent.allowedTools}
                    emptyText="暂无工具配置"
                  />
                </DetailRow>
              </div>
            </div>

            {/* Timestamps */}
            <div className="mt-6 flex flex-wrap items-center gap-5 text-xs text-md-on-surface-variant">
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
            <div className="mt-8 flex items-center gap-4">
              <Link
                href="/"
                className="inline-flex flex-1 items-center justify-center rounded-full border border-md-outline-variant/40 bg-white px-4 py-3 text-sm font-semibold text-md-on-surface transition hover:bg-slate-50"
              >
                返回首页
              </Link>
              <Link
                href="/messages"
                className="inline-flex flex-[1.3] items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#ff7a18_0%,#ff9f43_42%,#8b3dff_100%)] px-4 py-3 text-sm font-semibold !text-white shadow-[0_14px_28px_rgba(139,61,255,0.16)] transition-all duration-300 hover:shadow-[0_18px_36px_rgba(139,61,255,0.22)] hover:!text-white"
              >
                立即体验
              </Link>
            </div>
          </motion.div>
        ) : null}
      </div>
    </main>
  );
}
