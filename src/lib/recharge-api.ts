import { requestUserCenterAuthedEnvelope } from "@/lib/user-center-api";

export type RechargeCommodityCategory = "vip" | "package" | "material";

type RechargeCommodityApiItem = {
  id?: number | string | null;
  created?: string | null;
  updated?: string | null;
  type?: string | null;
  name?: string | null;
  displayName?: string | null;
  aword?: string | null;
  description?: string | null;
  commodityTag?: string | null;
  img?: string | null;
  price?: number | string | null;
  realPrice?: number | string | null;
  vipDiscount?: number | string | null;
  validTime?: string | null;
  invalidTime?: string | null;
  validAmount?: number | string | null;
  coinAmount?: number | string | null;
  defaultCoinAmount?: number | string | null;
  giveCoinAmount?: number | string | null;
  status?: string | null;
  focusStatus?: number | string | null;
  isHide?: boolean | null;
  shelveTime?: string | null;
  unshelveTime?: string | null;
  priority?: number | string | null;
  createdBy?: number | string | null;
};

type RechargeCommodityCatalogApiData = {
  vips?: RechargeCommodityApiItem[] | null;
  packages?: RechargeCommodityApiItem[] | null;
  materials?: RechargeCommodityApiItem[] | null;
};

export type RechargeCommodity = {
  id: string;
  created: string;
  updated: string;
  type: string;
  name: string;
  displayName: string;
  aword: string;
  description: string;
  commodityTag: string;
  img: string;
  price: number;
  realPrice: number;
  vipDiscount: number;
  validTime: string;
  invalidTime: string;
  validAmount: number;
  coinAmount: number;
  defaultCoinAmount: number;
  giveCoinAmount: number;
  status: string;
  focusStatus: number;
  isHide: boolean;
  shelveTime: string;
  unshelveTime: string;
  priority: number;
  createdBy: string;
};

export type RechargeCommodityCatalog = {
  vips: RechargeCommodity[];
  packages: RechargeCommodity[];
  materials: RechargeCommodity[];
};

function toTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) {
      return 0;
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function normalizeCommodity(item: RechargeCommodityApiItem): RechargeCommodity {
  return {
    id: toTrimmedString(item.id),
    created: toTrimmedString(item.created),
    updated: toTrimmedString(item.updated),
    type: toTrimmedString(item.type),
    name: toTrimmedString(item.name),
    displayName: toTrimmedString(item.displayName),
    aword: toTrimmedString(item.aword),
    description: toTrimmedString(item.description),
    commodityTag: toTrimmedString(item.commodityTag),
    img: toTrimmedString(item.img),
    price: toNumber(item.price),
    realPrice: toNumber(item.realPrice),
    vipDiscount: toNumber(item.vipDiscount),
    validTime: toTrimmedString(item.validTime),
    invalidTime: toTrimmedString(item.invalidTime),
    validAmount: toNumber(item.validAmount),
    coinAmount: toNumber(item.coinAmount),
    defaultCoinAmount: toNumber(item.defaultCoinAmount),
    giveCoinAmount: toNumber(item.giveCoinAmount),
    status: toTrimmedString(item.status),
    focusStatus: toNumber(item.focusStatus),
    isHide: Boolean(item.isHide),
    shelveTime: toTrimmedString(item.shelveTime),
    unshelveTime: toTrimmedString(item.unshelveTime),
    priority: toNumber(item.priority),
    createdBy: toTrimmedString(item.createdBy),
  };
}

function normalizeCommodityList(items?: RechargeCommodityApiItem[] | null) {
  if (!Array.isArray(items)) {
    return [];
  }
  return items.map((item) => normalizeCommodity(item ?? {}));
}

export async function listRechargeCommodities(): Promise<RechargeCommodityCatalog> {
  const envelope = await requestUserCenterAuthedEnvelope<RechargeCommodityCatalogApiData>("/pay/commodity/list", {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  return {
    vips: normalizeCommodityList(envelope.data?.vips),
    packages: normalizeCommodityList(envelope.data?.packages),
    materials: normalizeCommodityList(envelope.data?.materials),
  };
}
