"use client";

import {
  createAgentBaseline,
  deleteAgentBaseline,
  getAgentToolCatalog,
  getAgentBaseline,
  listSkillBaselines,
  listAgentBaselines,
  upsertAgentBaseline,
} from "@/lib/control-api";
import {
  buildAgentToolOptions,
  emptyAgentToolCatalog,
  normalizeToolValues,
  resolveAgentAllowedTools,
} from "@/lib/agent-tool-catalog";
import type {
  AgentBaseline,
  AgentBaselineSummary,
  AgentBaselineUpsertRequest,
  AgentToolCatalog,
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
  Skeleton,
  Space,
  Switch,
  Tag,
  Typography,
  message,
} from "antd";
import { Bot, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const { Text } = Typography;

type CreateBaselineForm = {
  agentKey: string;
  displayName?: string;
};

function buildEmptyDraft(agentKey = "", displayName = ""): AgentBaseline {
  const now = new Date().toISOString();
  return {
    agentKey,
    displayName,
    description: "",
    runtime: "zeroclaw",
    sourceType: "MANUAL",
    sourceRef: "",
    enabled: true,
    provider: "",
    model: "",
    temperature: null,
    agentic: null,
    toolPresetKey: null,
    allowedToolsExtra: [],
    deniedTools: [],
    allowedTools: [],
    allowedSkills: [],
    systemPrompt: "",
    updatedBy: "",
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

function buildSkillOptions(skills: SkillBaselineSummary[], selectedValues: string[]) {
  const options = new Map<string, string>();
  for (const skill of skills.filter((item) => item.enabled)) {
    options.set(
      skill.skillKey,
      skill.displayName && skill.displayName !== skill.skillKey
        ? `${skill.displayName} (${skill.skillKey})`
        : skill.skillKey,
    );
  }
  for (const value of selectedValues) {
    if (!options.has(value)) {
      options.set(value, value);
    }
  }
  return Array.from(options.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([value, label]) => ({ value, label }));
}

function normalizeBaseline(value: AgentBaseline): AgentBaseline {
  const normalizedAllowedTools = normalizeToolValues(value.allowedTools ?? []);
  return {
    ...value,
    toolPresetKey: value.toolPresetKey ?? null,
    allowedToolsExtra: normalizeToolValues(value.allowedToolsExtra ?? normalizedAllowedTools),
    deniedTools: normalizeToolValues(value.deniedTools ?? []),
    allowedTools: normalizedAllowedTools,
    allowedSkills: normalizeStringValues(value.allowedSkills ?? []),
  };
}

function snapshotBaseline(value?: AgentBaseline | null): string {
  if (!value) {
    return "";
  }
  return JSON.stringify({
    agentKey: value.agentKey,
    displayName: value.displayName,
    description: value.description ?? "",
    runtime: value.runtime,
    sourceType: value.sourceType,
    sourceRef: value.sourceRef ?? "",
    enabled: value.enabled,
    provider: value.provider ?? "",
    model: value.model ?? "",
    temperature: value.temperature ?? null,
    agentic: value.agentic ?? null,
    toolPresetKey: value.toolPresetKey ?? null,
    allowedToolsExtra: normalizeToolValues(value.allowedToolsExtra ?? []),
    deniedTools: normalizeToolValues(value.deniedTools ?? []),
    allowedSkills: normalizeStringValues(value.allowedSkills ?? []),
    systemPrompt: value.systemPrompt ?? "",
    updatedBy: value.updatedBy ?? "",
  });
}

function toUpsertRequest(value: AgentBaseline): AgentBaselineUpsertRequest {
  return {
    agentKey: value.agentKey,
    displayName: value.displayName,
    description: value.description ?? null,
    runtime: value.runtime,
    sourceType: value.sourceType,
    sourceRef: value.sourceRef ?? null,
    enabled: value.enabled,
    provider: value.provider ?? null,
    model: value.model ?? null,
    temperature: value.temperature ?? null,
    agentic: value.agentic ?? null,
    toolPresetKey: value.toolPresetKey ?? null,
    allowedToolsExtra: normalizeToolValues(value.allowedToolsExtra ?? []),
    deniedTools: normalizeToolValues(value.deniedTools ?? []),
    allowedSkills: normalizeStringValues(value.allowedSkills ?? []),
    systemPrompt: value.systemPrompt ?? null,
    updatedBy: value.updatedBy ?? null,
  };
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

export function AgentBaselinePanel() {
  const [items, setItems] = useState<AgentBaselineSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string>();
  const [selectedAgentKey, setSelectedAgentKey] = useState<string>();
  const [selectedBaseline, setSelectedBaseline] = useState<AgentBaseline>();
  const [draft, setDraft] = useState<AgentBaseline>();
  const [toolCatalog, setToolCatalog] = useState<AgentToolCatalog>(emptyAgentToolCatalog());
  const [skillBaselines, setSkillBaselines] = useState<SkillBaselineSummary[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm] = Form.useForm<CreateBaselineForm>();
  const [messageApi, contextHolder] = message.useMessage();

  const loadItems = useCallback(async (preferredAgentKey?: string) => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await listAgentBaselines();
      setItems(response.items);
      if (response.items.length === 0) {
        setSelectedAgentKey(undefined);
        setSelectedBaseline(undefined);
        setDraft(undefined);
        return;
      }

      const nextSelected = preferredAgentKey
        ?? (selectedAgentKey && response.items.some((item) => item.agentKey === selectedAgentKey) ? selectedAgentKey : undefined)
        ?? response.items[0]?.agentKey;

      setSelectedAgentKey(nextSelected);
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : String(apiError));
    } finally {
      setLoading(false);
    }
  }, [selectedAgentKey]);

  const loadDetail = useCallback(async (agentKey: string) => {
    setDetailLoading(true);
    setError(undefined);
    try {
      const response = normalizeBaseline(await getAgentBaseline(agentKey));
      setSelectedBaseline(response);
      setDraft(response);
    } catch (apiError) {
      setSelectedBaseline(undefined);
      setDraft(undefined);
      setError(apiError instanceof Error ? apiError.message : String(apiError));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    void getAgentToolCatalog()
      .then((response) => setToolCatalog(response))
      .catch(() => setToolCatalog(emptyAgentToolCatalog()));
  }, []);

  useEffect(() => {
    void listSkillBaselines()
      .then((response) => setSkillBaselines(response.items))
      .catch(() => setSkillBaselines([]));
  }, []);

  useEffect(() => {
    if (selectedAgentKey) {
      void loadDetail(selectedAgentKey);
    } else {
      setSelectedBaseline(undefined);
      setDraft(undefined);
    }
  }, [loadDetail, selectedAgentKey]);

  const dirty = useMemo(
    () => snapshotBaseline(draft) !== snapshotBaseline(selectedBaseline),
    [draft, selectedBaseline]
  );

  const selectedSummary = useMemo(
    () => items.find((item) => item.agentKey === selectedAgentKey),
    [items, selectedAgentKey]
  );

  const updateDraft = useCallback((patch: Partial<AgentBaseline>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const effectiveAllowedTools = useMemo(() => {
    if (!draft) {
      return [];
    }
    if (toolCatalog.presets.length === 0) {
      return normalizeToolValues(draft.allowedTools ?? []);
    }
    return resolveAgentAllowedTools(
      draft.toolPresetKey,
      draft.allowedToolsExtra,
      draft.deniedTools,
      toolCatalog.presets,
    );
  }, [draft, toolCatalog.presets]);

  const selectedPreset = useMemo(
    () => toolCatalog.presets.find((preset) => preset.key === draft?.toolPresetKey),
    [draft?.toolPresetKey, toolCatalog.presets],
  );

  const presetOptions = useMemo(
    () => toolCatalog.presets.map((preset) => ({
      value: preset.key,
      label: `${preset.displayName} (${preset.key})`,
    })),
    [toolCatalog.presets],
  );

  const runtimeToolOptions = useMemo(() => {
    return buildAgentToolOptions(toolCatalog.tools, [
      ...(draft?.allowedToolsExtra ?? []),
      ...(draft?.deniedTools ?? []),
      ...effectiveAllowedTools,
    ]);
  }, [draft?.allowedToolsExtra, draft?.deniedTools, effectiveAllowedTools, toolCatalog.tools]);
  const allowedSkillOptions = useMemo(() => {
    return buildSkillOptions(skillBaselines, draft?.allowedSkills ?? []);
  }, [draft?.allowedSkills, skillBaselines]);

  const handleSave = useCallback(async () => {
    if (!draft) {
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      const saved = normalizeBaseline(await upsertAgentBaseline(draft.agentKey, toUpsertRequest(draft)));
      setSelectedBaseline(saved);
      setDraft(saved);
      await loadItems(saved.agentKey);
      messageApi.success(`Agent baseline saved: ${saved.agentKey}`);
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : String(apiError));
    } finally {
      setSaving(false);
    }
  }, [draft, loadItems, messageApi]);

  const handleDelete = useCallback(async () => {
    if (!selectedAgentKey) {
      return;
    }
    setDeleting(true);
    setError(undefined);
    try {
      await deleteAgentBaseline(selectedAgentKey);
      messageApi.success(`Agent baseline deleted: ${selectedAgentKey}`);
      await loadItems();
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : String(apiError));
    } finally {
      setDeleting(false);
    }
  }, [loadItems, messageApi, selectedAgentKey]);

  const handleCreate = useCallback(async () => {
    try {
      const values = await createForm.validateFields();
      setCreating(true);
      setError(undefined);
      const payload = buildEmptyDraft(values.agentKey.trim(), values.displayName?.trim() || values.agentKey.trim());
      const created = normalizeBaseline(await createAgentBaseline(toUpsertRequest(payload)));
      setCreateModalOpen(false);
      createForm.resetFields();
      await loadItems(created.agentKey);
      setSelectedAgentKey(created.agentKey);
      messageApi.success(`Agent baseline created: ${created.agentKey}`);
    } catch (apiError) {
      if ((apiError as { errorFields?: unknown }).errorFields) {
        return;
      }
      setError(apiError instanceof Error ? apiError.message : String(apiError));
    } finally {
      setCreating(false);
    }
  }, [createForm, loadItems, messageApi]);

  const systemPrompt = draft?.systemPrompt ?? "";

  return (
    <>
      {contextHolder}
      <Card
        className="glass-card"
        title="Agents"
        extra={(
          <Space size="small" wrap>
            <Button size="small" onClick={() => void loadItems(selectedAgentKey)} loading={loading} icon={<RefreshCw size={12} />}>
              刷新
            </Button>
            <Button size="small" type="primary" onClick={() => setCreateModalOpen(true)} icon={<Plus size={12} />}>
              新建 Agent
            </Button>
          </Space>
        )}
      >
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          {error ? (
            <Alert
              showIcon
              type="error"
              message="Agent 台账请求失败"
              description={error}
            />
          ) : null}

          {(loading && items.length === 0) ? (
            <Skeleton active paragraph={{ rows: 6 }} />
          ) : null}

          {(!loading && items.length === 0) ? (
            <Empty
              description="暂无 Agent 台账，请先创建。"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button type="primary" onClick={() => setCreateModalOpen(true)}>新建 Agent</Button>
            </Empty>
          ) : null}

          {items.length > 0 ? (
            <>
              <Text type="secondary">选择一个 Agent 台账查看或编辑。</Text>
              <div className="agent-selector-grid">
                {items.map((item) => {
                  const selected = selectedAgentKey === item.agentKey;
                  const statusLabel = item.enabled ? "已启用" : "已禁用";
                  return (
                    <button
                      key={item.agentKey}
                      type="button"
                      className={`agent-selector-card ${selected ? "is-selected" : ""}`}
                      onClick={() => setSelectedAgentKey(item.agentKey)}
                    >
                      <div className={`agent-selector-card-icon ${item.agentic ? "is-agentic" : "is-standard"}`}>
                        <Bot size={18} />
                      </div>
                      <strong className="agent-selector-card-title">{item.displayName || item.agentKey}</strong>
                      <p className="agent-selector-card-subline">{item.agentKey}</p>
                      <div className="agent-selector-card-meta">
                        <span className="agent-selector-card-chip is-neutral">{item.runtime}</span>
                        <span className={`agent-selector-card-chip ${item.enabled ? "is-agentic" : "is-neutral"}`}>{statusLabel}</span>
                        {item.model ? <span className="agent-selector-card-chip is-model">{item.model}</span> : null}
                        {item.provider ? <span className="agent-selector-card-chip is-neutral">{item.provider}</span> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          {selectedAgentKey ? (
            detailLoading && !draft ? (
              <Skeleton active paragraph={{ rows: 10 }} />
            ) : draft ? (
              <div className="agent-baseline-editor">
                <div className="agent-baseline-header">
                  <div>
                    <div className="agent-baseline-title">{draft.displayName || draft.agentKey}</div>
                    <Space size={[8, 8]} wrap>
                      <Tag color="blue">{draft.agentKey}</Tag>
                      <Tag>{draft.runtime}</Tag>
                      <Tag color={draft.enabled ? "green" : "default"}>{draft.enabled ? "已启用" : "已禁用"}</Tag>
                      {draft.model ? <Tag color="purple">{draft.model}</Tag> : null}
                      {draft.provider ? <Tag>{draft.provider}</Tag> : null}
                      {draft.temperature != null ? <Tag>{`temp ${draft.temperature}`}</Tag> : null}
                      {draft.agentic === true ? <Tag color="gold">agentic</Tag> : null}
                    </Space>
                  </div>
                  <Space size="small" wrap>
                    <Text type="secondary">{`更新于 ${formatTimestamp(selectedSummary?.updatedAt ?? draft.updatedAt)}`}</Text>
                    <Popconfirm
                      title="确定删除该 Agent 台账？"
                      description={`此操作将从台账中移除 ${draft.agentKey}。`}
                      okText="删除"
                      cancelText="取消"
                      onConfirm={() => void handleDelete()}
                    >
                      <Button danger loading={deleting} icon={<Trash2 size={12} />}>
                        删除
                      </Button>
                    </Popconfirm>
                    <Button type="primary" loading={saving} disabled={!dirty} onClick={() => void handleSave()}>
                      保存
                    </Button>
                  </Space>
                </div>

                <div className="agent-baseline-grid">
                  <div className="agent-prompt-card">
                    <div className="agent-prompt-header">
                      <span className="agent-prompt-header-title">基本信息</span>
                    </div>
                    <div className="agent-prompt-body is-spacious">
                      <div className="agent-baseline-fields">
                        <div className="agent-baseline-field">
                          <span className="agent-detail-prop-label">Agent Key</span>
                          <Input value={draft.agentKey} disabled />
                        </div>
                        <div className="agent-baseline-field">
                          <span className="agent-detail-prop-label">Display Name</span>
                          <Input value={draft.displayName} onChange={(event) => updateDraft({ displayName: event.target.value })} />
                        </div>
                        <div className="agent-baseline-field">
                          <span className="agent-detail-prop-label">Runtime</span>
                          <Input value={draft.runtime} onChange={(event) => updateDraft({ runtime: event.target.value })} />
                        </div>
                        <div className="agent-baseline-field">
                          <span className="agent-detail-prop-label">Source Type</span>
                          <Input value={draft.sourceType} onChange={(event) => updateDraft({ sourceType: event.target.value })} />
                        </div>
                        <div className="agent-baseline-field is-switch">
                          <span className="agent-detail-prop-label">Enabled</span>
                          <Switch checked={draft.enabled} onChange={(checked) => updateDraft({ enabled: checked })} />
                        </div>
                        <div className="agent-baseline-field is-switch">
                          <span className="agent-detail-prop-label">Agentic</span>
                          <Switch
                            checked={draft.agentic === true}
                            onChange={(checked) => updateDraft({ agentic: checked })}
                          />
                        </div>
                        {draft.agentic === true ? (
                          <div className="agent-baseline-field is-wide">
                            <span className="agent-detail-prop-label">Tool Preset</span>
                            <Select
                              allowClear
                              placeholder="Select a preset or leave empty for custom"
                              options={presetOptions}
                              style={{ width: "100%" }}
                              value={draft.toolPresetKey ?? undefined}
                              onChange={(value) => updateDraft({ toolPresetKey: value ?? null })}
                            />
                            <Text type="secondary">
                              {selectedPreset?.description ?? "Final allowed_tools = preset + extra - denied."}
                            </Text>
                          </div>
                        ) : null}
                        {draft.agentic === true ? (
                          <div className="agent-baseline-field is-wide">
                            <span className="agent-detail-prop-label">Extra Tools</span>
                            <Select
                              mode="tags"
                              allowClear
                              placeholder="Add runtime tools beyond the preset"
                              options={runtimeToolOptions}
                              style={{ width: "100%" }}
                              value={draft.allowedToolsExtra ?? []}
                              onChange={(value) => updateDraft({ allowedToolsExtra: value })}
                            />
                          </div>
                        ) : null}
                        {draft.agentic === true ? (
                          <div className="agent-baseline-field is-wide">
                            <span className="agent-detail-prop-label">Denied Tools</span>
                            <Select
                              mode="tags"
                              allowClear
                              placeholder="Remove runtime tools from preset or extra list"
                              options={runtimeToolOptions}
                              style={{ width: "100%" }}
                              value={draft.deniedTools ?? []}
                              onChange={(value) => updateDraft({ deniedTools: value })}
                            />
                          </div>
                        ) : null}
                        {draft.agentic === true ? (
                          <div className="agent-baseline-field is-wide">
                            <span className="agent-detail-prop-label">Resolved allowed_tools</span>
                            <Space size={[6, 6]} wrap>
                              {effectiveAllowedTools.length > 0
                                ? effectiveAllowedTools.map((tool) => <Tag key={tool}>{tool}</Tag>)
                                : <Text type="secondary">No runtime tools enabled.</Text>}
                            </Space>
                          </div>
                        ) : null}
                        <div className="agent-baseline-field is-wide">
                          <span className="agent-detail-prop-label">allowed_skills</span>
                          <Select
                            mode="multiple"
                            allowClear
                            placeholder="Leave empty to allow all mounted skills"
                            options={allowedSkillOptions}
                            style={{ width: "100%" }}
                            value={draft.allowedSkills ?? []}
                            onChange={(value) => updateDraft({ allowedSkills: normalizeStringValues(value) })}
                          />
                          <Text type="secondary">
                            Leave empty for unrestricted skill visibility; otherwise only listed skill keys stay visible to this agent.
                          </Text>
                        </div>
                        <div className="agent-baseline-field">
                          <span className="agent-detail-prop-label">Provider</span>
                          <Input value={draft.provider ?? ""} onChange={(event) => updateDraft({ provider: event.target.value })} />
                        </div>
                        <div className="agent-baseline-field">
                          <span className="agent-detail-prop-label">Model</span>
                          <Input value={draft.model ?? ""} onChange={(event) => updateDraft({ model: event.target.value })} />
                        </div>
                        <div className="agent-baseline-field">
                          <span className="agent-detail-prop-label">Temperature</span>
                          <InputNumber
                            style={{ width: "100%" }}
                            min={0}
                            max={2}
                            step={0.1}
                            value={draft.temperature ?? null}
                            onChange={(value) => updateDraft({ temperature: typeof value === "number" ? value : null })}
                          />
                        </div>
                        <div className="agent-baseline-field">
                          <span className="agent-detail-prop-label">Updated By</span>
                          <Input value={draft.updatedBy ?? ""} onChange={(event) => updateDraft({ updatedBy: event.target.value })} />
                        </div>
                        <div className="agent-baseline-field is-wide">
                          <span className="agent-detail-prop-label">Source Ref</span>
                          <Input value={draft.sourceRef ?? ""} onChange={(event) => updateDraft({ sourceRef: event.target.value })} />
                        </div>
                        <div className="agent-baseline-field is-wide">
                          <span className="agent-detail-prop-label">Description</span>
                          <Input.TextArea
                            rows={3}
                            value={draft.description ?? ""}
                            onChange={(event) => updateDraft({ description: event.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="agent-prompt-card">
                    <div className="agent-prompt-header">
                      <span className="agent-prompt-header-title">system_prompt</span>
                      <Text type="secondary">{`${systemPrompt.split("\n").length} lines / ${systemPrompt.length} chars`}</Text>
                    </div>
                    <div className="agent-prompt-body is-spacious">
                      <Input.TextArea
                        className="prompt-textarea prompt-textarea-system"
                        rows={24}
                        value={systemPrompt}
                        onChange={(event) => updateDraft({ systemPrompt: event.target.value })}
                        placeholder="在此粘贴 agent system_prompt"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : null
          ) : null}
        </Space>
      </Card>

      <Modal
        title="新建 Agent 台账"
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false);
          createForm.resetFields();
        }}
        onOk={() => void handleCreate()}
        okText="创建"
        confirmLoading={creating}
      >
        <Form<CreateBaselineForm> form={createForm} layout="vertical">
          <Form.Item
            name="agentKey"
            label="Agent Key"
            rules={[
              { required: true, message: "请输入 Agent Key" },
              { pattern: /^[A-Za-z0-9._-]+$/, message: "仅允许字母、数字、点、下划线和连字符" },
            ]}
          >
            <Input placeholder="例如：mgc-novel-to-script" />
          </Form.Item>
          <Form.Item name="displayName" label="Display Name">
            <Input placeholder="选填，默认使用 Agent Key" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
