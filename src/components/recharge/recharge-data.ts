export type RechargeTabKey = "boost" | "membership";

export type RechargePlan = {
  id: string;
  title: string;
  price: number;
  xiami: number;
  description: string;
  featured?: boolean;
};

export const rechargeTabs: Array<{
  key: RechargeTabKey;
  label: string;
  disabled?: boolean;
  badge?: string;
}> = [
  {
    key: "boost",
    label: "加油包充值",
  },
  {
    key: "membership",
    label: "会员服务",
    disabled: true,
    badge: "敬请期待",
  },
];

export const rechargePlans: RechargePlan[] = [
  {
    id: "fresh",
    title: "尝鲜包",
    price: 12,
    xiami: 100,
    description: "适合轻度使用和临时补充，低门槛购买，快速满足基础虾米消耗需求。",
  },
  {
    id: "standard",
    title: "标准包",
    price: 120,
    xiami: 1000,
    description: "适合稳定创作与日常对话消耗，兼顾成本与使用频率，是最常用的虾米充值档位。",
    featured: true,
  },
  {
    id: "advanced",
    title: "进阶包",
    price: 600,
    xiami: 5000,
    description: "适合高频对话、批量生成与多人协作场景，能显著降低持续使用成本。",
  },
  {
    id: "pro",
    title: "专业包",
    price: 3600,
    xiami: 30000,
    description: "适合团队级或商业化使用，满足长期稳定消耗与更高吞吐需求。",
  },
];
