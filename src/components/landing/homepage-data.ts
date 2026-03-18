import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Bot,
  BrainCircuit,
  CalendarClock,
  House,
  Radar,
  WandSparkles,
  Workflow,
} from "lucide-react";

export type FeatureCard = {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
  accent: string;
  chips: string[];
};

export const primaryCards: FeatureCard[] = [
  {
    icon: Bot,
    title: "机器人控制台",
    description: "集中管理 Agent、Skill、实例、模型与运行状态，把机器人真正编排成产品能力。",
    href: "/console",
    ctaLabel: "进入控制台",
    accent: "from-orange-500/20 via-violet-500/12 to-transparent",
    chips: ["Agent", "Skill", "Instance"],
  },
  {
    icon: BookOpen,
    title: "文档中心",
    description: "把接入说明、部署手册、架构设计与最佳实践统一收拢到同一套品牌化入口中。",
    href: "/docs",
    ctaLabel: "查看文档",
    accent: "from-violet-500/18 via-orange-400/12 to-transparent",
    chips: ["Docs", "Architecture", "Guide"],
  },
  {
    icon: WandSparkles,
    title: "Open API",
    description: "通过统一接口接入业务系统，让外部前端、工作流与机器人运行时自然衔接。",
    href: "/docs/open-v1-external-frontend-integration",
    ctaLabel: "查看接入方式",
    accent: "from-orange-500/18 via-violet-500/12 to-transparent",
    chips: ["Open /v1", "REST", "WS"],
  },
];

export const secondaryCards: FeatureCard[] = [
  {
    icon: Workflow,
    title: "产品化机器人入口",
    description: "首页不只展示能力，更承担品牌说明、入口承接与转化导流的职责。",
    href: "/",
    ctaLabel: "浏览首页",
    accent: "from-orange-500/18 via-fuchsia-500/12 to-transparent",
    chips: ["Brand", "Landing", "Conversion"],
  },
  {
    icon: BrainCircuit,
    title: "Agent × Skill 编排体验",
    description: "让不同能力模块以稳定的产品化方式组合起来，而不是零散工具的简单堆叠。",
    href: "/console",
    ctaLabel: "查看编排",
    accent: "from-violet-500/18 via-fuchsia-500/12 to-transparent",
    chips: ["Composition", "Workflow", "Experience"],
  },
  {
    icon: Radar,
    title: "品牌级视觉表达",
    description: "延续 Nextra 与 Google Stitch 风格，把首页、控制台和文档做成统一品牌系统。",
    href: "/docs",
    ctaLabel: "查看设计语境",
    accent: "from-orange-500/18 via-violet-500/12 to-transparent",
    chips: ["Nextra", "Material 3", "Stitch"],
  },
];

export const messageShortcuts = [
  { label: "创建机器人", href: "/console" },
  { label: "查看文档", href: "/docs" },
  { label: "接入 Open API", href: "/docs/open-v1-external-frontend-integration" },
] as const;

export const heroHighlights = ["媒体行业", "一站部署", "作业流闭环", "全平台智能分发"] as const;

export const heroProofPoints = [
  {
    index: "01",
    title: "创作作业",
    description: "策划生成 · AI 短剧 · 物料辅助",
  },
  {
    index: "02",
    title: "分发增长",
    description: "多渠道运营 · 直播内容 · 营销承接",
  },
  {
    index: "03",
    title: "经营协同",
    description: "门店接待 · 数据回传 · 服务闭环",
  },
] as const;

export const heroStartSteps = [
  {
    step: "Step 1",
    title: "领取属于你的专属 AI 小龙虾",
    actionLabel: "一键领取",
    href: "/login",
  },
  {
    step: "Step 2",
    title: "给你的小龙虾取个名字吧",
    actionLabel: "开始",
    href: "/messages",
  },
  {
    step: "Step 3",
    title: "让我们现在开始创作之旅",
    actionLabel: "立即前往",
    href: "/console",
  },
] as const;

export const capabilityTags = ["消息入口", "机器人矩阵", "控制台", "文档中心", "Open API"] as const;

export type SidebarNavItem = {
  icon: LucideIcon;
  label: string;
  href: string;
  active?: boolean;
  badge?: string;
  summary?: string;
};

export type SidebarMessageItem = {
  id: string;
  title: string;
  href: string;
  robotName?: string;
};

export function buildSidebarNavItems({
  robotCount,
  robotSummary,
}: {
  robotCount?: number;
  robotSummary?: string;
} = {}): SidebarNavItem[] {
  return [
    {
      icon: Bot,
      label: "机器人",
      href: "/console",
      active: true,
      badge: typeof robotCount === "number" && robotCount > 0 ? `${robotCount}` : undefined,
      summary: robotSummary,
    },
    {
      icon: CalendarClock,
      label: "定时任务",
      href: "/tasks",
    },
    {
      icon: House,
      label: "社区",
      href: "/community",
    },
  ];
}

export const sidebarMessages: SidebarMessageItem[] = [];
