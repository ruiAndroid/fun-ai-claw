"use client";

import {
  createInstanceTemplate,
  deleteInstanceTemplate,
  listAgentBaselines,
  listSkillBaselines,
  upsertInstanceTemplate,
} from "@/lib/control-api";
import type {
  AgentBaselineSummary,
  ImagePreset,
  InstanceTemplate,
  InstanceTemplateChannelsConfig,
  InstanceTemplateDefaultModelConfig,
  InstanceTemplateMainAgentGuidance,
  InstanceTemplateRoutingConfig,
  InstanceTemplateUpsertRequest,
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
  Tag,
  Typography,
  message,
} from "antd";
import { Layers, PlayCircle, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const { Paragraph, Text } = Typography;

type CreateTemplateForm = {
  templateKey: string;
  displayName: string;
};

function cloneTemplate(template: InstanceTemplate): InstanceTemplate {
  return JSON.parse(JSON.stringify(template)) as InstanceTemplate;
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

function normalizeStringValues(values?: string[] | null): string[] {
  if (!values || values.length === 0) {
    return [];
  }
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
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

function stringifyJson(value: unknown): string {
  if (!value) {
    return "";
  }
  return JSON.stringify(value, null, 2);
}

function parseOptionalJson<T>(text: string, label: string): T | null {
  const normalized = text.trim();
  if (!normalized) {
    return null;
  }
  try {
    return JSON.parse(normalized) as T;
  } catch {
    throw new Error(`${label} 不是合法 JSON`);
  }
}

function snapshotTemplate(template?: InstanceTemplate | null): string {
  if (!template) {
    return "";
  }
  return JSON.stringify({
    templateKey: template.templateKey,
    displayName: template.displayName,
    description: template.description ?? "",
    summary: template.summary ?? "",
    enabled: template.enabled,
    imagePresetId: template.imagePresetId,
    desiredState: template.desiredState,
    mainAgent: {
      ...template.mainAgent,
      provider: template.mainAgent.provider ?? "",
      model: template.mainAgent.model ?? "",
      temperature: template.mainAgent.temperature ?? null,
      agentic: template.mainAgent.agentic ?? null,
      systemPrompt: template.mainAgent.systemPrompt ?? "",
      allowedTools: normalizeStringValues(template.mainAgent.allowedTools),
      allowedSkills: normalizeStringValues(template.mainAgent.allowedSkills),
    },
    skillKeys: normalizeStringValues(template.skillKeys),
    lockedScopes: normalizeStringValues(template.lockedScopes),
    tags: normalizeStringValues(template.tags),
    runtimeConfigToml: template.runtimeConfigToml ?? "",
  });
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
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm] = Form.useForm<CreateTemplateForm>();
  const [channelsConfigText, setChannelsConfigText] = useState("");
  const [defaultModelConfigText, setDefaultModelConfigText] = useState("");
  const [routingConfigText, setRoutingConfigText] = useState("");
  const [mainAgentGuidanceText, setMainAgentGuidanceText] = useState("");

  useEffect(() => {
    void listAgentBaselines()
      .then((response) => setAgentBaselines(response.items))
      .catch(() => setAgentBaselines([]));
    void listSkillBaselines()
      .then((response) => setSkillBaselines(response.items))
      .catch(() => setSkillBaselines([]));
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
    setChannelsConfigText(stringifyJson(selected?.channelsConfig));
    setDefaultModelConfigText(stringifyJson(selected?.defaultModelConfig));
    setRoutingConfigText(stringifyJson(selected?.routingConfig));
    setMainAgentGuidanceText(stringifyJson(selected?.mainAgentGuidance));
  }, [selectedTemplateKey, templates]);

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.templateKey === selectedTemplateKey),
    [selectedTemplateKey, templates],
  );

  const dirty = useMemo(() => {
    if (!draft || !selectedTemplate) {
      return false;
    }
    return snapshotTemplate(draft) !== snapshotTemplate(selectedTemplate)
      || channelsConfigText !== stringifyJson(selectedTemplate.channelsConfig)
      || defaultModelConfigText !== stringifyJson(selectedTemplate.defaultModelConfig)
      || routingConfigText !== stringifyJson(selectedTemplate.routingConfig)
      || mainAgentGuidanceText !== stringifyJson(selectedTemplate.mainAgentGuidance);
  }, [channelsConfigText, defaultModelConfigText, draft, mainAgentGuidanceText, routingConfigText, selectedTemplate]);

  const imageOptions = useMemo(
    () => images.map((item) => ({ value: item.id, label: `${item.name} · ${item.image}` })),
    [images],
  );
  const agentOptions = useMemo(
    () => agentBaselines.map((item) => ({ value: item.agentKey, label: `${item.displayName} (${item.agentKey})` })),
    [agentBaselines],
  );
  const skillOptions = useMemo(() => {
    const options = new Map<string, string>();
    for (const item of skillBaselines) {
      options.set(item.skillKey, item.displayName ? `${item.displayName} (${item.skillKey})` : item.skillKey);
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
    return Array.from(options.entries()).map(([value, label]) => ({ value, label }));
  }, [draft?.mainAgent.allowedSkills, draft?.skillKeys, skillBaselines]);

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
      const request: InstanceTemplateUpsertRequest = {
        templateKey: draft.templateKey,
        displayName: draft.displayName,
        description: draft.description ?? null,
        summary: draft.summary ?? null,
        enabled: draft.enabled,
        imagePresetId: draft.imagePresetId,
        desiredState: draft.desiredState,
        mainAgent: {
          agentKey: draft.mainAgent.agentKey,
          provider: draft.mainAgent.provider ?? null,
          model: draft.mainAgent.model ?? null,
          temperature: draft.mainAgent.temperature ?? null,
          agentic: draft.mainAgent.agentic ?? null,
          systemPrompt: draft.mainAgent.systemPrompt ?? null,
          allowedTools: normalizeStringValues(draft.mainAgent.allowedTools),
          allowedSkills: normalizeStringValues(draft.mainAgent.allowedSkills),
        },
        skillKeys: normalizeStringValues(draft.skillKeys),
        lockedScopes: normalizeStringValues(draft.lockedScopes),
        tags: normalizeStringValues(draft.tags),
        runtimeConfigToml: draft.runtimeConfigToml?.trim() ? draft.runtimeConfigToml : null,
        channelsConfig: parseOptionalJson<InstanceTemplateChannelsConfig>(channelsConfigText, "渠道配置 JSON"),
        defaultModelConfig: parseOptionalJson<InstanceTemplateDefaultModelConfig>(defaultModelConfigText, "默认模型 JSON"),
        routingConfig: parseOptionalJson<InstanceTemplateRoutingConfig>(routingConfigText, "路由配置 JSON"),
        mainAgentGuidance: parseOptionalJson<InstanceTemplateMainAgentGuidance>(mainAgentGuidanceText, "Main Guidance JSON"),
        updatedBy: "ui-template-center",
      };
      const response = await upsertInstanceTemplate(draft.templateKey, request);
      setDraft(cloneTemplate(response));
      setChannelsConfigText(stringifyJson(response.channelsConfig));
      setDefaultModelConfigText(stringifyJson(response.defaultModelConfig));
      setRoutingConfigText(stringifyJson(response.routingConfig));
      setMainAgentGuidanceText(stringifyJson(response.mainAgentGuidance));
      messageApi.success("模板已保存");
      await onRefreshTemplates?.();
    } catch (apiError) {
      const messageText = apiError instanceof Error ? apiError.message : "保存模板失败";
      setError(messageText);
      messageApi.error(messageText);
    } finally {
      setSaving(false);
    }
  }, [channelsConfigText, defaultModelConfigText, draft, mainAgentGuidanceText, messageApi, onRefreshTemplates, routingConfigText]);

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
          message="模板已切换为后端持久化配置"
          description="模板中心现在直接写入后端数据库。这里修改的模板会成为实例创建时的真实来源。"
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
                    size="small"
                    hoverable
                    onClick={() => setSelectedTemplateKey(template.templateKey)}
                    style={selected ? { borderColor: "#1677ff", boxShadow: "0 0 0 1px rgba(22,119,255,0.2)" } : undefined}
                  >
                    <Space direction="vertical" size="small" style={{ width: "100%" }}>
                      <Space wrap>
                        <Text strong>{template.displayName}</Text>
                        {template.enabled ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>}
                        <Tag>{template.desiredState}</Tag>
                      </Space>
                      <Text type="secondary">{template.templateKey}</Text>
                      <Paragraph style={{ marginBottom: 0 }} ellipsis={{ rows: 2 }}>
                        {template.summary || template.description || "-"}
                      </Paragraph>
                      <Space size={[8, 8]} wrap>
                        {template.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}
                      </Space>
                      <Space wrap>
                        <Button size="small" type="primary" icon={<PlayCircle size={12} />} disabled={!template.enabled} onClick={(event) => {
                          event.stopPropagation();
                          onUseTemplate?.(template.templateKey);
                        }}>
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
                  <Space direction="vertical" size="large" style={{ width: "100%" }}>
                    <div className="agent-detail-grid">
                      <div className="agent-detail-prop">
                        <span className="agent-detail-prop-label">模板 Key</span>
                        <span className="agent-detail-prop-value">{draft.templateKey}</span>
                      </div>
                      <div className="agent-detail-prop">
                        <span className="agent-detail-prop-label">最近更新</span>
                        <span className="agent-detail-prop-value">{formatTimestamp(draft.updatedAt)}</span>
                      </div>
                    </div>

                    <Input value={draft.displayName} addonBefore="显示名称" onChange={(event) => updateDraft({ displayName: event.target.value })} />
                    <Input.TextArea rows={2} value={draft.description ?? ""} placeholder="模板描述" onChange={(event) => updateDraft({ description: event.target.value })} />
                    <Input.TextArea rows={2} value={draft.summary ?? ""} placeholder="模板摘要" onChange={(event) => updateDraft({ summary: event.target.value })} />

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

                    <Card type="inner" title="主 Agent">
                      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                        <Select
                          value={draft.mainAgent.agentKey || undefined}
                          options={agentOptions}
                          placeholder="选择主 Agent"
                          onChange={(value) => updateMainAgent({ agentKey: value })}
                        />
                        <Input value={draft.mainAgent.provider ?? ""} addonBefore="Provider" onChange={(event) => updateMainAgent({ provider: event.target.value })} />
                        <Input value={draft.mainAgent.model ?? ""} addonBefore="Model" onChange={(event) => updateMainAgent({ model: event.target.value })} />
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
                          mode="tags"
                          value={draft.mainAgent.allowedTools}
                          options={draft.mainAgent.allowedTools.map((value) => ({ value, label: value }))}
                          placeholder="allowed_tools"
                          onChange={(value) => updateMainAgent({ allowedTools: normalizeStringValues(value) })}
                        />
                        <Select
                          mode="multiple"
                          value={draft.mainAgent.allowedSkills}
                          options={skillOptions}
                          placeholder="allowed_skills"
                          onChange={(value) => updateMainAgent({ allowedSkills: normalizeStringValues(value) })}
                        />
                        <Input.TextArea
                          rows={8}
                          value={draft.mainAgent.systemPrompt ?? ""}
                          placeholder="主 Agent system prompt"
                          onChange={(event) => updateMainAgent({ systemPrompt: event.target.value })}
                        />
                      </Space>
                    </Card>

                    <Card type="inner" title="预装 Skills">
                      <Select
                        mode="multiple"
                        style={{ width: "100%" }}
                        value={draft.skillKeys}
                        options={skillOptions}
                        placeholder="预装 Skill 列表"
                        onChange={(value) => updateDraft({ skillKeys: normalizeStringValues(value) })}
                      />
                    </Card>

                    <Card type="inner" title="运行时配置">
                      <Input.TextArea
                        rows={10}
                        value={draft.runtimeConfigToml ?? ""}
                        placeholder="runtime config.toml，可留空"
                        onChange={(event) => updateDraft({ runtimeConfigToml: event.target.value })}
                      />
                    </Card>

                    <Card type="inner" title="高级配置 JSON">
                      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                        <Input.TextArea rows={6} value={channelsConfigText} placeholder="channelsConfig JSON" onChange={(event) => setChannelsConfigText(event.target.value)} />
                        <Input.TextArea rows={6} value={defaultModelConfigText} placeholder="defaultModelConfig JSON" onChange={(event) => setDefaultModelConfigText(event.target.value)} />
                        <Input.TextArea rows={8} value={routingConfigText} placeholder="routingConfig JSON" onChange={(event) => setRoutingConfigText(event.target.value)} />
                        <Input.TextArea rows={4} value={mainAgentGuidanceText} placeholder="mainAgentGuidance JSON" onChange={(event) => setMainAgentGuidanceText(event.target.value)} />
                      </Space>
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
            <Input placeholder="编剧大神AI 标准模板" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
