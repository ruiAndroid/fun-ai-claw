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
    allowedTools: [],
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
    allowedTools: [...value.allowedTools],
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
    allowedTools: value.allowedTools,
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
      });
      await loadItems(saved.agentKey);
      messageApi.success(`Agent baseline 閻庤鐡曞鎾舵崲濮樻墎鍋撳☉娆欏叕缂?{saved.agentKey}`);
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
      messageApi.success(`Agent baseline 閻庣懓鎲¤ぐ鍐垂瑜版帗鈷旈柕鍫濈箳缁?{selectedAgentKey}`);
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
      messageApi.success(`Agent baseline 閻庣懓鎲¤ぐ鍐垂閸楃儐鍤堥柣姘嚟缁?{created.agentKey}`);
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
              闂佸憡甯￠弨閬嶅蓟?Agent baseline
            </Button>
            <Button size="small" type="primary" onClick={() => setCreateModalOpen(true)} icon={<Plus size={12} />}>
              闂佸搫鍊瑰姗€路?Agent
            </Button>
          </Space>
        )}
      >
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          {error ? (
            <Alert
              showIcon
              type="error"
              message="Agent baseline 婵犮垼娉涚€氼噣骞冩繝鍐ㄧ窞閺夊牜鍋夎"
              description={error}
            />
          ) : null}

          {(loading && items.length === 0) ? (
            <Skeleton active paragraph={{ rows: 6 }} />
          ) : null}

          {(!loading && items.length === 0) ? (
            <Empty
              description={"No Agent baseline yet. Create one to get started."}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button type="primary" onClick={() => setCreateModalOpen(true)}>Create Agent</Button>
            </Empty>
          ) : null}

          {items.length > 0 ? (
            <>
              <Text type="secondary">Select an Agent baseline to view or edit.</Text>
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
                      <Tag color={draft.enabled ? "green" : "default"}>{draft.enabled ? "閻庣懓鎲¤ぐ鍐箚鎼淬劍鍋? : "閻庣懓鎲¤ぐ鍐╃閻樼粯鍋?}</Tag>
                      {draft.model ? <Tag color="purple">{draft.model}</Tag> : null}
                      {draft.provider ? <Tag>{draft.provider}</Tag> : null}
                    </Space>
                  </div>
                  <Space size="small" wrap>
                    <Text type="secondary">闂佸搫鐗冮崑鎾诲级閳哄倸鐏︽繛鎻掓健瀵剛鏁鍓х崶{formatTimestamp(selectedSummary?.updatedAt ?? draft.updatedAt)}</Text>
                    <Popconfirm
                      title="闂佸憡甯炴繛鈧繛?Agent baseline"
                      description={`缂佺虎鍙庨崰娑㈩敇婵犳艾绀嗛柣妯肩帛閻?${draft.agentKey} 闂佸憡纰嶉〃鎰闂堟侗娼伴柕鍫濇閹瑥霉閿濆棛鐭婄憸鎶婂棎浜归柛妤冨仦閹瑩鏌涘▎鎰€滃璺哄閺佸秶浠﹂懖鈺冩喒閻熸粍婢樺畷顒勫箹閻戣姤鍋濋柣妤€鐗婄粻鎺楁倵閸︻厼浠掔紒韬插劦婵″瓨绌卞?
                      okText="缂佺虎鍙庨崰娑㈩敇婵犳艾绀嗛柣妯肩帛閻?
                      cancelText="闂佸憡鐟﹂悧妤冪矓?
                      onConfirm={() => void handleDelete()}
                    >
                      <Button danger loading={deleting} icon={<Trash2 size={12} />}>
                        闂佸憡甯炴繛鈧繛?
                      </Button>
                    </Popconfirm>
                    <Button type="primary" loading={saving} disabled={!dirty} onClick={() => void handleSave()}>
                      婵烇絽娲︾换鍌炴偤?
                    </Button>
                  </Space>
                </div>

                <div className="agent-baseline-grid">
                  <div className="agent-prompt-card">
                    <div className="agent-prompt-header">
                      <span className="agent-prompt-header-title">闂佺硶鏅炲▍锝夈€侀崨顔锯攳闁斥晛鍟╃槐?/span>
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
                            placeholder="闂佸憡鐟崹鍫曞焵椤掆偓椤р偓缂佽鲸绻勯幏瀣级鐠恒劎协闂佸搫鐗滈崜姘额敃閼测晝纾奸悗娑櫭婵?
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
                            placeholder="閻熸粎澧楀ú鏍矗?allowed_tools"
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
        title="闂佸搫鍊瑰姗€路?Agent baseline"
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false);
          createForm.resetFields();
        }}
        onOk={() => void handleCreate()}
        okText="闂佸憡甯楃粙鎴犵磽?
        confirmLoading={creating}
      >
        <Form<CreateBaselineForm> form={createForm} layout="vertical">
          <Form.Item
            name="agentKey"
            label="Agent Key"
            rules={[
              { required: true, message: "闁荤姴娲ㄩ弻澶屾椤撱垹绀?Agent Key" },
              { pattern: /^[A-Za-z0-9._-]+$/, message: "婵炲濮撮幊蹇涘极椤曗偓楠炴劖鎷呴崫銉︽喕濠殿噯绲界粔鏌ュ焵椤戣法鍔嶉柡鍡欏枔閳ь剚绋掗妵婊堝焵椤戣儻鍏岄柛瀣剁秮婵″瓨鎷呮搴ｆ啴闂佸憡甯楃敮鐐哄吹鎼淬劌妞介悘鐐跺閸橆剟鏌涢幒鎾崇闁? },
            ]}
          >
            <Input placeholder="婵炴挻鑹鹃鍛淬€呰閺佸秴顫㈤悽鐢?novel-to-script" />
          </Form.Item>
          <Form.Item name="displayName" label="Display Name">
            <Input placeholder="闂佸憡鐟崹鍫曞焵椤掆偓椤р偓缂佽鲸绻冪粙澶婎吋閸滃啰绋忛梺鍝勫暙閻栬偐鍒掗婊勫闁靛牆瀚悷?Agent Key 闂佺儵鏅濋…鍫ュ箖? />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
