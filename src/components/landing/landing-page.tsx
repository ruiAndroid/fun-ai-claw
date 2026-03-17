"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BookOpen,
  Bot,
  BrainCircuit,
  Compass,
  MessageCircle,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Radar,
  Sparkles,
  WandSparkles,
  Workflow,
} from "lucide-react";

type FeatureCard = {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
  accent: string;
  chips: string[];
};

const primaryCards: FeatureCard[] = [
  {
    icon: Bot,
    title: "机器人控制台",
    description: "集中管理 Agent、Skill、实例、模型与运行状态，把机器人从概念真正编排成产品。",
    href: "/console",
    ctaLabel: "进入控制台",
    accent: "from-cyan-500/20 via-teal-500/12 to-transparent",
    chips: ["Agent", "Skill", "Instance"],
  },
  {
    icon: BookOpen,
    title: "文档中心",
    description: "把接入说明、部署手册、架构设计与最佳实践统一沉淀到同一套品牌化入口。",
    href: "/docs",
    ctaLabel: "查看文档",
    accent: "from-violet-500/18 via-fuchsia-500/12 to-transparent",
    chips: ["Docs", "Architecture", "Guide"],
  },
  {
    icon: WandSparkles,
    title: "Open API",
    description: "通过统一接口把你的业务系统接进来，让外部前端、工作流与机器人运行时自然衔接。",
    href: "/docs/open-v1-external-frontend-integration",
    ctaLabel: "查看接入方式",
    accent: "from-emerald-500/18 via-cyan-500/12 to-transparent",
    chips: ["Open /v1", "REST", "WS"],
  },
];

const secondaryCards: FeatureCard[] = [
  {
    icon: Workflow,
    title: "可运营的机器人产品门面",
    description: "首页不只是展示，而是用户进入机器人生态、理解价值、触达入口的第一触点。",
    href: "/",
    ctaLabel: "浏览首页",
    accent: "from-sky-500/18 via-cyan-500/12 to-transparent",
    chips: ["Brand", "Landing", "Conversion"],
  },
  {
    icon: BrainCircuit,
    title: "Agent × Skill 编排体验",
    description: "让不同能力模块以稳定的产品化方式组织起来，而不是零散的工具和脚本拼接。",
    href: "/console",
    ctaLabel: "查看编排",
    accent: "from-fuchsia-500/18 via-purple-500/12 to-transparent",
    chips: ["Composition", "Workflow", "Experience"],
  },
  {
    icon: Radar,
    title: "品牌级视觉表达",
    description: "基于 Nextra 与 Google Stitch 风格，把工作台、首页与文档打造成统一的品牌系统。",
    href: "/docs",
    ctaLabel: "查看设计语境",
    accent: "from-amber-500/18 via-orange-500/12 to-transparent",
    chips: ["Nextra", "Material 3", "Stitch"],
  },
];

const messageShortcuts = [
  { label: "创建机器人", href: "/console" },
  { label: "查看文档", href: "/docs" },
  { label: "接入 Open API", href: "/docs/open-v1-external-frontend-integration" },
];

const heroHighlights = [
  "机器人入口",
  "控制台编排",
  "文档与 API",
  "品牌化首页",
];

function FeatureCardView({ card, index }: { card: FeatureCard; index: number }) {
  const Icon = card.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.1 * index, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6, scale: 1.01 }}
      className="group relative overflow-hidden rounded-[32px] border border-white/70 bg-white/82 p-7 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${card.accent}`} />
      <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/30 blur-3xl" />

      <div className="relative flex h-full flex-col">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[20px] bg-white/88 shadow-[0_10px_24px_rgba(15,118,110,0.12)]">
          <Icon size={24} className="text-md-primary" strokeWidth={2.1} />
        </div>

        <h3 className="mb-2 text-xl font-bold tracking-tight text-md-on-surface">{card.title}</h3>
        <p className="mb-6 text-sm leading-7 text-md-on-surface-variant">{card.description}</p>

        <div className="mb-6 flex flex-wrap gap-2">
          {card.chips.map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-md-outline-variant/40 bg-white/72 px-3 py-1 text-xs font-semibold text-md-on-surface-variant"
            >
              {chip}
            </span>
          ))}
        </div>

        <div className="mt-auto">
          <Link
            href={card.href}
            className="inline-flex items-center gap-2 rounded-full bg-md-primary px-4 py-2.5 text-sm font-semibold text-md-on-primary shadow-md-2 transition-all duration-300 hover:gap-3 hover:shadow-md-4"
          >
            {card.ctaLabel}
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6">
      <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-md-primary/12 bg-white/70 px-3 py-1 text-xs font-bold tracking-[0.18em] uppercase text-md-primary shadow-sm">
        <Sparkles size={12} />
        {eyebrow}
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-md-on-surface sm:text-[30px]">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-7 text-md-on-surface-variant sm:text-base">{description}</p>
    </div>
  );
}

