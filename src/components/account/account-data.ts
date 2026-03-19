import { CreditCard, Settings2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AccountTabKey = "settings" | "usage";

export type AccountNavItem = {
  key: AccountTabKey;
  label: string;
  icon: LucideIcon;
};

export type UsageFilterKey = "all" | "spent" | "added";

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
  { key: "settings", label: "用户资料", icon: Settings2 },
  { key: "usage", label: "积分中心", icon: CreditCard },
];

export const usageFilters: Array<{ key: UsageFilterKey; label: string }> = [
  { key: "all", label: "全部" },
  { key: "spent", label: "支出" },
  { key: "added", label: "收入" },
];

export const accountBalance: number | null = null;
export const usageEntries: UsageEntry[] = [];
export const workItems: WorkItem[] = [];
