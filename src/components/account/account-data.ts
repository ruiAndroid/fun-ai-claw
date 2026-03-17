import { CreditCard, FileText, Settings2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AccountTabKey = "settings" | "usage" | "works";

export type AccountNavItem = {
  key: AccountTabKey;
  label: string;
  icon: LucideIcon;
};

export type UsageFilterKey = "all" | "spent" | "added";

export const accountNavItems: AccountNavItem[] = [
  {
    key: "settings",
    label: "基础设置",
    icon: Settings2,
  },
  {
    key: "usage",
    label: "用量统计",
    icon: CreditCard,
  },
  {
    key: "works",
    label: "我的作品",
    icon: FileText,
  },
];

export const usageFilters: Array<{ key: UsageFilterKey; label: string }> = [
  { key: "all", label: "全部" },
  { key: "spent", label: "已消耗" },
  { key: "added", label: "新增" },
];

export const usageEntries = [
  {
    title: "【机器人名称】消耗梦想值",
    time: "2026-03-16 15:19:48",
    amount: -28,
    type: "spent" as const,
  },
  {
    title: "新人登录",
    time: "2026-03-16 15:19:48",
    amount: 2000,
    type: "added" as const,
  },
  {
    title: "充值",
    time: "2026-03-16 15:19:48",
    amount: 500,
    type: "added" as const,
  },
  {
    title: "代金券兑换",
    time: "2026-03-16 15:19:48",
    amount: 500,
    type: "added" as const,
  },
];

export const workItems = [
  {
    title: "重生律师逆袭记",
    subtitle: "短剧 · 8 集 · 最近更新于 2026-03-16",
    status: "进行中",
  },
  {
    title: "漫剧角色世界观设定",
    subtitle: "漫剧 · 角色配置稿 · 最近更新于 2026-03-15",
    status: "草稿",
  },
  {
    title: "爆款短视频脚本合集",
    subtitle: "脚本库 · 12 条 · 最近更新于 2026-03-14",
    status: "已发布",
  },
];