export function LandingPage() {
  const [messagesCollapsed, setMessagesCollapsed] = useState(false);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(167,243,208,0.32),transparent_32%),radial-gradient(circle_at_top_right,rgba(125,211,252,0.18),transparent_28%),linear-gradient(180deg,#f8fffe_0%,#f4fbfa_48%,#f8fffe_100%)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8rem] top-24 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="absolute right-[-6rem] top-12 h-72 w-72 rounded-full bg-teal-300/15 blur-3xl" />
        <div className="absolute bottom-[-4rem] left-1/3 h-56 w-56 rounded-full bg-violet-300/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(15,118,110,0.05)_1px,transparent_1px)] [background-size:22px_22px] opacity-30" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[1920px]">
        <motion.aside
          animate={{ width: messagesCollapsed ? 104 : 286 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="hidden shrink-0 border-r border-md-outline-variant/25 bg-white/76 px-4 py-5 backdrop-blur-2xl xl:flex xl:flex-col"
        >
          <div className="flex items-center justify-between gap-2 rounded-[28px] border border-white/70 bg-white/76 px-3 py-3 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <button
              type="button"
              className="inline-flex min-w-0 flex-1 items-center gap-3 rounded-[20px] px-2 py-2 text-left text-md-on-surface"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-md-surface-container text-md-primary shadow-sm">
                <MessageCircle size={18} />
              </span>
              {!messagesCollapsed ? (
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-bold">消息</span>
                  <span className="block truncate text-xs text-md-on-surface-variant">机器人会话入口</span>
                </span>
              ) : null}
            </button>

            {!messagesCollapsed ? (
              <button
                type="button"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-md-primary text-md-on-primary shadow-md-2 transition-transform duration-300 hover:scale-105"
                aria-label="新建消息"
              >
                <Plus size={18} />
              </button>
            ) : null}
          </div>

          <div className="mt-4 flex items-center justify-end">
            <button
              type="button"
              onClick={() => setMessagesCollapsed((value) => !value)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/76 text-md-on-surface shadow-sm transition-all duration-300 hover:border-md-primary/20 hover:text-md-primary"
              aria-label={messagesCollapsed ? "展开消息栏" : "折叠消息栏"}
            >
              {messagesCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            </button>
          </div>

          <div className="mt-6 flex-1">
            {messagesCollapsed ? (
              <div className="space-y-3">
                {[MessageCircle, Bot, Workflow].map((Icon, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.08 }}
                    className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/70 bg-white/76 text-md-primary shadow-[0_14px_30px_rgba(15,23,42,0.06)]"
                  >
                    <Icon size={20} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-[32px] border border-white/70 bg-white/80 p-5 shadow-[0_24px_50px_rgba(15,23,42,0.06)]"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-gradient-to-br from-cyan-400/25 via-teal-400/15 to-transparent text-md-primary shadow-sm">
                  <MessageCircle size={24} />
                </div>
                <h3 className="mt-4 text-xl font-bold tracking-tight text-md-on-surface">消息中心</h3>
                <p className="mt-2 text-sm leading-7 text-md-on-surface-variant">
                  这里不再放假会话数据。等你真正接入机器人、实例与消息流后，最近会话会自然出现在这里。
                </p>

                <div className="mt-5 space-y-3">
                  {messageShortcuts.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="flex items-center justify-between rounded-[20px] border border-md-outline-variant/30 bg-md-surface/75 px-4 py-3 text-sm font-semibold text-md-on-surface transition-all duration-300 hover:border-md-primary/18 hover:bg-white hover:text-md-primary"
                    >
                      <span>{item.label}</span>
                      <ArrowRight size={15} />
                    </Link>
                  ))}
                </div>

                <div className="mt-5 rounded-[24px] border border-dashed border-md-outline-variant/50 bg-md-surface-container/55 px-4 py-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-md-primary">Tip</div>
                  <div className="mt-2 text-sm leading-6 text-md-on-surface-variant">
                    先进入控制台完成 Agent、Skill 与实例编排，再回到首页，这里就可以承接真实的机器人消息。
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          <div className="mt-6">
            {messagesCollapsed ? (
              <div className="flex flex-col gap-3">
                <Link
                  href="/console"
                  className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-md-primary text-md-on-primary shadow-md-2"
                >
                  <Bot size={18} />
                </Link>
                <Link
                  href="/docs"
                  className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/70 bg-white/78 text-md-on-surface shadow-sm"
                >
                  <BookOpen size={18} />
                </Link>
              </div>
            ) : (
              <div className="rounded-[28px] border border-white/70 bg-white/78 p-4 shadow-[0_24px_50px_rgba(15,23,42,0.07)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-gradient-to-br from-cyan-400 via-teal-400 to-emerald-400 text-white shadow-md-2">
                    <Bot size={20} />
                  </div>
                  <div>
                    <div className="text-base font-bold text-md-on-surface">FunClaw</div>
                    <div className="text-xs text-md-on-surface-variant">机器人产品首页</div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Link
                    href="/console"
                    className="rounded-[18px] bg-md-primary px-4 py-3 text-center text-sm font-semibold text-md-on-primary shadow-md-2"
                  >
                    控制台
                  </Link>
                  <Link
                    href="/docs"
                    className="rounded-[18px] border border-md-outline-variant/35 bg-white px-4 py-3 text-center text-sm font-semibold text-md-on-surface"
                  >
                    文档
                  </Link>
                </div>
              </div>
            )}
          </div>
        </motion.aside>

        <div className="flex-1 px-4 py-4 sm:px-6 lg:px-8 lg:py-6 xl:px-10">
          <motion.header
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-[28px] border border-white/70 bg-white/72 px-5 py-4 shadow-[0_20px_55px_rgba(15,23,42,0.05)] backdrop-blur-xl sm:px-6"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <h1 className="text-[28px] font-black tracking-[-0.04em] text-md-on-surface sm:text-[34px]">
                FunClaw / 机器人
              </h1>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/docs"
                  className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-4 py-2.5 text-sm font-semibold text-md-on-surface shadow-sm transition-colors duration-300 hover:text-md-primary"
                >
                  <BookOpen size={15} />
                  文档
                </Link>
                <Link
                  href="/docs/open-v1-external-frontend-integration"
                  className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-4 py-2.5 text-sm font-semibold text-md-on-surface shadow-sm transition-colors duration-300 hover:text-md-primary"
                >
                  <Network size={15} />
                  Open API
                </Link>
                <Link
                  href="/console"
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-300 to-teal-300 px-5 py-2.5 text-sm font-bold text-slate-900 shadow-[0_16px_40px_rgba(45,212,191,0.24)] transition-transform duration-300 hover:scale-[1.02]"
                >
                  进入控制台
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </motion.header>

          <div className="mt-6 grid gap-6">
            <motion.section
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="relative overflow-hidden rounded-[40px] border border-white/70 bg-[linear-gradient(135deg,rgba(8,47,73,0.96)_0%,rgba(15,118,110,0.94)_46%,rgba(34,197,94,0.84)_100%)] p-7 text-white shadow-[0_28px_80px_rgba(15,118,110,0.25)] sm:p-8"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.22),transparent_24%),radial-gradient(circle_at_80%_15%,rgba(255,255,255,0.16),transparent_22%),radial-gradient(circle_at_60%_82%,rgba(255,255,255,0.10),transparent_26%)]" />
              <div className="absolute -right-14 top-10 h-56 w-56 rounded-full bg-white/12 blur-3xl" />
              <div className="absolute left-1/3 top-1/2 h-40 w-40 rounded-full bg-cyan-200/15 blur-3xl" />

              <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.05fr)_420px] xl:items-center">
                <div>
                  <div className="flex flex-wrap gap-2">
                    {heroHighlights.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-white/18 bg-white/10 px-3 py-1 text-xs font-semibold text-white/88 backdrop-blur-sm"
                      >
                        {item}
                      </span>
                    ))}
                  </div>

                  <h2 className="mt-5 max-w-3xl text-3xl font-black leading-tight tracking-[-0.04em] sm:text-5xl">
                    把 Agent、Skill 与实例编排成
                    <br className="hidden sm:block" />
                    一个真正可运营的机器人产品
                  </h2>

                  <p className="mt-4 max-w-2xl text-sm leading-7 text-white/78 sm:text-base">
                    从首页承接品牌与流量，从控制台完成编排与治理，再通过 Open API 把能力接入到你的真实业务场景。
                  </p>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link
                      href="/console"
                      className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-[0_18px_40px_rgba(255,255,255,0.28)] transition-all duration-300 hover:gap-3"
                    >
                      打开机器人控制台
                      <ArrowRight size={16} />
                    </Link>
                    <Link
                      href="/docs"
                      className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors duration-300 hover:bg-white/16"
                    >
                      <BookOpen size={16} />
                      查看产品文档
                    </Link>
                  </div>
                </div>

                <div className="relative">
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
                    className="rounded-[32px] border border-white/14 bg-slate-950/34 p-5 shadow-[0_24px_70px_rgba(2,132,199,0.18)] backdrop-blur-xl"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/70">
                          Robot experience
                        </div>
                        <div className="mt-1 text-xl font-bold">产品能力地图</div>
                      </div>
                      <Compass size={16} className="text-cyan-100/75" />
                    </div>

                    <div className="mt-5 space-y-3">
                      {[
                        {
                          title: "首页入口",
                          description: "承接品牌表达、入口分发与用户第一触达。",
                        },
                        {
                          title: "控制台编排",
                          description: "完成 Agent、Skill、实例与模型配置。",
                        },
                        {
                          title: "Open API 接入",
                          description: "让外部系统把机器人能力接到真实业务流程。",
                        },
                      ].map((item) => (
                        <div
                          key={item.title}
                          className="rounded-[24px] border border-white/10 bg-white/8 px-4 py-4"
                        >
                          <div className="text-sm font-bold text-white">{item.title}</div>
                          <div className="mt-1 text-xs leading-6 text-white/68">{item.description}</div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 rounded-[28px] border border-white/10 bg-white/8 p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-white">核心组成</div>
                        <Workflow size={16} className="text-cyan-100/75" />
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {["消息入口", "机器人矩阵", "控制台", "文档中心", "Open API"].map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[11px] font-medium text-white/78"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.section>

            <section>
              <SectionHeader
                eyebrow="Primary Entry"
                title="先把真正重要的入口做强"
                description="聚焦机器人控制台、文档中心和 Open API 三个主入口，不再展示社区与定时任务等当前不需要的模块。"
              />
              <div className="grid gap-6 lg:grid-cols-3">
                {primaryCards.map((card, index) => (
                  <FeatureCardView key={card.title} card={card} index={index} />
                ))}
              </div>
            </section>

            <section>
              <SectionHeader
                eyebrow="Product Surface"
                title="让首页承担品牌、说明与转化"
                description="首页不再堆假数据，而是展示真实的产品结构、能力入口与使用路径，让用户自然进入 FunClaw 的机器人体系。"
              />
              <div className="grid gap-6 lg:grid-cols-3">
                {secondaryCards.map((card, index) => (
                  <FeatureCardView key={card.title} card={card} index={index + primaryCards.length} />
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
