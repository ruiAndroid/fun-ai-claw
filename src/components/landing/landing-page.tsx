"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BookOpen,
  Bot,
  BrainCircuit,
  ChevronRight,
  Compass,
  Crown,
  MessageCircle,
  Orbit,
  PanelLeftClose,
  Plus,
  Radar,
  ShieldCheck,
  Sparkles,
  Stars,
  WalletCards,
  WandSparkles,
  Workflow,
} from "lucide-react";

type SidebarAgent = {
  name: string;
  subtitle: string;
  accent: string;
  online: boolean;
};

type HomepageCard = {
  icon: LucideIcon;
  title: string;
  description: string;
  metric: string;
  metricLabel: string;
  tags: string[];
  href: string;
  ctaLabel: string;
  accent: string;
};

const sidebarAgents: SidebarAgent[] = [
  {
    name: "短剧编剧官",
    subtitle: "爆款梗概 · 人设 · 分集",
    accent: "from-cyan-400 via-sky-400 to-indigo-500",
    online: true,
  },
  {
    name: "漫剧工坊",
    subtitle: "分镜结构 · 节奏拆解",
    accent: "from-emerald-400 via-teal-400 to-cyan-500",
    online: true,
  },
  {
    name: "投流封面师",
    subtitle: "标题策略 · 强钩子提炼",
    accent: "from-fuchsia-400 via-violet-400 to-purple-500",
    online: false,
  },
  {
    name: "直播助手",
    subtitle: "话术脚本 · 节奏控场",
    accent: "from-orange-400 via-amber-400 to-yellow-400",
    online: true,
  },
  {
    name: "运营参谋",
    subtitle: "活动排期 · 数据复盘",
    accent: "from-slate-400 via-sky-500 to-cyan-500",
    online: true,
  },
  {
    name: "客户陪练官",
    subtitle: "问答训练 · SOP 演练",
    accent: "from-rose-400 via-pink-400 to-fuchsia-500",
    online: false,
  },
  {
    name: "品牌文案脑",
    subtitle: "语气统一 · 内容矩阵",
    accent: "from-teal-400 via-emerald-400 to-lime-400",
    online: true,
  },
];

const robotCards: HomepageCard[] = [
  {
    icon: WandSparkles,
    title: "爆款机器人矩阵",
    description: "把梗概生成、角色塑造、分镜扩写、投流包装合成一条高转化生产链。",
    metric: "28+",
    metricLabel: "现成工作流",
    tags: ["短剧", "漫剧", "投流"],
    href: "/console",
    ctaLabel: "进入控制台",
    accent: "from-cyan-500/20 via-teal-500/12 to-transparent",
  },
  {
    icon: BrainCircuit,
    title: "Agent × Skill 编排",
    description: "每个机器人都能挂载专属 Agent、Skill 与默认模型，形成稳定的生产套路。",
    metric: "3 层",
    metricLabel: "编排结构",
    tags: ["Agent", "Skill", "Model"],
    href: "/docs",
    ctaLabel: "查看文档",
    accent: "from-violet-500/18 via-fuchsia-500/12 to-transparent",
  },
  {
    icon: Radar,
    title: "品牌级交付体验",
    description: "首页、工作台、文档中心统一品牌语言，让机器人产品更像真正的 SaaS。",
    metric: "M3",
    metricLabel: "视觉语言",
    tags: ["Nextra", "Google", "Stitch"],
    href: "/docs/open-v1-external-frontend-integration",
    ctaLabel: "查看 Open API",
    accent: "from-emerald-500/18 via-cyan-500/12 to-transparent",
  },
];

const capabilityCards: HomepageCard[] = [
  {
    icon: Workflow,
    title: "工作流舰桥",
    description: "在一个页面里看到机器人编排、模型接线、知识/技能装配与实例执行状态。",
    metric: "All-in-One",
    metricLabel: "统一视图",
    tags: ["实例", "路由", "可视化"],
    href: "/console",
    ctaLabel: "打开工作台",
    accent: "from-sky-500/20 via-cyan-500/14 to-transparent",
  },
  {
    icon: ShieldCheck,
    title: "可控、可上线",
    description: "保留 runtime、image、实例维度的治理能力，同时把体验做得像消费级产品一样顺滑。",
    metric: "Runtime",
    metricLabel: "治理优先",
    tags: ["镜像", "实例", "重启"],
    href: "/docs",
    ctaLabel: "了解架构",
    accent: "from-amber-500/18 via-orange-500/12 to-transparent",
  },
  {
    icon: Orbit,
    title: "面向增长的首页",
    description: "不是冷冰冰的后台，而是能承接流量、解释能力、驱动转化的机器人门面。",
    metric: "Brand",
    metricLabel: "增长表达",
    tags: ["品牌", "转化", "内容"],
    href: "/",
    ctaLabel: "浏览首页",
    accent: "from-fuchsia-500/18 via-purple-500/12 to-transparent",
  },
];

