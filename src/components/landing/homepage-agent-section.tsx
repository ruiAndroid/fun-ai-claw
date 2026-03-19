"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bot, Cpu, RefreshCw, Sparkles } from "lucide-react";
import { HomepageSectionHeader } from "./homepage-section-header";
import { listHomepageAgents } from "@/lib/homepage-api";
import type { AgentBaselineSummary } from "@/types/contracts";

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function AgentSectionSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-[28px] border border-white/70 bg-white/84 p-6 shadow-[0_24px_60px_rgba(81,38,145,0.08)]"
        >
          <div className="h-12 w-12 animate-pulse rounded-[18px] bg-orange-100/80" />
          <div className="mt-5 h-6 w-2/3 animate-pulse rounded-full bg-slate-200" />
          <div className="mt-3 h-4 w-1/3 animate-pulse rounded-full bg-slate-100" />
          <div className="mt-5 space-y-2">
            <div className="h-4 w-full animate-pulse rounded-full bg-slate-100" />
            <div className="h-4 w-5/6 animate-pulse rounded-full bg-slate-100" />
          </div>
          <div className="mt-6 flex gap-2">
            <div className="h-8 w-20 animate-pulse rounded-full bg-slate-100" />
            <div className="h-8 w-20 animate-pulse rounded-full bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function HomepageAgentSection({
  authenticated,
  messagesHref,
}: {
  authenticated: boolean;
  messagesHref: string;
}) {
  const [agents, setAgents] = useState<AgentBaselineSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const loadAgents = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    try {
      const response = await listHomepageAgents();
      setAgents(response.items ?? []);
    } catch (loadError) {
      setAgents([]);
      setError(loadError instanceof Error ? loadError.message : "加载机器人列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAgents();
  }, [loadAgents]);

  const sectionDescription = useMemo(() => {
    if (loading) {
      return "正在为你加载已正式上线的机器人，稍候即可挑选体验。";
    }
    if (error) {
      return "机器人列表暂时不可用，请稍后刷新重试。";
    }
    return `当前已上线 ${agents.length} 个机器人，覆盖剧本创作、漫剧生成等热门场景，选择一个即可开始体验。`;
  }, [agents.length, error, loading]);

  return (
    <section>
      <HomepageSectionHeader
        eyebrow="Featured Lobsters"
        title="精选机器人，随时开聊"
        description={sectionDescription}
      />

      {loading ? <AgentSectionSkeleton /> : null}

      {!loading && error ? (
        <div className="rounded-[28px] border border-rose-100 bg-white/88 p-6 shadow-[0_24px_60px_rgba(81,38,145,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-lg font-bold text-md-on-surface">机器人列表加载失败</div>
              <p className="mt-2 text-sm leading-7 text-md-on-surface-variant">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => void loadAgents()}
              className="inline-flex items-center gap-2 rounded-full border border-md-outline-variant/50 bg-white px-4 py-2 text-sm font-semibold text-md-primary transition hover:border-md-primary/40 hover:bg-orange-50/60"
            >
              <RefreshCw size={15} />
              重新加载
            </button>
          </div>
        </div>
      ) : null}

      {!loading && !error && agents.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-md-outline-variant/40 bg-white/76 p-8 text-center text-sm text-md-on-surface-variant">
          暂无机器人可展示，请先在控制台创建并启用对应 Agent。
        </div>
      ) : null}

      {!loading && !error && agents.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent, index) => (
            <Link key={agent.agentKey} href={`/agent/${encodeURIComponent(agent.agentKey)}`}>
            <motion.article
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: Math.min(index, 8) * 0.04, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -6, scale: 1.01 }}
              className="group relative cursor-pointer overflow-hidden rounded-[30px] border border-white/70 bg-white/88 p-6 shadow-[0_24px_60px_rgba(81,38,145,0.08)] backdrop-blur-xl transition-shadow duration-300 hover:shadow-[0_30px_70px_rgba(139,61,255,0.14)]"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,122,24,0.10),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(139,61,255,0.08),transparent_28%)]" />

              <div className="relative flex h-full flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,rgba(255,122,24,0.16),rgba(139,61,255,0.14))] text-md-primary shadow-[0_10px_24px_rgba(139,61,255,0.12)]">
                    <Bot size={22} strokeWidth={2.1} />
                  </div>
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

                <div className="mt-5">
                  <h3 className="text-xl font-bold tracking-tight text-md-on-surface">
                    {agent.displayName || agent.agentKey}
                  </h3>
                  <p className="mt-2 text-xs font-medium tracking-[0.12em] text-md-on-surface-variant/80 uppercase">
                    {agent.agentKey}
                  </p>
                </div>
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

                <div className="mt-6 rounded-[20px] border border-md-outline-variant/25 bg-white/72 px-4 py-4">
                  <div className="text-[11px] font-semibold text-md-on-surface-variant">简介</div>
                  <div className="mt-2 text-sm leading-6 text-md-on-surface">
                    {agent.description?.trim() || "当前暂无机器人简介。"}
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between gap-3">
                  <span className="text-xs text-md-on-surface-variant">
                    最近更新：{formatTimestamp(agent.updatedAt)}
                  </span>
                  <span
                    className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#ff7a18_0%,#ff9f43_42%,#8b3dff_100%)] px-4 py-2 text-sm font-semibold text-md-on-primary shadow-[0_14px_28px_rgba(139,61,255,0.16)] transition-all duration-300 hover:shadow-[0_18px_36px_rgba(139,61,255,0.22)]"
                  >
                    {authenticated ? "立即体验" : "登录后体验"}
                  </span>
                </div>
              </div>
            </motion.article>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
