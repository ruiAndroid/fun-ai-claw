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

type RechargeConsumeUrlApiData = {
  pay_url?: string | null;
  price?: string | number | null;
  order_code?: string | null;
  validEndTime?: string | null;
};

export type RechargeConsumeOrder = {
  payUrl: string;
  price: string;
  orderCode: string;
  validEndTime: string;
};

export type RechargeConsumeOrderStatus = {
  raw: Record<string, unknown>;
  statusText: string;
  statusDetail: string;
  isSuccess: boolean;
  isFailure: boolean;
  isPending: boolean;
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

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function findValueByKey(record: Record<string, unknown>, keys: string[]): unknown {
  const normalizedEntries = Object.entries(record).map(([key, value]) => [key.toLowerCase(), value] as const);

  for (const key of keys) {
    const direct = normalizedEntries.find(([candidate]) => candidate === key.toLowerCase());
    if (direct) {
      return direct[1];
    }
  }

  for (const value of Object.values(record)) {
    const nested = toRecord(value);
    if (Object.keys(nested).length === 0) {
      continue;
    }
    const nestedValue = findValueByKey(nested, keys);
    if (nestedValue !== undefined) {
      return nestedValue;
    }
  }

  return undefined;
}

function toNormalizedStatusToken(value: unknown) {
  const text = toTrimmedString(value);
  if (!text) {
    return "";
  }
  return text
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toUpperCase();
}

function parseBooleanLike(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }

  const text = toNormalizedStatusToken(value);
  if (!text) {
    return null;
  }

  if (["TRUE", "YES", "Y"].includes(text)) {
    return true;
  }
  if (["FALSE", "NO", "N"].includes(text)) {
    return false;
  }

  if (/^\d+$/.test(text)) {
    return Number(text) > 0;
  }

  return null;
}

function buildOrderStatusDetail(record: Record<string, unknown>) {
  return toTrimmedString(findValueByKey(record, [
    "statusDesc",
    "status_desc",
    "tradeStateDesc",
    "trade_state_desc",
    "payStatusDesc",
    "pay_status_desc",
    "message",
    "msg",
    "remark",
  ]));
}

export function interpretRechargeConsumeOrderStatus(data: unknown): RechargeConsumeOrderStatus {
  const raw = toRecord(data);
  const statusValue = findValueByKey(raw, [
    "tradeState",
    "trade_state",
    "tradeStatus",
    "trade_status",
    "payStatus",
    "pay_status",
    "orderStatus",
    "order_status",
    "status",
    "state",
    "consumeStatus",
    "consume_status",
  ]);

  const statusText = toNormalizedStatusToken(statusValue);
  const statusDetail = buildOrderStatusDetail(raw);
  const paidValue = findValueByKey(raw, [
    "isPaid",
    "paid",
    "paySuccess",
    "pay_success",
    "tradeSuccess",
    "trade_success",
    "completed",
    "finished",
  ]);
  const paid = parseBooleanLike(paidValue);

  const successTokens = new Set([
    "SUCCESS",
    "SUCCEEDED",
    "PAID",
    "PAY_SUCCESS",
    "PAYMENT_SUCCESS",
    "TRADE_SUCCESS",
    "COMPLETED",
    "COMPLETE",
    "FINISHED",
    "DONE",
  ]);
  const failureTokens = new Set([
    "FAILED",
    "FAIL",
    "CLOSED",
    "CANCELLED",
    "CANCELED",
    "EXPIRED",
    "TIMEOUT",
    "PAYERROR",
    "PAY_ERROR",
    "ERROR",
    "TRADE_CLOSED",
    "REVOKED",
    "ABORTED",
  ]);
  const pendingTokens = new Set([
    "PENDING",
    "WAITING",
    "WAIT_BUYER_PAY",
    "USERPAYING",
    "NOTPAY",
    "NOT_PAID",
    "UNPAID",
    "CREATED",
    "PROCESSING",
    "PAYING",
    "INIT",
    "INITIALIZED",
    "NEW",
    "UNKNOWN",
  ]);

  const isSuccess = paid === true || successTokens.has(statusText);
  const isFailure = !isSuccess && failureTokens.has(statusText);
  const isPending = !isSuccess && !isFailure && (pendingTokens.has(statusText) || !statusText);

  return {
    raw,
    statusText,
    statusDetail,
    isSuccess,
    isFailure,
    isPending,
  };
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

export async function getRechargeConsumeOrder(params: {
  commodityId: string;
  price: number | string;
  couponCode?: string;
}): Promise<RechargeConsumeOrder> {
  const query = new URLSearchParams();
  query.set("commodity_id", params.commodityId.trim());
  query.set("price", typeof params.price === "number" ? String(params.price) : params.price.trim());

  if (params.couponCode?.trim()) {
    query.set("coupon_code", params.couponCode.trim());
  }

  const envelope = await requestUserCenterAuthedEnvelope<RechargeConsumeUrlApiData>(`/pay/consume/url?${query.toString()}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  return {
    payUrl: toTrimmedString(envelope.data?.pay_url),
    price: toTrimmedString(envelope.data?.price),
    orderCode: toTrimmedString(envelope.data?.order_code),
    validEndTime: toTrimmedString(envelope.data?.validEndTime),
  };
}

export async function getRechargeConsumeOrderStatus(orderCode: string): Promise<RechargeConsumeOrderStatus> {
  const query = new URLSearchParams();
  query.set("orderCode", orderCode.trim());

  const envelope = await requestUserCenterAuthedEnvelope<Record<string, unknown>>(`/pay/consume/orderStatus?${query.toString()}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  return interpretRechargeConsumeOrderStatus(envelope.data);
}