const heroBadges = ["消息中心", "机器人矩阵", "品牌首页", "可运营工作台"];

function SidebarAgentItem({ agent, index }: { agent: SidebarAgent; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, delay: 0.08 * index, ease: [0.22, 1, 0.36, 1] }}
      className="group flex items-center gap-4 rounded-[24px] border border-transparent bg-white/55 px-4 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-md-primary/10 hover:bg-white/80 hover:shadow-[0_18px_40px_rgba(15,118,110,0.12)]"
    >
      <div className="relative">
        <div className={`h-12 w-12 rounded-full bg-gradient-to-br ${agent.accent} p-[1px] shadow-md-2`}>
          <div className="flex h-full w-full items-center justify-center rounded-full bg-white/90 text-md-on-surface">
            <Bot size={18} strokeWidth={2.2} />
          </div>
        </div>
        <span
          className={`absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${
            agent.online ? "bg-emerald-400" : "bg-slate-300"
          }`}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold text-md-on-surface">{agent.name}</div>
        <div className="truncate text-xs text-md-on-surface-variant">{agent.subtitle}</div>
      </div>
      <ChevronRight
        size={16}
        className="shrink-0 text-md-on-surface-variant/40 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-md-primary"
      />
    </motion.div>
  );
}

function HomepageCardView({ card, index }: { card: HomepageCard; index: number }) {
  const Icon = card.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.12 * index, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6, scale: 1.01 }}
      className="group relative overflow-hidden rounded-[32px] border border-white/70 bg-white/82 p-7 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${card.accent}`} />
      <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/30 blur-3xl" />
      <div className="relative flex h-full flex-col">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-white/85 shadow-[0_10px_24px_rgba(15,118,110,0.12)]">
            <Icon size={24} className="text-md-primary" strokeWidth={2.1} />
          </div>
          <div className="rounded-full border border-md-primary/12 bg-white/80 px-3 py-1.5 text-right shadow-sm">
            <div className="text-sm font-bold text-md-primary">{card.metric}</div>
            <div className="text-[11px] text-md-on-surface-variant">{card.metricLabel}</div>
          </div>
        </div>
        <h3 className="mb-2 text-xl font-bold tracking-tight text-md-on-surface">{card.title}</h3>
        <p className="mb-6 text-sm leading-7 text-md-on-surface-variant">{card.description}</p>
        <div className="mb-6 flex flex-wrap gap-2">
          {card.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-md-outline-variant/40 bg-white/72 px-3 py-1 text-xs font-semibold text-md-on-surface-variant"
            >
              {tag}
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
  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(167,243,208,0.36),transparent_32%),radial-gradient(circle_at_top_right,rgba(125,211,252,0.18),transparent_28%),linear-gradient(180deg,#f8fffe_0%,#f4fbfa_48%,#f8fffe_100%)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8rem] top-24 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="absolute right-[-6rem] top-12 h-72 w-72 rounded-full bg-teal-300/15 blur-3xl" />
        <div className="absolute bottom-[-4rem] left-1/3 h-56 w-56 rounded-full bg-violet-300/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(15,118,110,0.06)_1px,transparent_1px)] [background-size:22px_22px] opacity-30" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[1920px]">
        <aside className="hidden w-[292px] shrink-0 border-r border-md-outline-variant/25 bg-white/76 px-4 py-5 backdrop-blur-2xl xl:flex xl:flex-col">
          <div className="flex items-center justify-between gap-3 rounded-[28px] border border-white/70 bg-white/75 px-4 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <div className="inline-flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-md-surface-container text-md-primary shadow-sm">
                <MessageCircle size={18} />
              </span>
              <div>
                <div className="text-[15px] font-bold text-md-on-surface">消息</div>
                <div className="text-xs text-md-on-surface-variant">快速切换机器人会话</div>
              </div>
            </div>
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-md-primary text-md-on-primary shadow-md-2 transition-transform duration-300 hover:scale-105"
              aria-label="新建消息"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="mt-6 flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto pr-1 [mask-image:linear-gradient(to_bottom,black_85%,transparent_100%)]">
              <div className="space-y-3">
                {sidebarAgents.map((agent, index) => (
                  <SidebarAgentItem key={agent.name} agent={agent} index={index} />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-[28px] bg-gradient-to-r from-cyan-300 to-teal-300 p-1 shadow-[0_20px_45px_rgba(45,212,191,0.22)]">
              <div className="flex items-center justify-between rounded-[24px] bg-white/92 px-4 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-md-primary text-md-on-primary shadow-sm">
                    <Bot size={20} />
                  </span>
                  <div>
                    <div className="text-sm font-bold text-md-on-surface">机器人</div>
                    <div className="text-xs text-md-on-surface-variant">当前主模块</div>
                  </div>
                </div>
                <Crown size={18} className="text-md-primary" />
              </div>
            </div>

            <div className="rounded-[30px] border border-white/70 bg-white/78 p-4 shadow-[0_24px_50px_rgba(15,23,42,0.07)]">
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-cyan-400 to-teal-400 p-[2px] shadow-md-3">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-lg font-extrabold text-md-primary">
                    FC
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="truncate text-lg font-bold text-md-on-surface">Funclaw 用户</div>
                  <div className="truncate text-sm text-md-on-surface-variant">138****7014</div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-[22px] border border-md-outline-variant/30 bg-md-surface-container/75 px-4 py-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-md-primary">Workspace</div>
                  <div className="mt-1 text-sm font-semibold text-md-on-surface">funClaw Robot Hub</div>
                </div>
                <PanelLeftClose size={18} className="text-md-on-surface-variant" />
              </div>
            </div>
          </div>
        </aside>

        <div className="flex-1 px-4 py-4 sm:px-6 lg:px-8 lg:py-7 xl:px-10">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-[32px] border border-white/70 bg-white/72 p-5 shadow-[0_20px_55px_rgba(15,23,42,0.05)] backdrop-blur-xl sm:p-6"
          >
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-md-primary/12 bg-md-surface-container/80 px-3 py-1.5 text-xs font-bold tracking-[0.16em] uppercase text-md-primary">
                  <Stars size={12} />
                  FunClaw Robot Home
                </div>
                <h1 className="text-3xl font-black tracking-[-0.04em] text-md-on-surface sm:text-5xl">
                  FunClaw / 机器人
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-md-on-surface-variant sm:text-base">
                  面向 Agent 与 Skill 的品牌级机器人首页。把消息、机器人矩阵、控制台与 Open API
                  融成一个真正可承接流量、可驱动转化、可持续运营的产品门面。
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-3 rounded-full border border-cyan-200 bg-cyan-50/85 px-5 py-3 shadow-sm">
                  <WalletCards size={18} className="text-cyan-500" />
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-500">points</div>
                    <div className="text-lg font-extrabold text-md-on-surface">1000 point</div>
                  </div>
                </div>
                <Link
                  href="/console"
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-300 to-teal-300 px-6 py-3 text-sm font-bold text-slate-900 shadow-[0_16px_40px_rgba(45,212,191,0.28)] transition-transform duration-300 hover:scale-[1.02]"
                >
                  充值
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </motion.div>

          <div className="mt-6 grid gap-6">
            <motion.section
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
              className="relative overflow-hidden rounded-[40px] border border-white/70 bg-[linear-gradient(135deg,rgba(8,47,73,0.96)_0%,rgba(15,118,110,0.94)_46%,rgba(34,197,94,0.84)_100%)] p-7 text-white shadow-[0_28px_80px_rgba(15,118,110,0.25)] sm:p-9"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.22),transparent_24%),radial-gradient(circle_at_80%_15%,rgba(255,255,255,0.16),transparent_22%),radial-gradient(circle_at_60%_82%,rgba(255,255,255,0.10),transparent_26%)]" />
              <div className="absolute -right-14 top-10 h-56 w-56 rounded-full bg-white/12 blur-3xl" />
              <div className="absolute left-1/3 top-1/2 h-40 w-40 rounded-full bg-cyan-200/15 blur-3xl" />

              <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_420px] xl:items-center">
                <div>
                  <div className="flex flex-wrap gap-2">
                    {heroBadges.map((badge) => (
                      <span
                        key={badge}
                        className="rounded-full border border-white/18 bg-white/10 px-3 py-1 text-xs font-semibold text-white/88 backdrop-blur-sm"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                  <h2 className="mt-6 max-w-3xl text-3xl font-black leading-tight tracking-[-0.04em] sm:text-5xl">
                    让机器人首页
                    <br className="hidden sm:block" />
                    像一艘正在运行的数字舰桥
                  </h2>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-white/78 sm:text-base">
                    左侧是可切换的机器人会话矩阵，中间是品牌主视觉和精选能力卡片，
                    上方统一承载 points、充值、品牌标题与快速入口，让第一眼就感受到平台的专业度与未来感。
                  </p>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link
                      href="/console"
                      className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-[0_18px_40px_rgba(255,255,255,0.28)] transition-all duration-300 hover:gap-3"
                    >
                      进入机器人控制台
                      <ArrowRight size={16} />
                    </Link>
                    <Link
                      href="/docs"
                      className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors duration-300 hover:bg-white/16"
                    >
                      <BookOpen size={16} />
                      查看接入文档
                    </Link>
                  </div>

                  <div className="mt-8 grid gap-3 sm:grid-cols-3">
                    {[
                      { value: "7×24", label: "机器人在线编排" },
                      { value: "Agent+", label: "技能与模型组合" },
                      { value: "Open /v1", label: "前后端对外接入" },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-[24px] border border-white/12 bg-white/10 px-4 py-4 backdrop-blur-sm"
                      >
                        <div className="text-2xl font-black tracking-tight text-white">{stat.value}</div>
                        <div className="mt-1 text-xs font-medium text-white/70">{stat.label}</div>
                      </div>
                    ))}
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
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/70">Robot bridge</div>
                        <div className="mt-1 text-xl font-bold">编排态势大屏</div>
                      </div>
                      <div className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-100">
                        运行中
                      </div>
                    </div>

                    <div className="mt-5 space-y-3">
                      {[
                        { title: "短剧编剧官", status: "Story → Episode → Hook", color: "bg-cyan-300" },
                        { title: "漫剧工坊", status: "Storyboard → Panels → Shotlist", color: "bg-violet-300" },
                        { title: "投流封面师", status: "Angle → Title → Cover Copy", color: "bg-amber-300" },
                      ].map((item) => (
                        <div
                          key={item.title}
                          className="rounded-[24px] border border-white/10 bg-white/8 px-4 py-4"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <div className="text-sm font-bold text-white">{item.title}</div>
                              <div className="mt-1 text-xs text-white/68">{item.status}</div>
                            </div>
                            <span className={`h-3 w-3 rounded-full ${item.color} shadow-[0_0_14px_currentColor]`} />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 rounded-[28px] border border-white/10 bg-white/8 p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-white">控制信号总线</div>
                        <Compass size={16} className="text-cyan-100/75" />
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {["技能加载", "模型路由", "实例执行", "Open API"].map((tag) => (
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
                eyebrow="Robot Matrix"
                title="首页第一屏要把价值讲透，也把能力讲满"
                description="我们保留原型图的大结构：左侧消息/机器人矩阵，中间大主视觉 + 两排卡片；但在视觉上升级为更品牌化、更具科技感的机器人入口。"
              />
              <div className="grid gap-6 lg:grid-cols-3">
                {robotCards.map((card, index) => (
                  <HomepageCardView key={card.title} card={card} index={index} />
                ))}
              </div>
            </section>

            <section>
              <SectionHeader
                eyebrow="Capabilities"
                title="去掉社区与定时任务，只保留真正重要的机器人表达"
                description="首页聚焦两件事：让用户立刻理解 FunClaw 能做什么，以及让用户快速进入机器人控制台、文档和 API 能力。"
              />
              <div className="grid gap-6 lg:grid-cols-3">
                {capabilityCards.map((card, index) => (
                  <HomepageCardView key={card.title} card={card} index={index + robotCards.length} />
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
