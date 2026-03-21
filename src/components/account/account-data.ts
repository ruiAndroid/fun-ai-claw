import { CreditCard, Package, Settings2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AccountTabKey = "settings" | "assets" | "usage";

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
  { key: "settings", label: "\u7528\u6237\u8d44\u6599", icon: Settings2 },
  { key: "usage", label: "\u6211\u7684\u94b1\u5305", icon: CreditCard },
  { key: "assets", label: "\u6211\u7684\u8d44\u4ea7", icon: Package },
];

export const usageFilters: Array<{ key: UsageFilterKey; label: string }> = [
  { key: "all", label: "\u5168\u90e8" },
  { key: "spent", label: "\u652f\u51fa" },
  { key: "added", label: "\u6536\u5165" },
];

export const accountBalance: number | null = null;
export const usageEntries: UsageEntry[] = [];
export const workItems: WorkItem[] = [];
