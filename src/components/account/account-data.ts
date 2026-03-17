import { CreditCard, FileText, Settings2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AccountTabKey = "settings" | "usage" | "works";

export type AccountNavItem = {
  key: AccountTabKey;
  label: string;
  icon: LucideIcon;
};

export type UsageFilterKey = "all" | "spent" | "added";

export type AccountIdentity = {
  phone: string | null;
  uid: string | null;
};

export type UsageEntry = {
  title: string;
  time: string;
  amount: number;
  type: Exclude<UsageFilterKey, "all">;
};

export type WorkItem = {
  title: string;
  subtitle: string;
  status: string;
};

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

export const accountIdentity: AccountIdentity = {
  phone: null,
  uid: null,
};

export const accountBalance: number | null = null;

export const usageEntries: UsageEntry[] = [];

export const workItems: WorkItem[] = [];
