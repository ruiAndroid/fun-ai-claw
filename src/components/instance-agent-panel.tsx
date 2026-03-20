"use client";

import { uiText } from "@/constants/ui-text";
import {
  getAgentToolCatalog,
  getAgentBaseline,
  listAgentBaselines,
  listInstanceAgentBindings,
  listInstanceSkillBindings,
  uninstallInstanceAgentBinding,
  upsertInstanceAgentBinding,
} from "@/lib/control-api";
import { buildAgentToolOptions, emptyAgentToolCatalog } from "@/lib/agent-tool-catalog";
import type {
  AgentBaseline,
  AgentBaselineSummary,
  AgentToolCatalog,
  InstanceAgentBinding,
  InstanceSkillBinding,
} from "@/types/contracts";
import { Alert, Button, Empty, Input, InputNumber, Modal, Select, Space, Switch, Tag, Typography, message } from "antd";
import { motion } from "framer-motion";
import { Bot, Download, Eye, RefreshCw, Save, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const { Text } = Typography;

type AgentDraft = {
  provider: string;
  model: string;
  temperature: number | null;
  agentic: boolean;
  systemPrompt: string;
  allowedTools: string[];
  allowedSkills: string[];
};

function normalizeStringValues(values?: string[] | null): string[] {
  if (!values || values.length === 0) {
    return [];
  }
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function buildSkillOptions(bindings: InstanceSkillBinding[], selectedValues: string[]) {
  const options = new Map<string, string>();
  for (const binding of bindings) {
    options.set(
      binding.skillKey,
      binding.displayName && binding.displayName !== binding.skillKey
        ? `${binding.displayName} (${binding.skillKey})`
        : binding.skillKey,
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

function toDraft(binding: InstanceAgentBinding): AgentDraft {
  return {
    provider: binding.provider ?? "",
    model: binding.model ?? "",
    temperature: binding.temperature ?? null,
    agentic: binding.agentic === true,
    systemPrompt: binding.systemPrompt ?? "",
    allowedTools: normalizeStringValues(binding.allowedTools),
    allowedSkills: normalizeStringValues(binding.allowedSkills),
  };
}

function snapshotDraft(value: AgentDraft | undefined): string {
  if (!value) {
    return "";
  }
  return JSON.stringify({
    provider: value.provider,
    model: value.model,
    temperature: value.temperature,
    agentic: value.agentic,
    systemPrompt: value.systemPrompt,
    allowedTools: normalizeStringValues(value.allowedTools),
    allowedSkills: normalizeStringValues(value.allowedSkills),
  });
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

type InstanceAgentPanelProps = {
  instanceId: string;
  onInstalledAgentsChange?: (bindings: InstanceAgentBinding[]) => void;
  onSaved?: () => void | Promise<void>;
  readOnly?: boolean;
  subjectLabel?: string;
  updatedBy?: string;
  className?: string;
  confirmBeforeSave?: boolean;
  restartTargetLabel?: string;
  hideAdvancedConfig?: boolean;
  hideSystemPrompt?: boolean;
  hideDetailSection?: boolean;
};

function formatRuntimeLabel(runtime?: string | null): string {
  if (!runtime) {
    return "-";
  }
  if (runtime === "ZEROCLAW") {
    return "FUNCLAW";
  }
  return runtime;
}

export function InstanceAgentPanel({
  instanceId,
  onInstalledAgentsChange,
  onSaved,
  readOnly,
  subjectLabel = "当前实例",
  updatedBy = "ui-dashboard",
  className,
  confirmBeforeSave = false,
  restartTargetLabel = "当前实例",
  hideAdvancedConfig = false,
  hideSystemPrompt = false,
  hideDetailSection = false,
}: InstanceAgentPanelProps) {
  const [baselines, setBaselines] = useState<AgentBaselineSummary[]>([]);
  const [bindings, setBindings] = useState<InstanceAgentBinding[]>([]);
  const [skillBindings, setSkillBindings] = useState<InstanceSkillBinding[]>([]);
  const [selectedAgentKey, setSelectedAgentKey] = useState<string>();
  const [agentSearch, setAgentSearch] = useState("");
  const [selectedBaselineDetail, setSelectedBaselineDetail] = useState<AgentBaseline>();
  const [draft, setDraft] = useState<AgentDraft>();
  const [toolCatalog, setToolCatalog] = useState<AgentToolCatalog>(emptyAgentToolCatalog());
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [systemPromptCollapsed, setSystemPromptCollapsed] = useState(true);
  const [messageApi, contextHolder] = message.useMessage();
  const [modal, modalContextHolder] = Modal.useModal();

  const confirmSaveWithRestart = useCallback(async () => {
    if (!confirmBeforeSave || !onSaved) {
      return true;
    }

    return await new Promise<boolean>((resolve) => {
      modal.confirm({
        title: "确认保存配置？",
        content: `保存后会自动重启${restartTargetLabel}，重启期间可能会短暂不可用。确认继续吗？`,
        okText: "确认保存并重启",
        cancelText: "先不保存",
        centered: true,
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
  }, [confirmBeforeSave, modal, onSaved, restartTargetLabel]);

  const loadAll = useCallback(async (showSuccess?: boolean) => {
    setLoading(true);
    setError(undefined);
    try {
      const [baselineResponse, bindingResponse, skillBindingResponse] = await Promise.all([
        listAgentBaselines(),
        listInstanceAgentBindings(instanceId),
        listInstanceSkillBindings(instanceId),
      ]);
      const nextBaselines = baselineResponse.items;
      const nextBindings = bindingResponse.items;
      const nextSkillBindings = skillBindingResponse.items;
      const installedKeys = new Set(nextBindings.map((item) => item.agentKey));
      const nextCandidates = nextBaselines.filter((item) => item.enabled && !installedKeys.has(item.agentKey));

      setBaselines(nextBaselines);
      setBindings(nextBindings);
      setSkillBindings(nextSkillBindings);
      setSelectedAgentKey((current) => {
        if (
          current &&
          (nextBindings.some((item) => item.agentKey === current) || nextCandidates.some((item) => item.agentKey === current))
        ) {
          return current;
        }
        if (nextBindings.length > 0) {
          return nextBindings[0].agentKey;
        }
        return undefined;
      });
      if (showSuccess) {
        messageApi.success("Agent 列表已刷新");
      }
    } catch (apiError) {
      setBaselines([]);
      setBindings([]);
      setSkillBindings([]);
      setSelectedAgentKey(undefined);
      setSelectedBaselineDetail(undefined);
      setDraft(undefined);
      setError(apiError instanceof Error ? apiError.message : String(apiError));
    } finally {
      setLoading(false);
    }
  }, [instanceId, messageApi]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    void getAgentToolCatalog()
      .then((response) => setToolCatalog(response))
      .catch(() => setToolCatalog(emptyAgentToolCatalog()));
  }, []);

  useEffect(() => {
    onInstalledAgentsChange?.(bindings);
  }, [bindings, onInstalledAgentsChange]);

  const bindingMap = useMemo(() => new Map(bindings.map((item) => [item.agentKey, item])), [bindings]);
  const selectedBinding = selectedAgentKey ? bindingMap.get(selectedAgentKey) : undefined;
  const installedAgents = useMemo(
    () => bindings.slice().sort((left, right) => left.agentKey.localeCompare(right.agentKey)),
    [bindings],
  );
  const candidateAgents = useMemo(() => {
    const installedKeys = new Set(bindings.map((item) => item.agentKey));
    return baselines
      .filter((item) => item.enabled && !installedKeys.has(item.agentKey))
      .sort((left, right) => left.agentKey.localeCompare(right.agentKey));
  }, [baselines, bindings]);
  const filteredCandidateAgents = useMemo(() => {
    if (!agentSearch.trim()) {
      return candidateAgents;
    }
    const keyword = agentSearch.trim().toLowerCase();
    return candidateAgents.filter(
      (item) =>
        item.agentKey.toLowerCase().includes(keyword) ||
        (item.displayName || "").toLowerCase().includes(keyword),
    );
  }, [candidateAgents, agentSearch]);

  useEffect(() => {
    if (hideDetailSection) {
      setSelectedBaselineDetail(undefined);
      setDetailLoading(false);
      return;
    }
    if (selectedBinding) {
      setDraft(toDraft(selectedBinding));
      setSelectedBaselineDetail(undefined);
      setSystemPromptCollapsed(true);
      setDetailLoading(false);
      return;
    }

    setDraft(undefined);
    if (!selectedAgentKey) {
      setSelectedBaselineDetail(undefined);
      return;
    }

    setDetailLoading(true);
    void getAgentBaseline(selectedAgentKey)
      .then((response) => {
        setSelectedBaselineDetail(response);
        setSystemPromptCollapsed(true);
      })
      .catch(() => {
        setSelectedBaselineDetail(undefined);
      })
      .finally(() => {
        setDetailLoading(false);
      });
  }, [hideDetailSection, selectedAgentKey, selectedBinding]);

  const runtimeToolOptions = useMemo(() => {
    return buildAgentToolOptions(toolCatalog.tools, draft?.allowedTools ?? []);
  }, [draft?.allowedTools, toolCatalog.tools]);
  const allowedSkillOptions = useMemo(() => {
    return buildSkillOptions(skillBindings, draft?.allowedSkills ?? []);
  }, [draft?.allowedSkills, skillBindings]);

  const draftDirty = snapshotDraft(draft) !== snapshotDraft(selectedBinding ? toDraft(selectedBinding) : undefined);
  const actionDisabled = readOnly || saving;

  const handleInstall = useCallback(async (agentKey?: string) => {
    if (readOnly) {
      return;
    }
    const targetAgentKey = agentKey ?? selectedAgentKey;
    if (!targetAgentKey) {
      return;
    }
    setSelectedAgentKey(targetAgentKey);
    setSaving(true);
    setError(undefined);
    try {
      await upsertInstanceAgentBinding(instanceId, targetAgentKey, {
        updatedBy,
      });
      await loadAll();
      await onSaved?.();
      messageApi.success(`Agent 已装载到${subjectLabel}`);
    } catch (apiError) {
      const messageText = apiError instanceof Error ? apiError.message : String(apiError);
      setError(messageText);
      messageApi.error("装载 Agent 失败");
    } finally {
      setSaving(false);
    }
  }, [instanceId, loadAll, messageApi, onSaved, readOnly, selectedAgentKey, subjectLabel, updatedBy]);

  const handleSave = useCallback(async () => {
    if (readOnly) {
      return;
    }
    if (!selectedBinding || !draft) {
      return;
    }
    const confirmed = await confirmSaveWithRestart();
    if (!confirmed) {
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      const saved = await upsertInstanceAgentBinding(instanceId, selectedBinding.agentKey, {
        provider: draft.provider || null,
        model: draft.model || null,
        temperature: draft.temperature,
        agentic: draft.agentic,
        systemPrompt: draft.systemPrompt,
        allowedTools: normalizeStringValues(draft.allowedTools),
        allowedSkills: normalizeStringValues(draft.allowedSkills),
        updatedBy,
      });
      setBindings((current) => current.map((item) => (item.agentKey === saved.agentKey ? saved : item)));
      setDraft(toDraft(saved));
      messageApi.success(`${subjectLabel} Agent 配置已保存`);
      await onSaved?.();
    } catch (apiError) {
      const messageText = apiError instanceof Error ? apiError.message : String(apiError);
      setError(messageText);
      messageApi.error("保存 Agent 配置失败");
    } finally {
      setSaving(false);
    }
  }, [confirmSaveWithRestart, draft, instanceId, messageApi, onSaved, readOnly, selectedBinding, subjectLabel, updatedBy]);

  const handleUninstall = useCallback(async (agentKey?: string) => {
    if (readOnly) {
      return;
    }
    const targetAgentKey = agentKey ?? selectedBinding?.agentKey ?? selectedAgentKey;
    if (!targetAgentKey) {
      return;
    }
    setSelectedAgentKey(targetAgentKey);
    setSaving(true);
    setError(undefined);
    try {
      await uninstallInstanceAgentBinding(instanceId, targetAgentKey);
      await loadAll();
      messageApi.success(`Agent 已从${subjectLabel}卸载`);
      await onSaved?.();
    } catch (apiError) {
      const messageText = apiError instanceof Error ? apiError.message : String(apiError);
      setError(messageText);
      messageApi.error("卸载 Agent 失败");
    } finally {
      setSaving(false);
    }
  }, [instanceId, loadAll, messageApi, onSaved, readOnly, selectedAgentKey, selectedBinding, subjectLabel]);

  const selectedBaselineSummary = useMemo(
    () => candidateAgents.find((item) => item.agentKey === selectedAgentKey),
    [candidateAgents, selectedAgentKey],
  );
  const rootClassName = className ? `instance-agent-panel ${className}` : "instance-agent-panel";

  return (
    <div className={rootClassName}>
      {contextHolder}
      {modalContextHolder}
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <div className="tab-section-header">
          <div className="tab-section-title">
            <span className="tab-section-icon is-agent"><Bot size={16} /></span>
            Agent
          </div>
          <Space size="small" wrap>
            <Tag color="green">已装载 {installedAgents.length}</Tag>
            <Tag color="blue">可装载 {candidateAgents.length}</Tag>
            <Tag color="gold">已挂载 Skill {skillBindings.length}</Tag>
            <Button
              size="small"
              loading={loading}
              onClick={() => {
                void loadAll(true);
              }}
              icon={<RefreshCw size={12} />}
            >
              刷新
            </Button>
          </Space>
        </div>

        {readOnly ? (
          <Alert
            type="info"
            showIcon
            message={uiText.instanceReadonlyNoticeTitle}
            description={uiText.instanceReadonlyPartialDescription}
          />
        ) : null}
        {error ? <Alert type="error" showIcon message={error} /> : null}

        {installedAgents.length > 0 ? (
          <div className="agent-prompt-card">
            <div className="agent-prompt-header">
              <span className="agent-prompt-header-title">已装载</span>
            </div>
            <div className="agent-prompt-body">
              <div className="agent-selector-grid">
                {installedAgents.map((item) => {
                  const selected = selectedAgentKey === item.agentKey;
                  return (
                    <div key={item.agentKey} className="selector-card-shell">
                      <button
                        type="button"
                        className={`agent-selector-card ${selected ? "is-selected" : ""}`}
                        onClick={() => setSelectedAgentKey(item.agentKey)}
                      >
                        <div className={`agent-selector-card-icon ${item.agentic ? "is-agentic" : "is-standard"}`}>
                          <Bot size={18} />
                        </div>
                        <strong className="agent-selector-card-title">{item.displayName || item.agentKey}</strong>
                        <p className="agent-selector-card-path">{item.agentKey}</p>
                        <div className="agent-selector-card-meta">
                          {hideAdvancedConfig ? (
                            <span className={`agent-selector-card-chip ${item.enabled ? "is-agentic" : "is-neutral"}`}>
                              {item.enabled ? "当前可用" : "暂不可用"}
                            </span>
                          ) : (
                            <>
                              <span className="agent-selector-card-chip is-neutral">{formatRuntimeLabel(item.runtime)}</span>
                              <span className={`agent-selector-card-chip ${item.enabled ? "is-agentic" : "is-neutral"}`}>
                                {item.enabled ? "已启用" : "已禁用"}
                              </span>
                              {item.model ? <span className="agent-selector-card-chip is-model">{item.model}</span> : null}
                            </>
                          )}
                        </div>
                      </button>
                      <Button
                        size="small"
                        danger
                        icon={<Trash2 size={14} />}
                        className="selector-card-hover-action"
                        loading={saving && selectedAgentKey === item.agentKey}
                        disabled={actionDisabled}
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleUninstall(item.agentKey);
                        }}
                      >
                        卸载
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          !loading ? <Empty description="暂无已装载 Agent" /> : null
        )}

        <div className="agent-prompt-card">
          <div className="agent-prompt-header">
            <span className="agent-prompt-header-title">可装载</span>
            <Input
              placeholder="搜索可装载 Agent"
              prefix={<Search size={14} style={{ opacity: 0.45 }} />}
              allowClear
              style={{ width: 240 }}
              value={agentSearch}
              onChange={(event) => setAgentSearch(event.target.value)}
            />
          </div>
          <div className="agent-prompt-body">
            {filteredCandidateAgents.length > 0 ? (
              <div className="agent-selector-grid">
                {filteredCandidateAgents.map((item) => {
                  const selected = selectedAgentKey === item.agentKey;
                  return (
                    <div key={item.agentKey} className="selector-card-shell">
                      <button
                        type="button"
                        className={`agent-selector-card ${selected ? "is-selected" : ""}`}
                        onClick={() => setSelectedAgentKey(item.agentKey)}
                      >
                        <div className="agent-selector-card-icon is-standard">
                          <Download size={18} />
                        </div>
                        <strong className="agent-selector-card-title">{item.displayName || item.agentKey}</strong>
                        <p className="agent-selector-card-path">{item.agentKey}</p>
                        <div className="agent-selector-card-meta">
                          {hideAdvancedConfig ? (
                            <span className="agent-selector-card-chip is-neutral">可装载</span>
                          ) : (
                            <>
                              <span className="agent-selector-card-chip is-neutral">{formatRuntimeLabel(item.runtime)}</span>
                              {item.model ? <span className="agent-selector-card-chip is-model">{item.model}</span> : null}
                            </>
                          )}
                        </div>
                      </button>
                      <Button
                        size="small"
                        type="primary"
                        icon={<Download size={14} />}
                        className="selector-card-hover-action"
                        loading={saving && selectedAgentKey === item.agentKey}
                        disabled={actionDisabled}
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleInstall(item.agentKey);
                        }}
                      >
                        装载
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Empty
                description={agentSearch ? "没有匹配的可装载 Agent" : "暂无可装载 Agent"}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </div>
        </div>

        {!hideDetailSection && selectedBinding ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <Space direction="vertical" style={{ width: "100%" }} size="middle">
              <div className="agent-prompt-card">
                <div className="agent-prompt-header">
                  <span className="agent-prompt-header-title">{selectedBinding.displayName || selectedBinding.agentKey}</span>
                  <Space size="small" wrap>
                    {!hideAdvancedConfig ? (
                      <Button
                        type="primary"
                        size="small"
                        icon={<Save size={12} />}
                        disabled={readOnly || !draftDirty}
                        loading={saving}
                        onClick={() => void handleSave()}
                      >
                        保存配置
                      </Button>
                    ) : null}
                    <Button
                      danger
                      size="small"
                      icon={<Trash2 size={12} />}
                      loading={saving}
                      disabled={readOnly}
                      onClick={() => void handleUninstall()}
                    >
                      卸载
                    </Button>
                  </Space>
                </div>

                <div className="agent-prompt-body is-spacious">
                  {hideAdvancedConfig ? (
                    <Space direction="vertical" style={{ width: "100%" }} size="middle">
                      <div className="agent-detail-prop is-wide">
                        <span className="agent-detail-prop-label">Agent 说明</span>
                        <span className="agent-detail-prop-value">
                          {selectedBinding.description || "当前龙虾已挂载这个 Agent，可继续切换或卸载。"}
                        </span>
                      </div>
                    </Space>
                  ) : (
                    <Space direction="vertical" style={{ width: "100%" }} size="middle">
                      <div className="agent-detail-grid">
                        <div className="agent-detail-prop">
                          <span className="agent-detail-prop-label">Agent 标识</span>
                          <span className="agent-detail-prop-value">{selectedBinding.agentKey}</span>
                        </div>
                        <div className="agent-detail-prop">
                          <span className="agent-detail-prop-label">运行时</span>
                          <span className="agent-detail-prop-value">{formatRuntimeLabel(selectedBinding.runtime)}</span>
                        </div>
                        <div className="agent-detail-prop">
                          <span className="agent-detail-prop-label">来源类型</span>
                          <span className="agent-detail-prop-value">{selectedBinding.sourceType}</span>
                        </div>
                        <div className="agent-detail-prop">
                          <span className="agent-detail-prop-label">更新时间</span>
                          <span className="agent-detail-prop-value">{formatTimestamp(selectedBinding.updatedAt)}</span>
                        </div>
                        <div className="agent-detail-prop is-wide">
                          <span className="agent-detail-prop-label">服务提供方</span>
                          <Input
                            value={draft?.provider ?? ""}
                            disabled={readOnly}
                            onChange={(event) => {
                              setDraft((current) => (current ? { ...current, provider: event.target.value } : current));
                            }}
                            placeholder="custom:https://api.example.com/v1"
                          />
                        </div>
                        <div className="agent-detail-prop is-wide">
                          <span className="agent-detail-prop-label">模型</span>
                          <Input
                            value={draft?.model ?? ""}
                            disabled={readOnly}
                            onChange={(event) => {
                              setDraft((current) => (current ? { ...current, model: event.target.value } : current));
                            }}
                            placeholder="MiniMax-M2.5"
                          />
                        </div>
                        <div className="agent-detail-prop">
                          <span className="agent-detail-prop-label">温度</span>
                          <InputNumber
                            style={{ width: "100%" }}
                            value={draft?.temperature ?? null}
                            min={0}
                            max={2}
                            step={0.1}
                            disabled={readOnly}
                            onChange={(value) => {
                              setDraft((current) => (
                                current
                                  ? { ...current, temperature: typeof value === "number" ? value : null }
                                  : current
                              ));
                            }}
                          />
                        </div>
                        <div className="agent-detail-prop">
                          <span className="agent-detail-prop-label">自主模式</span>
                          <Switch
                            checked={draft?.agentic ?? false}
                            disabled={readOnly}
                            onChange={(checked) => {
                              setDraft((current) => (current ? { ...current, agentic: checked } : current));
                            }}
                          />
                        </div>
                        {draft?.agentic ? (
                          <div className="agent-detail-prop is-wide">
                            <span className="agent-detail-prop-label">工具白名单</span>
                            <Select
                              mode="tags"
                              allowClear
                              placeholder="选择这只龙虾允许运行的工具"
                              options={runtimeToolOptions}
                              style={{ width: "100%" }}
                              value={draft?.allowedTools ?? []}
                              disabled={readOnly}
                              onChange={(value) => {
                                setDraft((current) => (current ? { ...current, allowedTools: value } : current));
                              }}
                            />
                            <Text type="secondary">
                              对应配置字段 `allowed_tools`，这里只选择运行时工具，不包含 Skill。
                            </Text>
                          </div>
                        ) : null}
                        <div className="agent-detail-prop is-wide">
                          <span className="agent-detail-prop-label">Skill 白名单</span>
                          <Select
                            mode="multiple"
                            allowClear
                            placeholder="留空表示允许这只龙虾使用全部已挂载 Skill"
                            options={allowedSkillOptions}
                            style={{ width: "100%" }}
                            value={draft?.allowedSkills ?? []}
                            disabled={readOnly}
                            onChange={(value) => {
                              setDraft((current) => (
                                current ? { ...current, allowedSkills: normalizeStringValues(value) } : current
                              ));
                            }}
                          />
                          <Text type="secondary">
                            对应配置字段 `allowed_skills`，用于限制当前 Agent 可见的 Skill 范围。
                          </Text>
                        </div>
                        <div className="agent-detail-prop is-wide">
                          <span className="agent-detail-prop-label">描述</span>
                          <span className="agent-detail-prop-value">{selectedBinding.description || "-"}</span>
                        </div>
                        <div className="agent-detail-prop is-wide">
                          <span className="agent-detail-prop-label">来源引用</span>
                          <span className="agent-detail-prop-value">{selectedBinding.sourceRef || "-"}</span>
                        </div>
                      </div>
                    </Space>
                  )}
                </div>
              </div>

              {!hideSystemPrompt ? (
                <div className="agent-prompt-card">
                  <div className="agent-prompt-header">
                    <span className="agent-prompt-header-title">系统提示词</span>
                    <Button
                      size="small"
                      icon={<Eye size={12} />}
                      onClick={() => setSystemPromptCollapsed((current) => !current)}
                    >
                      {systemPromptCollapsed ? "展开提示词" : "收起提示词"}
                    </Button>
                  </div>
                  <div className="agent-prompt-body">
                    {systemPromptCollapsed ? (
                      <Text type="secondary">提示词已收起</Text>
                    ) : (
                      <Input.TextArea
                        className="prompt-textarea prompt-textarea-agent"
                        rows={18}
                        readOnly={readOnly}
                        value={draft?.systemPrompt ?? ""}
                        onChange={(event) => {
                          setDraft((current) => (current ? { ...current, systemPrompt: event.target.value } : current));
                        }}
                      />
                    )}
                  </div>
                </div>
              ) : null}
            </Space>
          </motion.div>
        ) : !hideDetailSection && selectedAgentKey ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="agent-prompt-card">
              <div className="agent-prompt-header">
                <span className="agent-prompt-header-title">{selectedBaselineDetail?.displayName || selectedAgentKey}</span>
                <Button
                  type="primary"
                  size="small"
                  loading={saving}
                  disabled={readOnly || !selectedBaselineSummary}
                  onClick={() => void handleInstall(selectedAgentKey)}
                >
                  装载
                </Button>
              </div>
              <div className="agent-prompt-body is-spacious">
                {detailLoading ? (
                  <Text type="secondary">正在加载 Agent 详情...</Text>
                ) : selectedBaselineDetail ? (
                  <Space direction="vertical" style={{ width: "100%" }} size="middle">
                    {hideAdvancedConfig ? (
                      <>
                        <Alert
                          type="info"
                          showIcon
                          message="装载后将由这只龙虾使用该 Agent"
                          description="底层模型参数和提示词由平台统一维护，这里不再直接展示。"
                        />
                        <div className="agent-detail-prop is-wide">
                          <span className="agent-detail-prop-label">Agent 说明</span>
                          <span className="agent-detail-prop-value">
                            {selectedBaselineDetail.description || "这个 Agent 已可用于当前龙虾，装载后会自动同步生效。"}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="agent-detail-grid">
                          <div className="agent-detail-prop">
                            <span className="agent-detail-prop-label">Agent 标识</span>
                            <span className="agent-detail-prop-value">{selectedBaselineDetail.agentKey}</span>
                          </div>
                          <div className="agent-detail-prop">
                            <span className="agent-detail-prop-label">运行时</span>
                            <span className="agent-detail-prop-value">{formatRuntimeLabel(selectedBaselineDetail.runtime)}</span>
                          </div>
                          <div className="agent-detail-prop is-wide">
                            <span className="agent-detail-prop-label">服务提供方</span>
                            <span className="agent-detail-prop-value">{selectedBaselineDetail.provider || "-"}</span>
                          </div>
                          <div className="agent-detail-prop is-wide">
                            <span className="agent-detail-prop-label">模型</span>
                            <span className="agent-detail-prop-value">{selectedBaselineDetail.model || "-"}</span>
                          </div>
                          <div className="agent-detail-prop">
                            <span className="agent-detail-prop-label">温度</span>
                            <span className="agent-detail-prop-value">{selectedBaselineDetail.temperature ?? "-"}</span>
                          </div>
                          <div className="agent-detail-prop">
                            <span className="agent-detail-prop-label">自主模式</span>
                            <span className="agent-detail-prop-value">{selectedBaselineDetail.agentic ? "已开启" : "未开启"}</span>
                          </div>
                          <div className="agent-detail-prop is-wide">
                            <span className="agent-detail-prop-label">描述</span>
                            <span className="agent-detail-prop-value">{selectedBaselineDetail.description || "-"}</span>
                          </div>
                          <div className="agent-detail-prop is-wide">
                            <span className="agent-detail-prop-label">来源引用</span>
                            <span className="agent-detail-prop-value">{selectedBaselineDetail.sourceRef || "-"}</span>
                          </div>
                        </div>
                        {!hideSystemPrompt ? (
                          <Input.TextArea
                            className="prompt-textarea prompt-textarea-agent"
                            rows={18}
                            readOnly
                            value={selectedBaselineDetail.systemPrompt ?? ""}
                          />
                        ) : null}
                      </>
                    )}
                  </Space>
                ) : (
                  <Empty description="请选择一个 Agent 查看详情" />
                )}
              </div>
            </div>
          </motion.div>
        ) : !hideDetailSection ? (
          !loading ? <Empty description="请选择一个 Agent 查看详情" /> : null
        ) : null}
      </Space>
    </div>
  );
}
