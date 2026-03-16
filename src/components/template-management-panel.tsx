"use client";

import { buildAgentToolOptions, emptyAgentToolCatalog } from "@/lib/agent-tool-catalog";
import {
  createInstanceTemplate,
  deleteInstanceTemplate,
  getAgentToolCatalog,
  listAgentBaselines,
  listSkillBaselines,
  upsertInstanceTemplate,
} from "@/lib/control-api";
import type {
  AgentBaselineSummary,
  AgentToolCatalog,
  ImagePreset,
  InstanceTemplate,
  InstanceTemplateChannelsConfig,
  InstanceTemplateDefaultModelConfig,
  InstanceTemplateMainAgentGuidance,
  InstanceTemplateRoutingConfig,
  InstanceTemplateUpsertRequest,
  ModelRouteConfigItem,
  QueryClassificationRuleConfigItem,
  SkillBaselineSummary,
} from "@/types/contracts";
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import { Layers, PlayCircle, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const { Paragraph, Text } = Typography;

const DEFAULT_RULE_PRIORITY = 100;
const DEFAULT_RULE_MIN_LENGTH = 0;
const DEFAULT_RULE_MAX_LENGTH = 0;

type CreateTemplateForm = {
  templateKey: string;
  displayName: string;
};

function cloneTemplate(template: InstanceTemplate): InstanceTemplate {
  return JSON.parse(JSON.stringify(template)) as InstanceTemplate;
}

function normalizeStringValues(values?: string[] | null): string[] {
  if (!values || values.length === 0) {
    return [];
  }
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalizeOptionalText(value?: string | null): string {
  return value ?? "";
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

function formatTimestamp(value?: string | null): string {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function buildEmptyChannelsConfig(): InstanceTemplateChannelsConfig {
  return {
    cliEnabled: true,
    messageTimeoutSecs: 300,
    dingtalkEnabled: false,
    dingtalkClientId: "",
    dingtalkClientSecret: "",
    dingtalkAllowedUsers: [],
    qqEnabled: false,
    qqAppId: "",
    qqAppSecret: "",
    qqAllowedUsers: [],
  };
}

function buildEmptyDefaultModelConfig(): InstanceTemplateDefaultModelConfig {
  return {
    apiKey: "",
    defaultProvider: "",
    defaultModel: "",
    defaultTemperature: 0.7,
  };
}

function createEmptyRoute(): ModelRouteConfigItem {
  return {
    hint: "",
    provider: "",
    model: "",
  };
}

function createEmptyRule(): QueryClassificationRuleConfigItem {
  return {
    hint: "",
    keywords: [],
    patterns: [],
    priority: DEFAULT_RULE_PRIORITY,
    minLength: DEFAULT_RULE_MIN_LENGTH,
    maxLength: DEFAULT_RULE_MAX_LENGTH,
  };
}

function buildEmptyRoutingConfig(): InstanceTemplateRoutingConfig {
  return {
    queryClassificationEnabled: false,
    modelRoutes: [],
    queryClassificationRules: [],
  };
}

function buildEmptyGuidance(): InstanceTemplateMainAgentGuidance {
  return {
    enabled: true,
    prompt: "",
  };
}

function buildEmptyTemplate(templateKey = "", displayName = ""): InstanceTemplate {
  const now = new Date().toISOString();
  return {
    templateKey,
    displayName,
    description: "",
    summary: "",
    enabled: true,
    imagePresetId: "zeroclaw-shell",
    desiredState: "RUNNING",
    mainAgent: {
      agentKey: "",
      provider: "",
      model: "",
      temperature: null,
      agentic: null,
      systemPrompt: "",
      allowedTools: [],
      allowedSkills: [],
    },
    skillKeys: [],
    lockedScopes: [],
    tags: [],
    runtimeConfigToml: "",
    channelsConfig: null,
    defaultModelConfig: null,
    routingConfig: null,
    mainAgentGuidance: null,
    updatedBy: "ui-template-center",
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeRoute(route: ModelRouteConfigItem): ModelRouteConfigItem {
  return {
    hint: normalizeOptionalText(route.hint).trim(),
    provider: normalizeOptionalText(route.provider).trim(),
    model: normalizeOptionalText(route.model).trim(),
  };
}

function normalizeRule(rule: QueryClassificationRuleConfigItem): QueryClassificationRuleConfigItem {
  return {
    hint: normalizeOptionalText(rule.hint).trim(),
    keywords: normalizeStringValues(rule.keywords),
    patterns: normalizeStringValues(rule.patterns),
    priority: rule.priority ?? DEFAULT_RULE_PRIORITY,
    minLength: rule.minLength ?? DEFAULT_RULE_MIN_LENGTH,
    maxLength: rule.maxLength ?? DEFAULT_RULE_MAX_LENGTH,
  };
}

function normalizeChannelsConfigForCompare(value?: InstanceTemplateChannelsConfig | null) {
  if (!value) {
    return null;
  }
  return {
    cliEnabled: value.cliEnabled,
    messageTimeoutSecs: value.messageTimeoutSecs,
    dingtalkEnabled: value.dingtalkEnabled,
    dingtalkClientId: normalizeOptionalText(value.dingtalkClientId).trim(),
    dingtalkClientSecret: normalizeOptionalText(value.dingtalkClientSecret).trim(),
    dingtalkAllowedUsers: normalizeStringValues(value.dingtalkAllowedUsers),
    qqEnabled: value.qqEnabled,
    qqAppId: normalizeOptionalText(value.qqAppId).trim(),
    qqAppSecret: normalizeOptionalText(value.qqAppSecret).trim(),
    qqAllowedUsers: normalizeStringValues(value.qqAllowedUsers),
  };
}

function normalizeDefaultModelConfigForCompare(value?: InstanceTemplateDefaultModelConfig | null) {
  if (!value) {
    return null;
  }
  return {
    apiKey: normalizeOptionalText(value.apiKey),
    defaultProvider: normalizeOptionalText(value.defaultProvider).trim(),
    defaultModel: normalizeOptionalText(value.defaultModel).trim(),
    defaultTemperature: typeof value.defaultTemperature === "number" ? value.defaultTemperature : null,
  };
}

function normalizeRoutingConfigForCompare(value?: InstanceTemplateRoutingConfig | null) {
  if (!value) {
    return null;
  }
  return {
    queryClassificationEnabled: value.queryClassificationEnabled,
    modelRoutes: (value.modelRoutes ?? []).map(normalizeRoute),
    queryClassificationRules: (value.queryClassificationRules ?? []).map(normalizeRule),
  };
}

function normalizeGuidanceForCompare(value?: InstanceTemplateMainAgentGuidance | null) {
  if (!value) {
    return null;
  }
  return {
    enabled: value.enabled ?? null,
    prompt: normalizeOptionalText(value.prompt),
  };
}
function snapshotTemplate(template?: InstanceTemplate | null): string {
  if (!template) {
    return "";
  }
  return JSON.stringify({
    templateKey: template.templateKey,
    displayName: template.displayName,
    description: normalizeOptionalText(template.description),
    summary: normalizeOptionalText(template.summary),
    enabled: template.enabled,
    imagePresetId: template.imagePresetId,
    desiredState: template.desiredState,
    mainAgent: {
      agentKey: template.mainAgent.agentKey,
      provider: normalizeOptionalText(template.mainAgent.provider).trim(),
      model: normalizeOptionalText(template.mainAgent.model).trim(),
      temperature: template.mainAgent.temperature ?? null,
      agentic: template.mainAgent.agentic ?? null,
      systemPrompt: normalizeOptionalText(template.mainAgent.systemPrompt),
      allowedTools: normalizeStringValues(template.mainAgent.allowedTools),
      allowedSkills: normalizeStringValues(template.mainAgent.allowedSkills),
    },
    skillKeys: normalizeStringValues(template.skillKeys),
    lockedScopes: normalizeStringValues(template.lockedScopes),
    tags: normalizeStringValues(template.tags),
    runtimeConfigToml: normalizeOptionalText(template.runtimeConfigToml),
    channelsConfig: normalizeChannelsConfigForCompare(template.channelsConfig),
    defaultModelConfig: normalizeDefaultModelConfigForCompare(template.defaultModelConfig),
    routingConfig: normalizeRoutingConfigForCompare(template.routingConfig),
    mainAgentGuidance: normalizeGuidanceForCompare(template.mainAgentGuidance),
  });
}

function buildSkillLabel(skill: SkillBaselineSummary): string {
  return skill.displayName ? `${skill.displayName} (${skill.skillKey})` : skill.skillKey;
}

function toUpsertRequest(draft: InstanceTemplate): InstanceTemplateUpsertRequest {
  const normalizedDefaultModel = draft.defaultModelConfig
    ? {
        apiKey: trimToNull(draft.defaultModelConfig.apiKey),
        defaultProvider: trimToNull(draft.defaultModelConfig.defaultProvider),
        defaultModel: trimToNull(draft.defaultModelConfig.defaultModel),
        defaultTemperature: typeof draft.defaultModelConfig.defaultTemperature === "number"
          ? draft.defaultModelConfig.defaultTemperature
          : null,
      }
    : null;

  const defaultModelConfig = normalizedDefaultModel
    && (normalizedDefaultModel.apiKey !== null
      || normalizedDefaultModel.defaultProvider !== null
      || normalizedDefaultModel.defaultModel !== null
      || normalizedDefaultModel.defaultTemperature !== null)
    ? normalizedDefaultModel
    : null;

  const normalizedRoutingConfig = draft.routingConfig
    ? {
        queryClassificationEnabled: draft.routingConfig.queryClassificationEnabled,
        modelRoutes: (draft.routingConfig.modelRoutes ?? [])
          .map(normalizeRoute)
          .filter((item) => item.hint || item.provider || item.model),
        queryClassificationRules: (draft.routingConfig.queryClassificationRules ?? [])
          .map(normalizeRule)
          .filter((item) => item.hint || item.keywords.length > 0 || item.patterns.length > 0),
      }
    : null;

  const routingConfig = normalizedRoutingConfig
    && (
      normalizedRoutingConfig.modelRoutes.length > 0
      || normalizedRoutingConfig.queryClassificationEnabled
      || normalizedRoutingConfig.queryClassificationRules.length > 0
    )
    ? normalizedRoutingConfig
    : null;

  const normalizedChannelsConfig = draft.channelsConfig
    ? {
        cliEnabled: draft.channelsConfig.cliEnabled,
        messageTimeoutSecs: draft.channelsConfig.messageTimeoutSecs,
        dingtalkEnabled: draft.channelsConfig.dingtalkEnabled,
        dingtalkClientId: trimToNull(draft.channelsConfig.dingtalkClientId),
        dingtalkClientSecret: trimToNull(draft.channelsConfig.dingtalkClientSecret),
        dingtalkAllowedUsers: normalizeStringValues(draft.channelsConfig.dingtalkAllowedUsers),
        qqEnabled: draft.channelsConfig.qqEnabled,
        qqAppId: trimToNull(draft.channelsConfig.qqAppId),
        qqAppSecret: trimToNull(draft.channelsConfig.qqAppSecret),
        qqAllowedUsers: normalizeStringValues(draft.channelsConfig.qqAllowedUsers),
      }
    : null;

  const channelsConfig = normalizedChannelsConfig
    && (
      normalizedChannelsConfig.cliEnabled
      || normalizedChannelsConfig.dingtalkEnabled
      || normalizedChannelsConfig.qqEnabled
      || normalizedChannelsConfig.dingtalkAllowedUsers.length > 0
      || normalizedChannelsConfig.qqAllowedUsers.length > 0
      || normalizedChannelsConfig.dingtalkClientId !== null
      || normalizedChannelsConfig.dingtalkClientSecret !== null
      || normalizedChannelsConfig.qqAppId !== null
      || normalizedChannelsConfig.qqAppSecret !== null
      || normalizedChannelsConfig.messageTimeoutSecs !== 300
    )
    ? normalizedChannelsConfig
    : null;

  const normalizedGuidance = draft.mainAgentGuidance
    ? {
        prompt: bodyToNull(draft.mainAgentGuidance.prompt),
        enabled: draft.mainAgentGuidance.enabled ?? null,
      }
    : null;

  const mainAgentGuidance = normalizedGuidance
    && (normalizedGuidance.prompt !== null || normalizedGuidance.enabled !== null)
    ? normalizedGuidance
    : null;

  return {
    templateKey: draft.templateKey,
    displayName: draft.displayName,
    description: trimToNull(draft.description),
    summary: trimToNull(draft.summary),
    enabled: draft.enabled,
    imagePresetId: draft.imagePresetId,
    desiredState: draft.desiredState,
    mainAgent: {
      agentKey: draft.mainAgent.agentKey,
      provider: trimToNull(draft.mainAgent.provider),
      model: trimToNull(draft.mainAgent.model),
      temperature: draft.mainAgent.temperature ?? null,
      agentic: draft.mainAgent.agentic ?? null,
      systemPrompt: bodyToNull(draft.mainAgent.systemPrompt),
      allowedTools: normalizeStringValues(draft.mainAgent.allowedTools),
      allowedSkills: normalizeStringValues(draft.mainAgent.allowedSkills),
    },
    skillKeys: normalizeStringValues(draft.skillKeys),
    lockedScopes: normalizeStringValues(draft.lockedScopes),
    tags: normalizeStringValues(draft.tags),
    runtimeConfigToml: bodyToNull(draft.runtimeConfigToml),
    channelsConfig,
    defaultModelConfig,
    routingConfig,
    mainAgentGuidance,
    updatedBy: "ui-template-center",
  };
}

export function TemplateManagementPanel({
  templates,
  loadingTemplates,
  images,
  loadingImages,
  onRefreshTemplates,
  onRefreshImages,
  onUseTemplate,
}: {
  templates: InstanceTemplate[];
  loadingTemplates?: boolean;
  images: ImagePreset[];
  loadingImages?: boolean;
  onRefreshTemplates?: () => void;
  onRefreshImages?: () => void;
  onUseTemplate?: (templateKey: string) => void;
}) {
  const [messageApi, contextHolder] = message.useMessage();
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>();
  const [draft, setDraft] = useState<InstanceTemplate>();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string>();
  const [agentBaselines, setAgentBaselines] = useState<AgentBaselineSummary[]>([]);
  const [skillBaselines, setSkillBaselines] = useState<SkillBaselineSummary[]>([]);
  const [toolCatalog, setToolCatalog] = useState<AgentToolCatalog>(emptyAgentToolCatalog());
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [skillSearch, setSkillSearch] = useState("");
  const [createForm] = Form.useForm<CreateTemplateForm>();

  useEffect(() => {
    void Promise.allSettled([
      listAgentBaselines(),
      listSkillBaselines(),
      getAgentToolCatalog(),
    ]).then(([agentResult, skillResult, toolResult]) => {
      setAgentBaselines(agentResult.status === "fulfilled" ? agentResult.value.items : []);
      setSkillBaselines(skillResult.status === "fulfilled" ? skillResult.value.items : []);
      setToolCatalog(toolResult.status === "fulfilled" ? toolResult.value : emptyAgentToolCatalog());
    });
  }, []);

  useEffect(() => {
    if (templates.length === 0) {
      setSelectedTemplateKey(undefined);
      setDraft(undefined);
      return;
    }
    const nextSelectedKey = selectedTemplateKey && templates.some((item) => item.templateKey === selectedTemplateKey)
      ? selectedTemplateKey
      : templates[0].templateKey;
    setSelectedTemplateKey(nextSelectedKey);
  }, [selectedTemplateKey, templates]);
  useEffect(() => {
    const selected = templates.find((item) => item.templateKey === selectedTemplateKey);
    setDraft(selected ? cloneTemplate(selected) : undefined);
    setSkillSearch("");
  }, [selectedTemplateKey, templates]);

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.templateKey === selectedTemplateKey),
    [selectedTemplateKey, templates],
  );

  const dirty = useMemo(() => {
    if (!draft || !selectedTemplate) {
      return false;
    }
    return snapshotTemplate(draft) !== snapshotTemplate(selectedTemplate);
  }, [draft, selectedTemplate]);

  const imageOptions = useMemo(
    () => images.map((item) => ({ value: item.id, label: `${item.name} · ${item.image}` })),
    [images],
  );

  const agentOptions = useMemo(
    () => agentBaselines
      .map((item) => ({ value: item.agentKey, label: `${item.displayName} (${item.agentKey})` }))
      .sort((left, right) => left.value.localeCompare(right.value)),
    [agentBaselines],
  );

  const mountedSkillOptions = useMemo(() => {
    const options = new Map<string, string>();
    for (const item of skillBaselines) {
      if ((draft?.skillKeys ?? []).includes(item.skillKey)) {
        options.set(item.skillKey, buildSkillLabel(item));
      }
    }
    for (const key of draft?.skillKeys ?? []) {
      if (!options.has(key)) {
        options.set(key, key);
      }
    }
    for (const key of draft?.mainAgent.allowedSkills ?? []) {
      if (!options.has(key)) {
        options.set(key, key);
      }
    }
    return Array.from(options.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([value, label]) => ({ value, label }));
  }, [draft?.mainAgent.allowedSkills, draft?.skillKeys, skillBaselines]);

  const toolOptions = useMemo(
    () => buildAgentToolOptions(toolCatalog.tools, draft?.mainAgent.allowedTools),
    [draft?.mainAgent.allowedTools, toolCatalog.tools],
  );

  const selectedAgentBaseline = useMemo(
    () => agentBaselines.find((item) => item.agentKey === draft?.mainAgent.agentKey),
    [agentBaselines, draft?.mainAgent.agentKey],
  );

  const mountedSkillSet = useMemo(
    () => new Set(draft?.skillKeys ?? []),
    [draft?.skillKeys],
  );

  const filteredSkillBaselines = useMemo(() => {
    const keyword = skillSearch.trim().toLowerCase();
    if (!keyword) {
      return skillBaselines;
    }
    return skillBaselines.filter((item) => {
      const haystack = `${item.skillKey} ${item.displayName ?? ""} ${item.description ?? ""}`.toLowerCase();
      return haystack.includes(keyword);
    });
  }, [skillBaselines, skillSearch]);

  const updateDraft = useCallback((patch: Partial<InstanceTemplate>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const updateMainAgent = useCallback((patch: Partial<InstanceTemplate["mainAgent"]>) => {
    setDraft((current) => (
      current
        ? {
            ...current,
            mainAgent: {
              ...current.mainAgent,
              ...patch,
            },
          }
        : current
    ));
  }, []);

  const setMountedSkills = useCallback((nextSkillKeys: string[]) => {
    const normalizedSkillKeys = normalizeStringValues(nextSkillKeys);
    setDraft((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        skillKeys: normalizedSkillKeys,
        mainAgent: {
          ...current.mainAgent,
          allowedSkills: normalizeStringValues(current.mainAgent.allowedSkills)
            .filter((skillKey) => normalizedSkillKeys.includes(skillKey)),
        },
      };
    });
  }, []);

  const toggleSkillMounted = useCallback((skillKey: string) => {
    setMountedSkills(
      mountedSkillSet.has(skillKey)
        ? (draft?.skillKeys ?? []).filter((item) => item !== skillKey)
        : [...(draft?.skillKeys ?? []), skillKey],
    );
  }, [draft?.skillKeys, mountedSkillSet, setMountedSkills]);

  const ensureDefaultModelConfig = useCallback(() => {
    setDraft((current) => (current ? { ...current, defaultModelConfig: current.defaultModelConfig ?? buildEmptyDefaultModelConfig() } : current));
  }, []);

  const updateDefaultModelConfig = useCallback((patch: Partial<InstanceTemplateDefaultModelConfig>) => {
    setDraft((current) => (
      current
        ? {
            ...current,
            defaultModelConfig: {
              ...(current.defaultModelConfig ?? buildEmptyDefaultModelConfig()),
              ...patch,
            },
          }
        : current
    ));
  }, []);

  const ensureRoutingConfig = useCallback(() => {
    setDraft((current) => (current ? { ...current, routingConfig: current.routingConfig ?? buildEmptyRoutingConfig() } : current));
  }, []);

  const updateRoutingConfig = useCallback((patch: Partial<InstanceTemplateRoutingConfig>) => {
    setDraft((current) => (
      current
        ? {
            ...current,
            routingConfig: {
              ...(current.routingConfig ?? buildEmptyRoutingConfig()),
              ...patch,
            },
          }
        : current
    ));
  }, []);

  const updateRoute = useCallback((index: number, patch: Partial<ModelRouteConfigItem>) => {
    setDraft((current) => {
      if (!current?.routingConfig) {
        return current;
      }
      return {
        ...current,
        routingConfig: {
          ...current.routingConfig,
          modelRoutes: current.routingConfig.modelRoutes.map((item, routeIndex) => (
            routeIndex === index ? { ...item, ...patch } : item
          )),
        },
      };
    });
  }, []);

  const updateRule = useCallback((index: number, patch: Partial<QueryClassificationRuleConfigItem>) => {
    setDraft((current) => {
      if (!current?.routingConfig) {
        return current;
      }
      return {
        ...current,
        routingConfig: {
          ...current.routingConfig,
          queryClassificationRules: current.routingConfig.queryClassificationRules.map((item, ruleIndex) => (
            ruleIndex === index ? { ...item, ...patch } : item
          )),
        },
      };
    });
  }, []);

  const ensureChannelsConfig = useCallback(() => {
    setDraft((current) => (current ? { ...current, channelsConfig: current.channelsConfig ?? buildEmptyChannelsConfig() } : current));
  }, []);

  const updateChannelsConfig = useCallback((patch: Partial<InstanceTemplateChannelsConfig>) => {
    setDraft((current) => (
      current
        ? {
            ...current,
            channelsConfig: {
              ...(current.channelsConfig ?? buildEmptyChannelsConfig()),
              ...patch,
            },
          }
        : current
    ));
  }, []);
  const ensureGuidance = useCallback(() => {
    setDraft((current) => (current ? { ...current, mainAgentGuidance: current.mainAgentGuidance ?? buildEmptyGuidance() } : current));
  }, []);

  const updateGuidance = useCallback((patch: Partial<InstanceTemplateMainAgentGuidance>) => {
    setDraft((current) => (
      current
        ? {
            ...current,
            mainAgentGuidance: {
              ...(current.mainAgentGuidance ?? buildEmptyGuidance()),
              ...patch,
            },
          }
        : current
    ));
  }, []);

  const handleCreateTemplate = useCallback(async () => {
    try {
      const values = await createForm.validateFields();
      setCreating(true);
      const initial = buildEmptyTemplate(values.templateKey.trim(), values.displayName.trim());
      const response = await createInstanceTemplate({
        templateKey: initial.templateKey,
        displayName: initial.displayName,
        description: initial.description,
        summary: initial.summary,
        enabled: initial.enabled,
        imagePresetId: initial.imagePresetId,
        desiredState: initial.desiredState,
        mainAgent: initial.mainAgent,
        skillKeys: initial.skillKeys,
        lockedScopes: initial.lockedScopes,
        tags: initial.tags,
        runtimeConfigToml: initial.runtimeConfigToml,
        channelsConfig: initial.channelsConfig,
        defaultModelConfig: initial.defaultModelConfig,
        routingConfig: initial.routingConfig,
        mainAgentGuidance: initial.mainAgentGuidance,
        updatedBy: initial.updatedBy,
      });
      messageApi.success(`模板已创建：${response.displayName}`);
      setCreateModalOpen(false);
      createForm.resetFields();
      setSelectedTemplateKey(response.templateKey);
      await onRefreshTemplates?.();
    } catch (apiError) {
      const hasValidationError = typeof apiError === "object" && apiError !== null && "errorFields" in apiError;
      if (!hasValidationError) {
        messageApi.error(apiError instanceof Error ? apiError.message : "创建模板失败");
      }
    } finally {
      setCreating(false);
    }
  }, [createForm, messageApi, onRefreshTemplates]);

  const handleSave = useCallback(async () => {
    if (!draft) {
      return;
    }
    try {
      setSaving(true);
      setError(undefined);
      const response = await upsertInstanceTemplate(draft.templateKey, toUpsertRequest(draft));
      setDraft(cloneTemplate(response));
      messageApi.success("模板已保存");
      await onRefreshTemplates?.();
    } catch (apiError) {
      const messageText = apiError instanceof Error ? apiError.message : "保存模板失败";
      setError(messageText);
      messageApi.error(messageText);
    } finally {
      setSaving(false);
    }
  }, [draft, messageApi, onRefreshTemplates]);

  const handleDelete = useCallback(async () => {
    if (!selectedTemplate) {
      return;
    }
    try {
      setDeleting(true);
      await deleteInstanceTemplate(selectedTemplate.templateKey);
      messageApi.success(`模板已删除：${selectedTemplate.displayName}`);
      await onRefreshTemplates?.();
    } catch (apiError) {
      messageApi.error(apiError instanceof Error ? apiError.message : "删除模板失败");
    } finally {
      setDeleting(false);
    }
  }, [messageApi, onRefreshTemplates, selectedTemplate]);

  return (
    <>
      {contextHolder}
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Alert
          type="info"
          showIcon
          message="模板中心已成为实例配置的来源"
          description="现在可直接在模板内维护主 Agent、预装 Skills、默认模型、路由配置，以及部分运行时高级配置。实例创建时将按模板下发。"
        />

        <Card
          className="glass-card"
          title="模板中心"
          extra={(
            <Space wrap>
              <Button icon={<RefreshCw size={14} />} onClick={onRefreshTemplates} loading={loadingTemplates}>
                刷新模板
              </Button>
              <Button icon={<RefreshCw size={14} />} onClick={onRefreshImages} loading={loadingImages}>
                刷新镜像
              </Button>
              <Button type="primary" icon={<Plus size={14} />} onClick={() => setCreateModalOpen(true)}>
                新建模板
              </Button>
            </Space>
          )}
        >
          <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              {templates.length === 0 && !loadingTemplates ? (
                <Empty description="当前还没有模板，先新建一个吧" />
              ) : templates.map((template) => {
                const selected = template.templateKey === selectedTemplateKey;
                return (
                  <Card
                    key={template.templateKey}
                    hoverable
                    size="small"
                    className={selected ? "border-primary" : undefined}
                    onClick={() => setSelectedTemplateKey(template.templateKey)}
                  >
                    <Space direction="vertical" size="small" style={{ width: "100%" }}>
                      <Space wrap>
                        <Text strong>{template.displayName}</Text>
                        {!template.enabled ? <Tag color="default">停用</Tag> : null}
                        <Tag color="blue">{template.desiredState}</Tag>
                      </Space>
                      <Text type="secondary">{template.templateKey}</Text>
                      <Paragraph style={{ marginBottom: 0 }} ellipsis={{ rows: 2 }}>
                        {template.summary || template.description || "-"}
                      </Paragraph>
                      <Space size={[8, 8]} wrap>
                        {template.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}
                      </Space>
                      <Space wrap>
                        <Button
                          size="small"
                          type="primary"
                          icon={<PlayCircle size={12} />}
                          disabled={!template.enabled}
                          onClick={(event) => {
                            event.stopPropagation();
                            onUseTemplate?.(template.templateKey);
                          }}
                        >
                          使用模板
                        </Button>
                      </Space>
                    </Space>
                  </Card>
                );
              })}
            </Space>

            {draft ? (
              <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                {error ? <Alert type="error" showIcon message={error} /> : null}
                <Card
                  title={draft.displayName || draft.templateKey}
                  extra={(
                    <Space wrap>
                      <Button type="primary" icon={<Save size={14} />} loading={saving} disabled={!dirty} onClick={() => void handleSave()}>
                        保存模板
                      </Button>
                      <Popconfirm
                        title="删除模板"
                        description={`确认删除模板 ${draft.displayName || draft.templateKey}？`}
                        okText="确认删除"
                        cancelText="取消"
                        onConfirm={() => void handleDelete()}
                      >
                        <Button danger icon={<Trash2 size={14} />} loading={deleting}>
                          删除模板
                        </Button>
                      </Popconfirm>
                    </Space>
                  )}
                >
                  <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                    <div className="agent-detail-grid">
                      <div className="agent-detail-prop">
                        <span className="agent-detail-prop-label">模板 Key</span>
                        <span className="agent-detail-prop-value">{draft.templateKey}</span>
                      </div>
                      <div className="agent-detail-prop">
                        <span className="agent-detail-prop-label">最近更新时间</span>
                        <span className="agent-detail-prop-value">{formatTimestamp(draft.updatedAt)}</span>
                      </div>
                    </div>

                    <Tabs
                      items={[
                        {
                          key: "basic",
                          label: "基础",
                          children: (
                            <Space direction="vertical" size="large" style={{ width: "100%" }}>
                              <Input
                                value={draft.displayName}
                                addonBefore="显示名称"
                                onChange={(event) => updateDraft({ displayName: event.target.value })}
                              />
                              <Input.TextArea
                                rows={2}
                                value={draft.description ?? ""}
                                placeholder="模板描述"
                                onChange={(event) => updateDraft({ description: event.target.value })}
                              />
                              <Input.TextArea
                                rows={2}
                                value={draft.summary ?? ""}
                                placeholder="模板摘要"
                                onChange={(event) => updateDraft({ summary: event.target.value })}
                              />

                              <div className="agent-detail-grid">
                                <div className="agent-detail-prop">
                                  <span className="agent-detail-prop-label">启用</span>
                                  <Switch checked={draft.enabled} onChange={(checked) => updateDraft({ enabled: checked })} />
                                </div>
                                <div className="agent-detail-prop">
                                  <span className="agent-detail-prop-label">默认启动状态</span>
                                  <Select
                                    value={draft.desiredState}
                                    options={[
                                      { value: "RUNNING", label: "运行" },
                                      { value: "STOPPED", label: "停止" },
                                    ]}
                                    onChange={(value) => updateDraft({ desiredState: value })}
                                  />
                                </div>
                              </div>

                              <Select
                                value={draft.imagePresetId}
                                options={imageOptions}
                                placeholder="镜像预设"
                                loading={loadingImages}
                                onChange={(value) => updateDraft({ imagePresetId: value })}
                              />

                              <Select
                                mode="tags"
                                value={draft.tags}
                                options={draft.tags.map((value) => ({ value, label: value }))}
                                placeholder="标签"
                                onChange={(value) => updateDraft({ tags: normalizeStringValues(value) })}
                              />

                              <Select
                                mode="tags"
                                value={draft.lockedScopes}
                                options={draft.lockedScopes.map((value) => ({ value, label: value }))}
                                placeholder="锁定范围"
                                onChange={(value) => updateDraft({ lockedScopes: normalizeStringValues(value) })}
                              />

                              <Card type="inner" title="运行配置">
                                <Input.TextArea
                                  rows={12}
                                  value={draft.runtimeConfigToml ?? ""}
                                  placeholder="config.toml 模板内容，可留空"
                                  onChange={(event) => updateDraft({ runtimeConfigToml: event.target.value })}
                                />
                              </Card>

                              <Card type="inner" title="当前锁定范围">
                                <Space size={[8, 8]} wrap>
                                  {draft.lockedScopes.length === 0 ? <Text type="secondary">未设置</Text> : draft.lockedScopes.map((scope) => (
                                    <Tag key={scope} color="gold">
                                      <Space size="small">
                                        <Layers size={12} />
                                        <span>{scope}</span>
                                      </Space>
                                    </Tag>
                                  ))}
                                </Space>
                              </Card>
                            </Space>
                          ),
                        },
                        {
                          key: "agent",
                          label: "Agent",
                          children: (
                            <Space direction="vertical" size="large" style={{ width: "100%" }}>
                              <Alert
                                type="info"
                                showIcon
                                message="单机器人模板只维护一个主 Agent"
                                description="这里对应实例页的 Agent 装载与主 Agent 运行参数。实例创建时，会按此模板自动绑定主 Agent。"
                              />

                              <Card type="inner" title="主 Agent">
                                <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                                  <Select
                                    allowClear
                                    value={draft.mainAgent.agentKey || undefined}
                                    options={agentOptions}
                                    placeholder="选择主 Agent"
                                    onChange={(value) => updateMainAgent({ agentKey: value ?? "" })}
                                  />

                                  {selectedAgentBaseline ? (
                                    <Alert
                                      type="success"
                                      showIcon
                                      message={selectedAgentBaseline.displayName || selectedAgentBaseline.agentKey}
                                      description={selectedAgentBaseline.sourceRef || "已选主 Agent"}
                                    />
                                  ) : (
                                    <Text type="secondary">当前未选择主 Agent。</Text>
                                  )}

                                  <Input
                                    value={draft.mainAgent.provider ?? ""}
                                    addonBefore="Provider"
                                    onChange={(event) => updateMainAgent({ provider: event.target.value })}
                                  />
                                  <Input
                                    value={draft.mainAgent.model ?? ""}
                                    addonBefore="Model"
                                    onChange={(event) => updateMainAgent({ model: event.target.value })}
                                  />

                                  <div>
                                    <Text type="secondary">Temperature</Text>
                                    <InputNumber
                                      style={{ width: "100%", marginTop: 8 }}
                                      value={draft.mainAgent.temperature ?? null}
                                      min={0}
                                      max={2}
                                      step={0.1}
                                      onChange={(value) => updateMainAgent({ temperature: typeof value === "number" ? value : null })}
                                    />
                                  </div>

                                  <Space size="small">
                                    <Text>Agentic</Text>
                                    <Switch checked={draft.mainAgent.agentic === true} onChange={(checked) => updateMainAgent({ agentic: checked })} />
                                  </Space>

                                  <Select
                                    mode="multiple"
                                    allowClear
                                    value={draft.mainAgent.allowedTools}
                                    options={toolOptions}
                                    placeholder="allowed_tools"
                                    onChange={(value) => updateMainAgent({ allowedTools: normalizeStringValues(value) })}
                                  />
                                  <Text type="secondary">这里控制主 Agent 在 ZeroClaw 运行时可见的工具集合。</Text>

                                  <Select
                                    mode="multiple"
                                    allowClear
                                    value={draft.mainAgent.allowedSkills}
                                    options={mountedSkillOptions}
                                    placeholder="留空表示主 Agent 可访问全部预装 Skills"
                                    onChange={(value) => updateMainAgent({ allowedSkills: normalizeStringValues(value) })}
                                  />
                                  <Text type="secondary">推荐只从当前模板已预装的 Skills 中选择。</Text>

                                  <Input.TextArea
                                    rows={14}
                                    value={draft.mainAgent.systemPrompt ?? ""}
                                    placeholder="主 Agent system prompt"
                                    onChange={(event) => updateMainAgent({ systemPrompt: event.target.value })}
                                  />
                                </Space>
                              </Card>
                            </Space>
                          ),
                        },
                        {
                          key: "skills",
                          label: "Skills",
                          children: (
                            <Space direction="vertical" size="large" style={{ width: "100%" }}>
                              <Alert
                                type="info"
                                showIcon
                                message="这里维护模板的预装 Skills"
                                description="实例创建时会自动装载这里选中的 Skills。主 Agent 能访问哪些 Skills，请在 Agent 页的 allowed_skills 里控制。"
                              />

                              <Card
                                type="inner"
                                title={`已预装 Skills（${draft.skillKeys.length}）`}
                                extra={draft.skillKeys.length > 0 ? (
                                  <Button size="small" onClick={() => setMountedSkills([])}>
                                    清空
                                  </Button>
                                ) : null}
                              >
                                {draft.skillKeys.length === 0 ? (
                                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前模板还没有预装 Skill" />
                                ) : (
                                  <Space size={[8, 8]} wrap>
                                    {draft.skillKeys.map((skillKey) => (
                                      <Tag key={skillKey} closable onClose={(event) => {
                                        event.preventDefault();
                                        toggleSkillMounted(skillKey);
                                      }}>
                                        {mountedSkillOptions.find((item) => item.value === skillKey)?.label ?? skillKey}
                                      </Tag>
                                    ))}
                                  </Space>
                                )}
                              </Card>

                              <Card type="inner" title="Skill 装载池">
                                <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                                  <Input.Search
                                    value={skillSearch}
                                    placeholder="搜索 Skill Key / 名称"
                                    onChange={(event) => setSkillSearch(event.target.value)}
                                  />

                                  {filteredSkillBaselines.length === 0 ? (
                                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有匹配的 Skill" />
                                  ) : (
                                    <div className="grid gap-3 lg:grid-cols-2">
                                      {filteredSkillBaselines.map((skill) => {
                                        const mounted = mountedSkillSet.has(skill.skillKey);
                                        return (
                                          <Card
                                            key={skill.skillKey}
                                            size="small"
                                            extra={(
                                              <Button
                                                size="small"
                                                type={mounted ? "default" : "primary"}
                                                danger={mounted}
                                                onClick={() => toggleSkillMounted(skill.skillKey)}
                                              >
                                                {mounted ? "卸载" : "装载"}
                                              </Button>
                                            )}
                                          >
                                            <Space direction="vertical" size={6} style={{ width: "100%" }}>
                                              <Space wrap>
                                                <Text strong>{skill.displayName || skill.skillKey}</Text>
                                                {!skill.enabled ? <Tag color="default">停用</Tag> : null}
                                                {mounted ? <Tag color="green">已预装</Tag> : null}
                                              </Space>
                                              <Text type="secondary">{skill.skillKey}</Text>
                                              <Paragraph style={{ marginBottom: 0 }} ellipsis={{ rows: 2 }}>
                                                {skill.description || skill.sourceRef || "-"}
                                              </Paragraph>
                                            </Space>
                                          </Card>
                                        );
                                      })}
                                    </div>
                                  )}
                                </Space>
                              </Card>
                            </Space>
                          ),
                        },
                        {
                          key: "model",
                          label: "模型",
                          children: (
                            <Space direction="vertical" size="large" style={{ width: "100%" }}>
                              <div className="agent-detail-grid">
                                <div className="agent-detail-prop">
                                  <span className="agent-detail-prop-label">启用默认模型配置</span>
                                  <Switch
                                    checked={Boolean(draft.defaultModelConfig)}
                                    onChange={(checked) => {
                                      if (checked) {
                                        ensureDefaultModelConfig();
                                      } else {
                                        updateDraft({ defaultModelConfig: null });
                                      }
                                    }}
                                  />
                                </div>
                              </div>

                              {draft.defaultModelConfig ? (
                                <Card type="inner" title="默认模型配置">
                                  <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                                    <Input.Password
                                      value={draft.defaultModelConfig.apiKey ?? ""}
                                      placeholder="api_key，可留空"
                                      onChange={(event) => updateDefaultModelConfig({ apiKey: event.target.value })}
                                    />
                                    <Input
                                      addonBefore="default_provider"
                                      value={draft.defaultModelConfig.defaultProvider ?? ""}
                                      placeholder="例如：custom:https://api.ai.fun.tv/v1"
                                      onChange={(event) => updateDefaultModelConfig({ defaultProvider: event.target.value })}
                                    />
                                    <Input
                                      addonBefore="default_model"
                                      value={draft.defaultModelConfig.defaultModel ?? ""}
                                      placeholder="例如：MiniMax-M2.5"
                                      onChange={(event) => updateDefaultModelConfig({ defaultModel: event.target.value })}
                                    />
                                    <InputNumber
                                      addonBefore="default_temperature"
                                      min={0}
                                      max={2}
                                      step={0.1}
                                      value={draft.defaultModelConfig.defaultTemperature ?? 0.7}
                                      style={{ width: "100%" }}
                                      onChange={(value) => updateDefaultModelConfig({ defaultTemperature: typeof value === "number" ? value : 0.7 })}
                                    />
                                  </Space>
                                </Card>
                              ) : (
                                <Text type="secondary">未启用模板默认模型配置，实例会沿用系统或运行时默认值。</Text>
                              )}
                            </Space>
                          ),
                        },
                        {
                          key: "routing",
                          label: "路由",
                          children: (
                            <Space direction="vertical" size="large" style={{ width: "100%" }}>
                              <div className="agent-detail-grid">
                                <div className="agent-detail-prop">
                                  <span className="agent-detail-prop-label">启用模板路由配置</span>
                                  <Switch
                                    checked={Boolean(draft.routingConfig)}
                                    onChange={(checked) => {
                                      if (checked) {
                                        ensureRoutingConfig();
                                      } else {
                                        updateDraft({ routingConfig: null });
                                      }
                                    }}
                                  />
                                </div>
                              </div>

                              {draft.routingConfig ? (
                                <>
                                  <Alert
                                    type="info"
                                    showIcon
                                    message="模板路由配置会在创建实例时下发"
                                    description="这里对应实例详情里的模型路由与 query classification 配置。"
                                  />

                                  <Card
                                    type="inner"
                                    size="small"
                                    title="model_routes"
                                    extra={(
                                      <Button size="small" onClick={() => updateRoutingConfig({ modelRoutes: [...draft.routingConfig!.modelRoutes, createEmptyRoute()] })}>
                                        新增路由
                                      </Button>
                                    )}
                                  >
                                    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                                      {draft.routingConfig.modelRoutes.length === 0 ? (
                                        <Empty description="暂无路由配置" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                                      ) : draft.routingConfig.modelRoutes.map((route, index) => (
                                        <Card
                                          key={`route-${index}`}
                                          size="small"
                                          extra={(
                                            <Button
                                              danger
                                              size="small"
                                              onClick={() => updateRoutingConfig({
                                                modelRoutes: draft.routingConfig!.modelRoutes.filter((_, routeIndex) => routeIndex !== index),
                                              })}
                                            >
                                              删除
                                            </Button>
                                          )}
                                        >
                                          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                                            <Input
                                              addonBefore="hint"
                                              value={route.hint}
                                              onChange={(event) => updateRoute(index, { hint: event.target.value })}
                                              placeholder="例如：mgc-novel-to-script"
                                            />
                                            <Input
                                              addonBefore="provider"
                                              value={route.provider}
                                              onChange={(event) => updateRoute(index, { provider: event.target.value })}
                                              placeholder="例如：custom:https://api.ai.fun.tv/v1"
                                            />
                                            <Input
                                              addonBefore="model"
                                              value={route.model}
                                              onChange={(event) => updateRoute(index, { model: event.target.value })}
                                              placeholder="例如：MiniMax-M2.5"
                                            />
                                          </Space>
                                        </Card>
                                      ))}
                                    </Space>
                                  </Card>

                                  <Card
                                    type="inner"
                                    size="small"
                                    title="query_classification"
                                    extra={(
                                      <Space size="small">
                                        <Text type="secondary">启用分类</Text>
                                        <Switch
                                          checked={draft.routingConfig.queryClassificationEnabled}
                                          onChange={(checked) => updateRoutingConfig({ queryClassificationEnabled: checked })}
                                        />
                                      </Space>
                                    )}
                                  >
                                    {draft.routingConfig.queryClassificationEnabled ? (
                                      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                                        <Button
                                          size="small"
                                          onClick={() => updateRoutingConfig({
                                            queryClassificationRules: [...draft.routingConfig!.queryClassificationRules, createEmptyRule()],
                                          })}
                                        >
                                          新增分类规则
                                        </Button>

                                        {draft.routingConfig.queryClassificationRules.length === 0 ? (
                                          <Empty description="暂无分类规则" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                                        ) : draft.routingConfig.queryClassificationRules.map((rule, index) => (
                                          <Card
                                            key={`rule-${index}`}
                                            size="small"
                                            extra={(
                                              <Button
                                                danger
                                                size="small"
                                                onClick={() => updateRoutingConfig({
                                                  queryClassificationRules: draft.routingConfig!.queryClassificationRules.filter((_, ruleIndex) => ruleIndex !== index),
                                                })}
                                              >
                                                删除
                                              </Button>
                                            )}
                                          >
                                            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                                              <Input
                                                addonBefore="hint"
                                                value={rule.hint}
                                                onChange={(event) => updateRule(index, { hint: event.target.value })}
                                                placeholder="例如：script-outline"
                                              />
                                              <Select
                                                mode="tags"
                                                value={rule.keywords ?? []}
                                                tokenSeparators={[",", "，", "\n"]}
                                                placeholder="keywords，按回车或逗号分隔"
                                                style={{ width: "100%" }}
                                                onChange={(value) => updateRule(index, { keywords: normalizeStringValues(value) })}
                                              />
                                              <Select
                                                mode="tags"
                                                value={rule.patterns ?? []}
                                                tokenSeparators={[",", "，", "\n"]}
                                                placeholder="patterns，按回车或逗号分隔"
                                                style={{ width: "100%" }}
                                                onChange={(value) => updateRule(index, { patterns: normalizeStringValues(value) })}
                                              />
                                              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                                                <InputNumber
                                                  addonBefore="priority"
                                                  min={0}
                                                  precision={0}
                                                  value={rule.priority ?? DEFAULT_RULE_PRIORITY}
                                                  style={{ width: "100%" }}
                                                  onChange={(value) => updateRule(index, { priority: typeof value === "number" ? value : DEFAULT_RULE_PRIORITY })}
                                                />
                                                <InputNumber
                                                  addonBefore="min_length"
                                                  min={0}
                                                  precision={0}
                                                  value={rule.minLength ?? DEFAULT_RULE_MIN_LENGTH}
                                                  style={{ width: "100%" }}
                                                  onChange={(value) => updateRule(index, { minLength: typeof value === "number" ? value : DEFAULT_RULE_MIN_LENGTH })}
                                                />
                                                <InputNumber
                                                  addonBefore="max_length"
                                                  min={0}
                                                  precision={0}
                                                  value={rule.maxLength ?? DEFAULT_RULE_MAX_LENGTH}
                                                  style={{ width: "100%" }}
                                                  onChange={(value) => updateRule(index, { maxLength: typeof value === "number" ? value : DEFAULT_RULE_MAX_LENGTH })}
                                                />
                                              </div>
                                            </Space>
                                          </Card>
                                        ))}
                                      </Space>
                                    ) : (
                                      <Text type="secondary">当前未启用 query classification。</Text>
                                    )}
                                  </Card>
                                </>
                              ) : (
                                <Text type="secondary">未启用模板路由配置。</Text>
                              )}
                            </Space>
                          ),
                        },
                        {
                          key: "advanced",
                          label: "高级",
                          children: (
                            <Space direction="vertical" size="large" style={{ width: "100%" }}>
                              <Card
                                type="inner"
                                title="渠道配置"
                                extra={(
                                  <Switch
                                    checked={Boolean(draft.channelsConfig)}
                                    onChange={(checked) => {
                                      if (checked) {
                                        ensureChannelsConfig();
                                      } else {
                                        updateDraft({ channelsConfig: null });
                                      }
                                    }}
                                  />
                                )}
                              >
                                {draft.channelsConfig ? (
                                  <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                                    <div className="agent-detail-grid">
                                      <div className="agent-detail-prop">
                                        <span className="agent-detail-prop-label">CLI</span>
                                        <Switch
                                          checked={draft.channelsConfig.cliEnabled}
                                          onChange={(checked) => updateChannelsConfig({ cliEnabled: checked })}
                                        />
                                      </div>
                                      <div className="agent-detail-prop">
                                        <span className="agent-detail-prop-label">message_timeout_secs</span>
                                        <InputNumber
                                          min={1}
                                          value={draft.channelsConfig.messageTimeoutSecs}
                                          style={{ width: "100%" }}
                                          onChange={(value) => updateChannelsConfig({ messageTimeoutSecs: typeof value === "number" ? value : 300 })}
                                        />
                                      </div>
                                    </div>

                                    <Card type="inner" size="small" title="DingTalk">
                                      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                                        <Space size="small">
                                          <Text>启用 DingTalk</Text>
                                          <Switch
                                            checked={draft.channelsConfig.dingtalkEnabled}
                                            onChange={(checked) => updateChannelsConfig({ dingtalkEnabled: checked })}
                                          />
                                        </Space>
                                        <Input
                                          value={draft.channelsConfig.dingtalkClientId ?? ""}
                                          addonBefore="client_id"
                                          onChange={(event) => updateChannelsConfig({ dingtalkClientId: event.target.value })}
                                        />
                                        <Input.Password
                                          value={draft.channelsConfig.dingtalkClientSecret ?? ""}
                                          addonBefore="client_secret"
                                          onChange={(event) => updateChannelsConfig({ dingtalkClientSecret: event.target.value })}
                                        />
                                        <Select
                                          mode="tags"
                                          value={draft.channelsConfig.dingtalkAllowedUsers}
                                          tokenSeparators={[",", "，", "\n"]}
                                          placeholder="允许访问的 DingTalk 用户"
                                          style={{ width: "100%" }}
                                          onChange={(value) => updateChannelsConfig({ dingtalkAllowedUsers: normalizeStringValues(value) })}
                                        />
                                      </Space>
                                    </Card>

                                    <Card type="inner" size="small" title="QQ">
                                      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                                        <Space size="small">
                                          <Text>启用 QQ</Text>
                                          <Switch
                                            checked={draft.channelsConfig.qqEnabled}
                                            onChange={(checked) => updateChannelsConfig({ qqEnabled: checked })}
                                          />
                                        </Space>
                                        <Input
                                          value={draft.channelsConfig.qqAppId ?? ""}
                                          addonBefore="app_id"
                                          onChange={(event) => updateChannelsConfig({ qqAppId: event.target.value })}
                                        />
                                        <Input.Password
                                          value={draft.channelsConfig.qqAppSecret ?? ""}
                                          addonBefore="app_secret"
                                          onChange={(event) => updateChannelsConfig({ qqAppSecret: event.target.value })}
                                        />
                                        <Select
                                          mode="tags"
                                          value={draft.channelsConfig.qqAllowedUsers}
                                          tokenSeparators={[",", "，", "\n"]}
                                          placeholder="允许访问的 QQ 用户"
                                          style={{ width: "100%" }}
                                          onChange={(value) => updateChannelsConfig({ qqAllowedUsers: normalizeStringValues(value) })}
                                        />
                                      </Space>
                                    </Card>
                                  </Space>
                                ) : (
                                  <Text type="secondary">未配置渠道模板。</Text>
                                )}
                              </Card>

                              <Card
                                type="inner"
                                title="Main Agent Guidance"
                                extra={(
                                  <Switch
                                    checked={Boolean(draft.mainAgentGuidance)}
                                    onChange={(checked) => {
                                      if (checked) {
                                        ensureGuidance();
                                      } else {
                                        updateDraft({ mainAgentGuidance: null });
                                      }
                                    }}
                                  />
                                )}
                              >
                                {draft.mainAgentGuidance ? (
                                  <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                                    <Space size="small">
                                      <Text>启用 Guidance</Text>
                                      <Switch
                                        checked={draft.mainAgentGuidance.enabled !== false}
                                        onChange={(checked) => updateGuidance({ enabled: checked })}
                                      />
                                    </Space>
                                    <Input.TextArea
                                      rows={10}
                                      value={draft.mainAgentGuidance.prompt ?? ""}
                                      placeholder="创建实例时写入主 Agent Guidance"
                                      onChange={(event) => updateGuidance({ prompt: event.target.value })}
                                    />
                                  </Space>
                                ) : (
                                  <Text type="secondary">未配置 Main Agent Guidance。</Text>
                                )}
                              </Card>
                            </Space>
                          ),
                        },
                      ]}
                    />
                  </Space>
                </Card>
              </Space>
            ) : (
              <Empty description={loadingTemplates ? "正在加载模板..." : "请选择一个模板查看或编辑"} />
            )}
          </div>
        </Card>
      </Space>

      <Modal
        title="新建模板"
        open={createModalOpen}
        onCancel={() => {
          if (creating) {
            return;
          }
          setCreateModalOpen(false);
          createForm.resetFields();
        }}
        onOk={() => void handleCreateTemplate()}
        okText="创建模板"
        confirmLoading={creating}
      >
        <Form<CreateTemplateForm> form={createForm} layout="vertical">
          <Form.Item
            name="templateKey"
            label="模板 Key"
            rules={[{ required: true, message: "请输入模板 Key" }]}
          >
            <Input placeholder="script-master-standard" />
          </Form.Item>
          <Form.Item
            name="displayName"
            label="显示名称"
            rules={[{ required: true, message: "请输入显示名称" }]}
          >
            <Input placeholder="编剧大师标准模板" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
