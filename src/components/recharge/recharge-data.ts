import type { RechargeCommodity, RechargeCommodityCategory } from "@/lib/recharge-api";

export type RechargeTabKey = "boost" | "membership";

export type RechargePlan = {
  id: string;
  commodityId: string;
  title: string;
  price: number;
  originalPrice?: number | null;
  benefitValue: string;
  benefitLabel: string;
  description: string;
  featured?: boolean;
  badge?: string | null;
  meta?: string | null;
  category: RechargeCommodityCategory;
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
  },
];

const amountFormatter = new Intl.NumberFormat("zh-CN", {
  maximumFractionDigits: 2,
});

function formatAmount(value: number) {
  return amountFormatter.format(Number.isFinite(value) ? value : 0);
}

function pickFirstText(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function hasCommodityTag(item: RechargeCommodity) {
  return Boolean(pickFirstText(item.commodityTag));
}

function buildCommodityTitle(item: RechargeCommodity, category: RechargeCommodityCategory) {
  const resolved = pickFirstText(item.displayName, item.name);
  if (resolved) {
    return resolved;
  }

  if (category === "vip") {
    return "会员服务";
  }
  if (category === "material") {
    return "素材商品";
  }
  return "加油包";
}

function buildCommodityBenefit(item: RechargeCommodity, category: RechargeCommodityCategory) {
  const totalCoins = item.coinAmount > 0 ? item.coinAmount : item.defaultCoinAmount + item.giveCoinAmount;
  if (totalCoins > 0) {
    return {
      benefitValue: formatAmount(totalCoins),
      benefitLabel: "虾米",
    };
  }

  if (item.validAmount > 0) {
    return {
      benefitValue: formatAmount(item.validAmount),
      benefitLabel: category === "vip" ? "权益额度" : "额度",
    };
  }

  return {
    benefitValue: "--",
    benefitLabel: category === "vip" ? "会员权益" : "商品权益",
  };
}

function buildCommodityDescription(item: RechargeCommodity, category: RechargeCommodityCategory) {
  const description = pickFirstText(item.description, item.aword);
  if (description) {
    return description;
  }

  if (category === "vip") {
    return "开通后即可享受对应的会员服务与权益。";
  }
  if (category === "material") {
    return "购买后可获得对应的素材商品权益。";
  }
  return "充值成功后即可获得对应额度。";
}

function buildCommodityMeta(item: RechargeCommodity) {
  const parts: string[] = [];

  if (item.giveCoinAmount > 0) {
    parts.push(`赠送 ${formatAmount(item.giveCoinAmount)} 虾米`);
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

export function isRechargeCommodityVisible(item: RechargeCommodity) {
  return !item.isHide;
}

export function mapCommodityToRechargePlan(
  item: RechargeCommodity,
  category: RechargeCommodityCategory,
): RechargePlan {
  const resolvedPrice = item.realPrice > 0 ? item.realPrice : item.price;
  const resolvedBadge = pickFirstText(item.commodityTag) || (item.focusStatus > 0 ? "推荐" : "");
  const prioritized = hasCommodityTag(item) || item.focusStatus > 0;
  const benefit = buildCommodityBenefit(item, category);

  return {
    id: `${category}-${item.id}`,
    commodityId: item.id,
    title: buildCommodityTitle(item, category),
    price: resolvedPrice,
    originalPrice: item.price > resolvedPrice ? item.price : null,
    benefitValue: benefit.benefitValue,
    benefitLabel: benefit.benefitLabel,
    description: buildCommodityDescription(item, category),
    featured: prioritized,
    badge: resolvedBadge || null,
    meta: buildCommodityMeta(item),
    category,
  };
}
