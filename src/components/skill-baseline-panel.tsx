"use client";

import {
  deleteSkillBaseline,
  getSkillBaseline,
  listSkillBaselines,
  uploadSkillBaselinePackage,
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
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

const { Text } = Typography;

type CreateBaselineForm = {
  skillKey: string;
  displayName?: string;
};

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

function formatFileSize(value: number): string {
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function SkillBaselinePanel() {
  const [items, setItems] = useState<SkillBaselineSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string>();
  const [selectedSkillKey, setSelectedSkillKey] = useState<string>();
  const [selectedBaseline, setSelectedBaseline] = useState<SkillBaseline>();
  const [draft, setDraft] = useState<SkillBaseline>();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createPackageFile, setCreatePackageFile] = useState<File>();
  const [createForm] = Form.useForm<CreateBaselineForm>();
  const [messageApi, contextHolder] = message.useMessage();
  const createFileInputRef = useRef<HTMLInputElement>(null);
  const createSkillKeyValue = Form.useWatch("skillKey", createForm);

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
    [draft, selectedBaseline],
  );

  const selectedSummary = useMemo(
    () => items.find((item) => item.skillKey === selectedSkillKey),
    [items, selectedSkillKey],
  );

  const createPackageTarget = useMemo(() => {
    const normalizedSkillKey = (createSkillKeyValue ?? "").trim();
    return normalizedSkillKey || "<skillKey>";
  }, [createSkillKeyValue]);

  const updateDraft = useCallback((patch: Partial<SkillBaseline>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const clearCreatePackageFile = useCallback(() => {
    setCreatePackageFile(undefined);
    if (createFileInputRef.current) {
      createFileInputRef.current.value = "";
    }
  }, []);

  const openCreatePackagePicker = useCallback(() => {
    if (createFileInputRef.current) {
      createFileInputRef.current.value = "";
      createFileInputRef.current.click();
    }
  }, []);

  const handleCreatePackageSelected = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0];
    if (!nextFile) {
      return;
    }
    if (!nextFile.name.toLowerCase().endsWith(".zip")) {
      messageApi.error("请选择 ZIP 格式的 Skill 包");
      event.target.value = "";
      return;
    }
    setCreatePackageFile(nextFile);
  }, [messageApi]);

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
      messageApi.success("Skill baseline 已保存");
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : String(apiError));
      messageApi.error("保存 Skill baseline 失败");
    } finally {
      setSaving(false);
    }
  }, [draft, loadItems, messageApi]);

  const handleDelete = useCallback(async () => {
    if (!draft) {
      return;
    }
    setDeleting(true);
    setError(undefined);
    try {
      await deleteSkillBaseline(draft.skillKey);
      messageApi.success("Skill baseline 已删除");
      await loadItems();
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : String(apiError));
      messageApi.error("删除 Skill baseline 失败");
    } finally {
      setDeleting(false);
    }
  }, [draft, loadItems, messageApi]);

  const handleCreate = useCallback(async () => {
    try {
      const values = await createForm.validateFields();
      if (!createPackageFile) {
        messageApi.error("请先选择 Skill ZIP 文件");
        return;
      }
      const normalizedSkillKey = values.skillKey.trim();
      const normalizedDisplayName = (values.displayName ?? "").trim();
      setCreating(true);
      setError(undefined);
      const created = await uploadSkillBaselinePackage({
        skillKey: normalizedSkillKey,
        displayName: normalizedDisplayName || undefined,
        file: createPackageFile,
      });
      setCreateModalOpen(false);
      createForm.resetFields();
      clearCreatePackageFile();
      setSelectedSkillKey(created.skillKey);
      setSelectedBaseline(created);
      setDraft(created);
      await loadItems(created.skillKey);
      messageApi.success("Skill baseline 已创建");
    } catch (apiError) {
      if ((apiError as { errorFields?: unknown[] })?.errorFields) {
        return;
      }
      setError(apiError instanceof Error ? apiError.message : String(apiError));
      messageApi.error("创建 Skill baseline 失败");
    } finally {
      setCreating(false);
    }
  }, [clearCreatePackageFile, createForm, createPackageFile, loadItems, messageApi]);

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
              description="当前还没有 Skill baseline，可先创建一条记录。"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button type="primary" onClick={() => setCreateModalOpen(true)}>新增 Skill</Button>
            </Empty>
          ) : null}

          {items.length > 0 ? (
            <>
              <Text type="secondary">点击 Skill 卡片查看并维护服务器 skill 包引用。</Text>
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
                      description={`确认删除 ${draft.skillKey} 吗？这会影响后续实例装载。`}
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
                        <Input value={draft.sourceType} disabled />
                      </div>
                      <div className="agent-baseline-field is-switch">
                        <span className="agent-detail-prop-label">Enabled</span>
                        <Switch checked={draft.enabled} onChange={(checked) => updateDraft({ enabled: checked })} />
                      </div>
                      <div className="agent-baseline-field is-wide">
                        <span className="agent-detail-prop-label">Source Ref</span>
                        <Input
                          value={draft.sourceRef ?? ""}
                          disabled
                          placeholder="由上传时的 skillKey 自动生成"
                        />
                      </div>
                      <div className="agent-baseline-field is-wide">
                        <span className="agent-detail-prop-label">Description</span>
                        <Input.TextArea
                          rows={3}
                          value={draft.description ?? ""}
                          onChange={(event) => updateDraft({ description: event.target.value })}
                        />
                      </div>
                      <div className="agent-baseline-field">
                        <span className="agent-detail-prop-label">Updated By</span>
                        <Input
                          value={draft.updatedBy ?? ""}
                          onChange={(event) => updateDraft({ updatedBy: event.target.value })}
                          placeholder="可选，用于记录本次维护人"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="agent-prompt-card">
                  <div className="agent-prompt-header">
                    <span className="agent-prompt-header-title">Skill Package</span>
                    <Text type="secondary">{draft.sourceRef || "未配置 sourceRef"}</Text>
                  </div>
                  <div className="agent-prompt-body is-spacious">
                    <Space direction="vertical" size={6}>
                      <Text>Skill baseline 现在只记录服务器上的 skill 包引用，不再直接存储 `SKILL.md` 内容。</Text>
                      <Text type="secondary">服务端会把 `sourceRef` 解析为服务器技能根目录下的包路径，并将整个目录同步到运行时。</Text>
                      <Text type="secondary">请确保对应目录下至少存在 `SKILL.md`，并且目录结构可直接作为 Codex skill 包使用。</Text>
                    </Space>
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
          clearCreatePackageFile();
        }}
        onOk={() => void handleCreate()}
        okText="创建"
        confirmLoading={creating}
        width={560}
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
            <Input placeholder="例如 screenplay-writer" />
          </Form.Item>
          <Form.Item name="displayName" label="Display Name">
            <Input placeholder="可选，不填时默认与 Skill Key 相同；需全局唯一" />
          </Form.Item>
          <Form.Item label="Skill ZIP">
            <div className={`skill-package-upload-card ${createPackageFile ? "is-selected" : ""}`}>
              <input
                ref={createFileInputRef}
                type="file"
                accept=".zip,application/zip"
                className="skill-package-upload-input"
                onChange={handleCreatePackageSelected}
              />
              <div className="skill-package-upload-main">
                <div className="skill-package-upload-badge">ZIP</div>
                <div className="skill-package-upload-copy">
                  <div
                    className="skill-package-upload-title"
                    title={createPackageFile?.name ?? "上传完整的 Skill ZIP 包"}
                  >
                    {createPackageFile?.name ?? "上传完整的 Skill ZIP 包"}
                  </div>
                  <div className="skill-package-upload-meta">
                    {createPackageFile
                      ? `已选择 · ${formatFileSize(createPackageFile.size)}`
                      : "支持包含 SKILL.md、references、assets 等资源的整包 ZIP"}
                  </div>
                </div>
              </div>
              <Space size="small" wrap>
                <Button onClick={openCreatePackagePicker}>
                  {createPackageFile ? "重新选择" : "选择 ZIP"}
                </Button>
                {createPackageFile ? (
                  <Button type="text" onClick={clearCreatePackageFile}>
                    清空
                  </Button>
                ) : null}
              </Space>
            </div>
            <div className="skill-package-upload-summary">
              <Text strong>解压目标</Text>
              <Text code>{`/opt/fun-ai-claw/skills/${createPackageTarget}`}</Text>
              <Text type="secondary">上传完成后会自动写入 `sourceRef={createPackageTarget}`。</Text>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
