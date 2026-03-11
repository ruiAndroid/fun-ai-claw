"use client";

import {
  createSkillBaseline,
  deleteSkillBaseline,
  getSkillBaseline,
  listSkillBaselines,
  upsertSkillBaseline,
} from "@/lib/control-api";
import type { SkillBaseline, SkillBaselineSummary, SkillBaselineUpsertRequest } from "@/types/contracts";
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Skeleton,
  Space,
  Switch,
  Tag,
  Typography,
  message,
} from "antd";
import { Plus, RefreshCw, Shield, Trash2, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const { Text } = Typography;

type CreateBaselineForm = {
  skillKey: string;
  displayName?: string;
};

function buildEmptyDraft(skillKey = "", displayName = ""): SkillBaseline {
  const now = new Date().toISOString();
  return {
    skillKey,
    displayName,
    description: "",
    sourceType: "MANUAL",
    sourceRef: "",
    enabled: true,
    skillMd: "",
    updatedBy: "",
    createdAt: now,
    updatedAt: now,
  };
}

function snapshotBaseline(value?: SkillBaseline | null): string {
  if (!value) {
    return "";
  }
  return JSON.stringify({
    skillKey: value.skillKey,
    displayName: value.displayName,
    description: value.description ?? "",
    sourceType: value.sourceType,
    sourceRef: value.sourceRef ?? "",
    enabled: value.enabled,
    skillMd: value.skillMd,
    updatedBy: value.updatedBy ?? "",
  });
}

function toUpsertRequest(value: SkillBaseline): SkillBaselineUpsertRequest {
  return {
    skillKey: value.skillKey,
    displayName: value.displayName,
    description: value.description ?? null,
    sourceType: value.sourceType,
    sourceRef: value.sourceRef ?? null,
    enabled: value.enabled,
    skillMd: value.skillMd,
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

export function SkillBaselinePanel() {
  const [items, setItems] = useState<SkillBaselineSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string>();
  const [selectedSkillKey, setSelectedSkillKey] = useState<string>();
  const [selectedBaseline, setSelectedBaseline] = useState<SkillBaseline>();
  const [draft, setDraft] = useState<SkillBaseline>();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm] = Form.useForm<CreateBaselineForm>();
  const [messageApi, contextHolder] = message.useMessage();

  const loadItems = useCallback(async (preferredSkillKey?: string) => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await listSkillBaselines();
      setItems(response.items);
      if (response.items.length === 0) {
        setSelectedSkillKey(undefined);
        setSelectedBaseline(undefined);
        setDraft(undefined);
        return;
      }

      const nextSelected = preferredSkillKey
        ?? (selectedSkillKey && response.items.some((item) => item.skillKey === selectedSkillKey) ? selectedSkillKey : undefined)
        ?? response.items[0]?.skillKey;

      setSelectedSkillKey(nextSelected);
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : String(apiError));
    } finally {
      setLoading(false);
    }
  }, [selectedSkillKey]);

  const loadDetail = useCallback(async (skillKey: string) => {
    setDetailLoading(true);
    setError(undefined);
    try {
      const response = await getSkillBaseline(skillKey);
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
    if (selectedSkillKey) {
      void loadDetail(selectedSkillKey);
    } else {
      setSelectedBaseline(undefined);
      setDraft(undefined);
    }
  }, [loadDetail, selectedSkillKey]);

  const dirty = useMemo(
    () => snapshotBaseline(draft) !== snapshotBaseline(selectedBaseline),
    [draft, selectedBaseline]
  );

  const selectedSummary = useMemo(
    () => items.find((item) => item.skillKey === selectedSkillKey),
    [items, selectedSkillKey]
  );

  const updateDraft = useCallback((patch: Partial<SkillBaseline>) => {
    setDraft((current) => current ? { ...current, ...patch } : current);
  }, []);

  const handleSave = useCallback(async () => {
    if (!draft) {
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      const saved = await upsertSkillBaseline(draft.skillKey, toUpsertRequest(draft));
      setSelectedBaseline(saved);
      setDraft(saved);
      await loadItems(saved.skillKey);
      messageApi.success(`Skill baseline 已保存：${saved.skillKey}`);
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : String(apiError));
    } finally {
      setSaving(false);
    }
  }, [draft, loadItems, messageApi]);

  const handleDelete = useCallback(async () => {
    if (!selectedSkillKey) {
      return;
    }
    setDeleting(true);
    setError(undefined);
    try {
      await deleteSkillBaseline(selectedSkillKey);
      messageApi.success(`Skill baseline 已删除：${selectedSkillKey}`);
      await loadItems();
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : String(apiError));
    } finally {
      setDeleting(false);
    }
  }, [loadItems, messageApi, selectedSkillKey]);

  const handleCreate = useCallback(async () => {
    try {
      const values = await createForm.validateFields();
      setCreating(true);
      setError(undefined);
      const payload = buildEmptyDraft(values.skillKey.trim(), values.displayName?.trim() || values.skillKey.trim());
      const created = await createSkillBaseline(toUpsertRequest(payload));
      setCreateModalOpen(false);
      createForm.resetFields();
      await loadItems(created.skillKey);
      setSelectedSkillKey(created.skillKey);
      messageApi.success(`Skill baseline 已创建：${created.skillKey}`);
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
        title="Skills"
        extra={(
          <Space size="small" wrap>
            <Button size="small" onClick={() => void loadItems(selectedSkillKey)} loading={loading} icon={<RefreshCw size={12} />}>
              刷新 Skill baseline
            </Button>
            <Button size="small" type="primary" onClick={() => setCreateModalOpen(true)} icon={<Plus size={12} />}>
              新增 Skill
            </Button>
          </Space>
        )}
      >
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Alert
            showIcon
            type="info"
            message="当前阶段仅管理 Skill baseline 台账"
            description="这里的保存只写入数据库，不会影响现有 claw 实例运行；后续再逐步接入实例绑定与 skill 装配链路。"
          />

          {error ? (
            <Alert
              showIcon
              type="error"
              message="Skill baseline 处理失败"
              description={error}
            />
          ) : null}

          {(loading && items.length === 0) ? (
            <Skeleton active paragraph={{ rows: 6 }} />
          ) : null}

          {(!loading && items.length === 0) ? (
            <Empty
              description="当前还没有 Skill baseline，可先创建一条台账记录。"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button type="primary" onClick={() => setCreateModalOpen(true)}>新增 Skill</Button>
            </Empty>
          ) : null}

          {items.length > 0 ? (
            <>
              <Text type="secondary">点击 Skill 卡片查看并维护基线内容。</Text>
              <div className="skill-card-grid-v2">
                {items.map((item) => {
                  const selected = selectedSkillKey === item.skillKey;
                  return (
                    <button
                      key={item.skillKey}
                      type="button"
                      className={`skill-card-v2 ${selected ? "is-selected" : ""}`}
                      onClick={() => setSelectedSkillKey(item.skillKey)}
                    >
                      <div className={`skill-card-v2-icon ${item.enabled ? "is-allowed" : "is-blocked"}`}>
                        {item.enabled ? <Zap size={18} /> : <Shield size={18} />}
                      </div>
                      <strong className="skill-card-v2-title">{item.displayName || item.skillKey}</strong>
                      <p className="skill-card-v2-path">{item.skillKey}</p>
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          {selectedSkillKey ? (
            detailLoading && !draft ? (
              <Skeleton active paragraph={{ rows: 10 }} />
            ) : draft ? (
              <div className="agent-baseline-editor">
                <div className="agent-baseline-header">
                  <div>
                    <div className="agent-baseline-title">{draft.displayName || draft.skillKey}</div>
                    <Space size={[8, 8]} wrap>
                      <Tag color="blue">{draft.skillKey}</Tag>
                      <Tag>{draft.sourceType}</Tag>
                      <Tag color={draft.enabled ? "green" : "default"}>{draft.enabled ? "已启用" : "已停用"}</Tag>
                    </Space>
                  </div>
                  <Space size="small" wrap>
                    <Text type="secondary">最近更新：{formatTimestamp(selectedSummary?.updatedAt ?? draft.updatedAt)}</Text>
                    <Popconfirm
                      title="删除 Skill baseline"
                      description={`确认删除 ${draft.skillKey} 吗？此操作只影响台账，不影响现有实例。`}
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

                <div className="agent-prompt-card">
                  <div className="agent-prompt-header">
                    <span className="agent-prompt-header-title">基础信息</span>
                  </div>
                  <div className="agent-prompt-body is-spacious">
                    <div className="agent-baseline-fields">
                      <div className="agent-baseline-field">
                        <span className="agent-detail-prop-label">Skill Key</span>
                        <Input value={draft.skillKey} disabled />
                      </div>
                      <div className="agent-baseline-field">
                        <span className="agent-detail-prop-label">Display Name</span>
                        <Input value={draft.displayName} onChange={(event) => updateDraft({ displayName: event.target.value })} />
                      </div>
                      <div className="agent-baseline-field">
                        <span className="agent-detail-prop-label">Source Type</span>
                        <Input value={draft.sourceType} onChange={(event) => updateDraft({ sourceType: event.target.value })} />
                      </div>
                      <div className="agent-baseline-field is-switch">
                        <span className="agent-detail-prop-label">Enabled</span>
                        <Switch checked={draft.enabled} onChange={(checked) => updateDraft({ enabled: checked })} />
                      </div>
                      <div className="agent-baseline-field is-wide">
                        <span className="agent-detail-prop-label">Source Ref</span>
                        <Input value={draft.sourceRef ?? ""} onChange={(event) => updateDraft({ sourceRef: event.target.value })} />
                      </div>
                      <div className="agent-baseline-field is-wide">
                        <span className="agent-detail-prop-label">Description</span>
                        <Input.TextArea rows={3} value={draft.description ?? ""} onChange={(event) => updateDraft({ description: event.target.value })} />
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
                    <span className="agent-prompt-header-title">SKILL.md</span>
                    <Text type="secondary">{draft.skillMd.split("\n").length} 行 / {draft.skillMd.length} 字符</Text>
                  </div>
                  <div className="agent-prompt-body is-spacious">
                    <Input.TextArea
                      className="prompt-textarea prompt-textarea-skill"
                      rows={20}
                      value={draft.skillMd}
                      onChange={(event) => updateDraft({ skillMd: event.target.value })}
                      placeholder="填写 Skill 对应的 SKILL.md 内容"
                    />
                  </div>
                </div>
              </div>
            ) : null
          ) : null}
        </Space>
      </Card>

      <Modal
        title="新增 Skill baseline"
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
            name="skillKey"
            label="Skill Key"
            rules={[
              { required: true, message: "请输入 Skill Key" },
              { pattern: /^[A-Za-z0-9._-]+$/, message: "仅支持字母、数字、点、下划线和中划线" },
            ]}
          >
            <Input placeholder="例如：novel-to-script-main" />
          </Form.Item>
          <Form.Item name="displayName" label="Display Name">
            <Input placeholder="可选，不填时默认与 Skill Key 相同" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
