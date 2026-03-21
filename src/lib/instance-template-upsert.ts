"use client";

import type {
  InstanceTemplate,
  InstanceTemplateAgentBinding,
  InstanceTemplateAgentConfig,
  InstanceTemplateChannelsConfig,
  InstanceTemplateMainAgentGuidance,
  InstanceTemplateRoutingConfig,
  InstanceTemplateUpsertRequest,
  ModelRouteConfigItem,
  QueryClassificationRuleConfigItem,
} from "@/types/contracts";

const DEFAULT_TEMPLATE_AGENT_MAX_TOOL_ITERATIONS = 10;
const DEFAULT_TEMPLATE_AGENT_MAX_HISTORY_MESSAGES = 100;
const DEFAULT_TEMPLATE_AGENT_TOOL_DISPATCHER = "auto";

function normalizeStringValues(values?: string[] | null): string[] {
  if (!values || values.length === 0) {
    return [];
  }
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function trimToNull(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function bodyToNull(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  return value.trim() ? value : null;
}

function normalizeRoute(route: ModelRouteConfigItem): ModelRouteConfigItem {
  return {
    hint: (route.hint ?? "").trim(),
    provider: (route.provider ?? "").trim(),
    model: (route.model ?? "").trim(),
  };
}

function normalizeRule(rule: QueryClassificationRuleConfigItem): QueryClassificationRuleConfigItem {
  return {
    hint: (rule.hint ?? "").trim(),
    keywords: normalizeStringValues(rule.keywords),
    patterns: normalizeStringValues(rule.patterns),
    priority: rule.priority ?? 100,
    minLength: rule.minLength ?? 0,
    maxLength: rule.maxLength ?? 0,
  };
}

function normalizeTemplateAgentBinding(binding: InstanceTemplateAgentBinding) {
  return {
    agentKey: binding.agentKey.trim(),
    provider: trimToNull(binding.provider),
    model: trimToNull(binding.model),
    temperature: typeof binding.temperature === "number" ? binding.temperature : null,
    agentic: binding.agentic ?? null,
    systemPrompt: bodyToNull(binding.systemPrompt),
    allowedTools: normalizeStringValues(binding.allowedTools),
    allowedSkills: normalizeStringValues(binding.allowedSkills),
  };
}

function resolveTemplateAgentBindings(draft: InstanceTemplate): InstanceTemplateAgentBinding[] {
  const explicitBindings = (draft.agentBindings ?? [])
    .map((binding) => ({
      agentKey: binding.agentKey?.trim() ?? "",
      provider: binding.provider ?? null,
      model: binding.model ?? null,
      temperature: binding.temperature ?? null,
      agentic: binding.agentic ?? null,
      systemPrompt: binding.systemPrompt ?? null,
      allowedTools: normalizeStringValues(binding.allowedTools),
      allowedSkills: normalizeStringValues(binding.allowedSkills),
    }))
    .filter((binding) => binding.agentKey);
  if (explicitBindings.length > 0) {
    return explicitBindings;
  }

  const explicitAgentKeys = normalizeStringValues(draft.agentKeys);
  if (explicitAgentKeys.length > 0) {
    return explicitAgentKeys.map((agentKey) => ({
      agentKey,
      provider: null,
      model: null,
      temperature: null,
      agentic: null,
      systemPrompt: null,
      allowedTools: [],
      allowedSkills: [],
    }));
  }

  const legacyMainAgentKey = draft.mainAgent?.agentKey?.trim();
  if (!legacyMainAgentKey) {
    return [];
  }

  return [{
    agentKey: legacyMainAgentKey,
    provider: draft.mainAgent.provider ?? null,
    model: draft.mainAgent.model ?? null,
    temperature: draft.mainAgent.temperature ?? null,
    agentic: draft.mainAgent.agentic ?? null,
    systemPrompt: draft.mainAgent.systemPrompt ?? null,
    allowedTools: normalizeStringValues(draft.mainAgent.allowedTools),
    allowedSkills: normalizeStringValues(draft.mainAgent.allowedSkills),
  }];
}

function normalizeTemplateAgentBindings(draft: InstanceTemplate) {
  return resolveTemplateAgentBindings(draft)
    .map((binding) => normalizeTemplateAgentBinding(binding))
    .filter((binding) => binding.agentKey);
}

function normalizeChannelsConfig(draft: InstanceTemplateChannelsConfig | null | undefined) {
  if (!draft) {
    return null;
  }

  const normalized = {
    cliEnabled: draft.cliEnabled,
    messageTimeoutSecs: draft.messageTimeoutSecs,
    dingtalkEnabled: draft.dingtalkEnabled,
    dingtalkClientId: trimToNull(draft.dingtalkClientId),
    dingtalkClientSecret: trimToNull(draft.dingtalkClientSecret),
    dingtalkAllowedUsers: normalizeStringValues(draft.dingtalkAllowedUsers),
    qqEnabled: draft.qqEnabled,
    qqAppId: trimToNull(draft.qqAppId),
    qqAppSecret: trimToNull(draft.qqAppSecret),
    qqAllowedUsers: normalizeStringValues(draft.qqAllowedUsers),
  };

  return (
    normalized.cliEnabled
    || normalized.dingtalkEnabled
    || normalized.qqEnabled
    || normalized.dingtalkAllowedUsers.length > 0
    || normalized.qqAllowedUsers.length > 0
    || normalized.dingtalkClientId !== null
    || normalized.dingtalkClientSecret !== null
    || normalized.qqAppId !== null
    || normalized.qqAppSecret !== null
    || normalized.messageTimeoutSecs !== 300
  ) ? normalized : null;
}

function normalizeRoutingConfig(draft: InstanceTemplateRoutingConfig | null | undefined) {
  if (!draft) {
    return null;
  }

  const normalized = {
    queryClassificationEnabled: draft.queryClassificationEnabled,
    modelRoutes: (draft.modelRoutes ?? [])
      .map(normalizeRoute)
      .filter((item) => item.hint || item.provider || item.model),
    queryClassificationRules: (draft.queryClassificationRules ?? [])
      .map(normalizeRule)
      .filter((item) => item.hint || item.keywords.length > 0 || item.patterns.length > 0),
  };

  return (
    normalized.modelRoutes.length > 0
    || normalized.queryClassificationEnabled
    || normalized.queryClassificationRules.length > 0
  ) ? normalized : null;
}

function normalizeMainAgentGuidance(draft: InstanceTemplateMainAgentGuidance | null | undefined) {
  if (!draft) {
    return null;
  }

  const normalized = {
    prompt: bodyToNull(draft.prompt),
    enabled: draft.enabled ?? null,
  };

  return (normalized.prompt !== null || normalized.enabled !== null) ? normalized : null;
}

function normalizeAgentConfig(draft: InstanceTemplateAgentConfig | null | undefined) {
  if (!draft) {
    return null;
  }

  const maxToolIterations = typeof draft.maxToolIterations === "number"
    ? draft.maxToolIterations
    : DEFAULT_TEMPLATE_AGENT_MAX_TOOL_ITERATIONS;
  const compactContext = typeof draft.compactContext === "boolean" ? draft.compactContext : false;
  const maxHistoryMessages = typeof draft.maxHistoryMessages === "number"
    ? draft.maxHistoryMessages
    : DEFAULT_TEMPLATE_AGENT_MAX_HISTORY_MESSAGES;
  const parallelTools = typeof draft.parallelTools === "boolean" ? draft.parallelTools : false;
  const toolDispatcher = trimToNull(draft.toolDispatcher) ?? DEFAULT_TEMPLATE_AGENT_TOOL_DISPATCHER;

  return {
    maxToolIterations,
    compactContext,
    maxHistoryMessages,
    parallelTools,
    toolDispatcher,
  };
}

export function buildInstanceTemplateUpsertRequest(draft: InstanceTemplate): InstanceTemplateUpsertRequest {
  const agentBindings = normalizeTemplateAgentBindings(draft);

  const defaultModelConfig = draft.defaultModelConfig
    ? (() => {
      const normalized = {
        apiKey: trimToNull(draft.defaultModelConfig.apiKey),
        defaultProvider: trimToNull(draft.defaultModelConfig.defaultProvider),
        defaultModel: trimToNull(draft.defaultModelConfig.defaultModel),
        defaultTemperature: typeof draft.defaultModelConfig.defaultTemperature === "number"
          ? draft.defaultModelConfig.defaultTemperature
          : null,
      };
      return (
        normalized.apiKey !== null
        || normalized.defaultProvider !== null
        || normalized.defaultModel !== null
        || normalized.defaultTemperature !== null
      ) ? normalized : null;
    })()
    : null;

  return {
    templateKey: draft.templateKey,
    displayName: draft.displayName,
    description: trimToNull(draft.description),
    summary: trimToNull(draft.description),
    enabled: draft.enabled,
    imagePresetId: draft.imagePresetId,
    desiredState: draft.desiredState,
    mainAgent: {
      agentKey: "",
      provider: null,
      model: null,
      temperature: null,
      agentic: null,
      systemPrompt: null,
      allowedTools: [],
      allowedSkills: [],
    },
    agentBindings,
    agentKeys: agentBindings.map((binding) => binding.agentKey),
    skillKeys: normalizeStringValues(draft.skillKeys),
    lockedScopes: [],
    tags: normalizeStringValues(draft.tags),
    runtimeConfigToml: null,
    channelsConfig: normalizeChannelsConfig(draft.channelsConfig),
    defaultModelConfig,
    routingConfig: normalizeRoutingConfig(draft.routingConfig),
    agentConfig: normalizeAgentConfig(draft.agentConfig),
    mainAgentGuidance: normalizeMainAgentGuidance(draft.mainAgentGuidance),
    updatedBy: "ui-template-center",
  };
}
