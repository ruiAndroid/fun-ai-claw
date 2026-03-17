import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Bot,
  BrainCircuit,
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
    accent: "from-cyan-500/20 via-teal-500/12 to-transparent",
    chips: ["Agent", "Skill", "Instance"],
  },
  {
    icon: BookOpen,
    title: "文档中心",
    description: "把接入说明、部署手册、架构设计与最佳实践统一收拢到同一套品牌化入口中。",
    href: "/docs",
    ctaLabel: "查看文档",
    accent: "from-violet-500/18 via-fuchsia-500/12 to-transparent",
    chips: ["Docs", "Architecture", "Guide"],
  },
  {
    icon: WandSparkles,
    title: "Open API",
    description: "通过统一接口接入业务系统，让外部前端、工作流与机器人运行时自然衔接。",
    href: "/docs/open-v1-external-frontend-integration",
    ctaLabel: "查看接入方式",
    accent: "from-emerald-500/18 via-cyan-500/12 to-transparent",
    chips: ["Open /v1", "REST", "WS"],
  },
];

export const secondaryCards: FeatureCard[] = [
  {
    icon: Workflow,
    title: "产品化机器人入口",
    description: "首页不仅展示能力，更承担品牌说明、入口承接与转化导流的职责。",
    href: "/",
    ctaLabel: "浏览首页",
    accent: "from-sky-500/18 via-cyan-500/12 to-transparent",
    chips: ["Brand", "Landing", "Conversion"],
  },
  {
    icon: BrainCircuit,
    title: "Agent × Skill 编排体验",
    description: "让不同能力模块以稳定的产品化方式组合起来，而不是零散工具的简单堆叠。",
    href: "/console",
    ctaLabel: "查看编排",
    accent: "from-fuchsia-500/18 via-purple-500/12 to-transparent",
    chips: ["Composition", "Workflow", "Experience"],
  },
  {
    icon: Radar,
    title: "品牌级视觉表达",
    description: "延续 Nextra 与 Google Stitch 风格，把首页、控制台和文档做成统一品牌系统。",
    href: "/docs",
    ctaLabel: "查看设计语境",
    accent: "from-amber-500/18 via-orange-500/12 to-transparent",
    chips: ["Nextra", "Material 3", "Stitch"],
  },
];

export const messageShortcuts = [
  { label: "创建机器人", href: "/console" },
  { label: "查看文档", href: "/docs" },
  { label: "接入 Open API", href: "/docs/open-v1-external-frontend-integration" },
] as const;

export const heroHighlights = ["机器人入口", "控制台编排", "文档与 API", "品牌化首页"] as const;

export const capabilityMap = [
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
] as const;

export const capabilityTags = ["消息入口", "机器人矩阵", "控制台", "文档中心", "Open API"] as const;
