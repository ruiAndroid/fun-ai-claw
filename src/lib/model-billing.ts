import type { ModelBillingConfig } from "@/types/contracts";

const TOKENS_PER_MILLION = 1_000_000;
const XIAMI_PER_CNY = 100;

export type ModelBillingEstimate = {
  config: ModelBillingConfig;
  estimatedCny: number;
  estimatedXiami: number;
  inputPricePer1m: number;
  outputPricePer1m: number;
  matchedBy: "provider_model" | "model_only";
};

function normalizeText(value?: string | null) {
  return value?.trim().toLowerCase() || "";
}

function normalizeProvider(value?: string | null) {
  return normalizeText(value).replace(/\/+$/, "");
}

function normalizeModel(value?: string | null) {
  return normalizeText(value);
}

export function resolveModelBillingConfig(
  configs: ModelBillingConfig[],
  provider?: string | null,
  model?: string | null,
): { config: ModelBillingConfig; matchedBy: ModelBillingEstimate["matchedBy"] } | undefined {
  const enabledConfigs = configs.filter((item) => item.enabled);
  const normalizedProvider = normalizeProvider(provider);
  const normalizedModel = normalizeModel(model);

  if (!normalizedModel) {
    return undefined;
  }

  const exactMatch = enabledConfigs.find((item) => (
    normalizeProvider(item.provider) === normalizedProvider
    && normalizeModel(item.model) === normalizedModel
  ));
  if (exactMatch) {
    return { config: exactMatch, matchedBy: "provider_model" };
  }

  const modelOnlyMatches = enabledConfigs.filter((item) => normalizeModel(item.model) === normalizedModel);
  if (modelOnlyMatches.length === 1) {
    return { config: modelOnlyMatches[0], matchedBy: "model_only" };
  }

  return undefined;
}

export function estimateModelBilling(
  configs: ModelBillingConfig[],
  options: {
    provider?: string | null;
    model?: string | null;
    inputTokens?: number | null;
    outputTokens?: number | null;
  },
): ModelBillingEstimate | undefined {
  const inputTokens = typeof options.inputTokens === "number" && Number.isFinite(options.inputTokens) && options.inputTokens > 0
    ? options.inputTokens
    : 0;
  const outputTokens = typeof options.outputTokens === "number" && Number.isFinite(options.outputTokens) && options.outputTokens > 0
    ? options.outputTokens
    : 0;

  if (inputTokens <= 0 && outputTokens <= 0) {
    return undefined;
  }

  const resolved = resolveModelBillingConfig(configs, options.provider, options.model);
  if (!resolved) {
    return undefined;
  }

  const inputPricePer1m = Number(resolved.config.inputPricePer1m);
  const outputPricePer1m = Number(resolved.config.outputPricePer1m);
  const groupMultiplier = Number(resolved.config.groupMultiplier) || 1;
  const estimatedCny = (
    (inputTokens / TOKENS_PER_MILLION) * inputPricePer1m
    + (outputTokens / TOKENS_PER_MILLION) * outputPricePer1m
  ) * groupMultiplier;

  return {
    config: resolved.config,
    estimatedCny,
    estimatedXiami: estimatedCny * XIAMI_PER_CNY,
    inputPricePer1m,
    outputPricePer1m,
    matchedBy: resolved.matchedBy,
  };
}

export function formatEstimatedXiami(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return undefined;
  }
  if (value >= 100) {
    return value.toFixed(0);
  }
  if (value >= 1) {
    return value.toFixed(2);
  }
  if (value >= 0.1) {
    return value.toFixed(3);
  }
  return value.toFixed(4);
}

export function formatEstimatedCny(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return undefined;
  }
  return value.toFixed(6);
}
