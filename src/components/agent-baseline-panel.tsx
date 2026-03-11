"use client";

import {
  createAgentBaseline,
  deleteAgentBaseline,
  getAgentBaseline,
  listAgentBaselines,
  upsertAgentBaseline,
} from "@/lib/control-api";
import type { AgentBaseline, AgentBaselineSummary, AgentBaselineUpsertRequest } from "@/types/contracts";
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
import { Plus, RefreshCw, Trash2 } from "lucide-react";
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
    entrySkill: "",
    allowedTools: [],
    skillIds: [],
    systemPrompt: "",
    updatedBy: "",
    createdAt: now,
    updatedAt: now,
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
    entrySkill: value.entrySkill ?? "",
    allowedTools: [...value.allowedTools],
    skillIds: [...value.skillIds],
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
    entrySkill: value.entrySkill ?? null,
    allowedTools: value.allowedTools,
    skillIds: value.skillIds,
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
      const response = await getAgentBaseline(agentKey);
      setSelectedBaseline(response);
      setDraft({
        ...response,
        allowedTools: [...response.allowedTools],
        skillIds: [...response.skillIds],
      });
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
    setDraft((current) => current ? { ...current, ...patch } : current);
  }, []);

  const handleSave = useCallback(async () => {
    if (!draft) {
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      const saved = await upsertAgentBaseline(draft.agentKey, toUpsertRequest(draft));
      setSelectedBaseline(saved);
      setDraft({
        ...saved,
        allowedTools: [...saved.allowedTools],
        skillIds: [...saved.skillIds],
      });
      await loadItems(saved.agentKey);
      messageApi.success(`Agent baseline 已保存：${saved.agentKey}`);
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
      messageApi.success(`Agent baseline 已删除：${selectedAgentKey}`);
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
      const created = await createAgentBaseline(toUpsertRequest(payload));
      setCreateModalOpen(false);
      createForm.resetFields();
      await loadItems(created.agentKey);
      setSelectedAgentKey(created.agentKey);
      messageApi.success(`Agent baseline 已创建：${created.agentKey}`);
    } catch (apiError) {
      if ((apiError as { errorFields?: unknown }).errorFields) {
        return;
      }
      setError(apiError instanceof Error ? apiError.message : String(apiError));
    } finally {
      setCreating(false);
    }
  }, [createForm, loadItems, messageApi]);

  return (
    <>
      {contextHolder}
      <Card
        className="glass-card"
        title="Agents"
        extra={(
          <Space size="small" wrap>
            <Button size="small" onClick={() => void loadItems(selectedAgentKey)} loading={loading} icon={<RefreshCw size={12} />}>
              刷新 Agent baseline
            </Button>
            <Button size="small" type="primary" onClick={() => setCreateModalOpen(true)} icon={<Plus size={12} />}>
              新增 Agent
            </Button>
          </Space>
        )}
      >
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Alert
            showIcon
            type="info"
            message="当前阶段仅管理 Agent baseline 台账"
            description="这里的保存只写入数据库，不会影响现有 claw 实例运行；后续再逐步接入实例装配与启动链路。"
          />

          {error ? (
            <Alert
              showIcon
              type="error"
              message="Agent baseline 处理失败"
              description={error}
            />
          ) : null}

          {(loading && items.length === 0) ? (
            <Skeleton active paragraph={{ rows: 6 }} />
          ) : null}

          {(!loading && items.length === 0) ? (
            <Empty
              description="当前还没有 Agent baseline，可先创建一条台账记录。"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button type="primary" onClick={() => setCreateModalOpen(true)}>新增 Agent</Button>
            </Empty>
          ) : null}

          {items.length > 0 ? (
            <>
              <Text type="secondary">点击 Agent 卡片查看并维护基线配置。</Text>
              <div className="agent-selector-grid">
                {items.map((item) => {
                  const selected = selectedAgentKey === item.agentKey;
                  return (
                    <button
                      key={item.agentKey}
                      type="button"
                      className={`agent-selector-card ${selected ? "is-selected" : ""}`}
                      onClick={() => setSelectedAgentKey(item.agentKey)}
                    >
                      <div className={`agent-selector-card-icon ${item.agentic ? "is-agentic" : "is-standard"}`}>
                        {item.enabled ? "A" : "P"}
                      </div>
                      <strong className="agent-selector-card-title">{item.displayName || item.agentKey}</strong>
                      <p className="agent-selector-card-subline">{item.agentKey}</p>
                      <div className="agent-selector-card-meta">
                        <span className="agent-selector-card-chip is-model">{item.model || "-"}</span>
                        <span className={`agent-selector-card-chip ${item.agentic ? "is-agentic" : "is-neutral"}`}>
                          {typeof item.agentic === "boolean" ? (item.agentic ? "Agentic" : "Non-agentic") : item.runtime}
                        </span>
                        {!item.enabled ? <span className="agent-selector-card-chip is-neutral">Paused</span> : null}
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
                      <Tag color={draft.enabled ? "green" : "default"}>{draft.enabled ? "已启用" : "已停用"}</Tag>
                      {draft.model ? <Tag color="purple">{draft.model}</Tag> : null}
                      {draft.provider ? <Tag>{draft.provider}</Tag> : null}
                    </Space>
                  </div>
                  <Space size="small" wrap>
                    <Text type="secondary">最近更新：{formatTimestamp(selectedSummary?.updatedAt ?? draft.updatedAt)}</Text>
                    <Popconfirm
                      title="删除 Agent baseline"
                      description={`确认删除 ${draft.agentKey} 吗？此操作只影响台账，不影响现有实例。`}
                      okText="确认删除"
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
                      <span className="agent-prompt-header-title">基础信息</span>
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
                        <div className="agent-baseline-field is-wide">
                          <span className="agent-detail-prop-label">Source Ref</span>
                          <Input value={draft.sourceRef ?? ""} onChange={(event) => updateDraft({ sourceRef: event.target.value })} />
                        </div>
                        <div className="agent-baseline-field is-wide">
                          <span className="agent-detail-prop-label">Description</span>
                          <Input.TextArea rows={3} value={draft.description ?? ""} onChange={(event) => updateDraft({ description: event.target.value })} />
                        </div>
                        <div className="agent-baseline-field is-switch">
                          <span className="agent-detail-prop-label">Enabled</span>
                          <Switch checked={draft.enabled} onChange={(checked) => updateDraft({ enabled: checked })} />
                        </div>
                        <div className="agent-baseline-field">
                          <span className="agent-detail-prop-label">Updated By</span>
                          <Input
                            value={draft.updatedBy ?? ""}
                            onChange={(event) => updateDraft({ updatedBy: event.target.value })}
                            placeholder="可选，记录本次维护人"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="agent-prompt-card">
                    <div className="agent-prompt-header">
                      <span className="agent-prompt-header-title">Agent Profile</span>
                    </div>
                    <div className="agent-prompt-body is-spacious">
                      <div className="agent-baseline-fields">
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
                          <span className="agent-detail-prop-label">Entry Skill</span>
                          <Input value={draft.entrySkill ?? ""} onChange={(event) => updateDraft({ entrySkill: event.target.value })} />
                        </div>
                        <div className="agent-baseline-field is-switch">
                          <span className="agent-detail-prop-label">Agentic</span>
                          <Switch
                            checked={draft.agentic === true}
                            onChange={(checked) => updateDraft({ agentic: checked })}
                          />
                        </div>
                        <div className="agent-baseline-field is-wide">
                          <span className="agent-detail-prop-label">Allowed Tools</span>
                          <Select
                            mode="tags"
                            value={draft.allowedTools}
                            onChange={(value) => updateDraft({ allowedTools: value })}
                            style={{ width: "100%" }}
                            tokenSeparators={[",", "\n"]}
                            placeholder="录入 allowed_tools"
                          />
                        </div>
                        <div className="agent-baseline-field is-wide">
                          <span className="agent-detail-prop-label">Skill IDs</span>
                          <Select
                            mode="tags"
                            value={draft.skillIds}
                            onChange={(value) => updateDraft({ skillIds: value })}
                            style={{ width: "100%" }}
                            tokenSeparators={[",", "\n"]}
                            placeholder="录入该 Agent baseline 对应的 skill 列表"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="agent-prompt-card">
                  <div className="agent-prompt-header">
                    <span className="agent-prompt-header-title">system_prompt</span>
                  </div>
                  <div className="agent-prompt-body is-spacious">
                    <Input.TextArea
                      className="prompt-textarea prompt-textarea-agent"
                      rows={18}
                      value={draft.systemPrompt ?? ""}
                      onChange={(event) => updateDraft({ systemPrompt: event.target.value })}
                      placeholder="Agent system_prompt"
                    />
                  </div>
                </div>
              </div>
            ) : null
          ) : null}
        </Space>
      </Card>

      <Modal
        title="新增 Agent baseline"
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
              { pattern: /^[A-Za-z0-9._-]+$/, message: "仅支持字母、数字、点、下划线和中划线" },
            ]}
          >
            <Input placeholder="例如：mgc-novel-to-script" />
          </Form.Item>
          <Form.Item name="displayName" label="Display Name">
            <Input placeholder="可选，不填时默认与 Agent Key 相同" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
