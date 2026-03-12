"use client";

import {
  getAgentBaseline,
  listAgentBaselines,
  listInstanceAgentBindings,
  listInstanceSkillBindings,
  uninstallInstanceAgentBinding,
  upsertInstanceAgentBinding,
} from "@/lib/control-api";
import type {
  AgentBaseline,
  AgentBaselineSummary,
  InstanceAgentBinding,
  InstanceSkillBinding,
} from "@/types/contracts";
import { Alert, Button, Empty, Input, InputNumber, Select, Space, Switch, Tag, Typography, message } from "antd";
import { motion } from "framer-motion";
import { Bot, ChevronLeft, Download, Eye, RefreshCw, Save, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const { Text } = Typography;

type AgentDraft = {
  provider: string;
  model: string;
  temperature: number | null;
  agentic: boolean;
  systemPrompt: string;
  allowedTools: string[];
};

function toDraft(binding: InstanceAgentBinding): AgentDraft {
  return {
    provider: binding.provider ?? "",
    model: binding.model ?? "",
    temperature: binding.temperature ?? null,
    agentic: binding.agentic === true,
    systemPrompt: binding.systemPrompt ?? "",
    allowedTools: binding.allowedTools ?? [],
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
    allowedTools: value.allowedTools,
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
};

export function InstanceAgentPanel({ instanceId, onInstalledAgentsChange }: InstanceAgentPanelProps) {
  const [baselines, setBaselines] = useState<AgentBaselineSummary[]>([]);
  const [bindings, setBindings] = useState<InstanceAgentBinding[]>([]);
  const [skillBindings, setSkillBindings] = useState<InstanceSkillBinding[]>([]);
  const [selectedAgentKey, setSelectedAgentKey] = useState<string>();
  const [agentSearch, setAgentSearch] = useState("");
  const [selectedBaselineDetail, setSelectedBaselineDetail] = useState<AgentBaseline>();
  const [draft, setDraft] = useState<AgentDraft>();
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [systemPromptCollapsed, setSystemPromptCollapsed] = useState(true);
  const [messageApi, contextHolder] = message.useMessage();

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
        if (current && (nextBindings.some((item) => item.agentKey === current) || nextCandidates.some((item) => item.agentKey === current))) {
          return current;
        }
        if (nextBindings.length > 0) {
          return nextBindings[0].agentKey;
        }
        return undefined;
      });
      if (showSuccess) {
        messageApi.success("已刷新实例 Agent");
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
    if (!agentSearch.trim()) return candidateAgents;
    const keyword = agentSearch.trim().toLowerCase();
    return candidateAgents.filter(
      (item) =>
        item.agentKey.toLowerCase().includes(keyword) ||
        (item.displayName || "").toLowerCase().includes(keyword),
    );
  }, [candidateAgents, agentSearch]);

  useEffect(() => {
    if (selectedBinding) {
      setDraft(toDraft(selectedBinding));
      setSelectedBaselineDetail(undefined);
      setSystemPromptCollapsed(true);
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
  }, [selectedAgentKey, selectedBinding]);

  const skillOptions = useMemo(() => {
    const values = new Set<string>();
    skillBindings.forEach((item) => values.add(item.skillKey));
    (draft?.allowedTools ?? []).forEach((item) => values.add(item));
    return Array.from(values).sort((left, right) => left.localeCompare(right)).map((item) => ({
      value: item,
      label: item,
    }));
  }, [draft?.allowedTools, skillBindings]);

  const draftDirty = snapshotDraft(draft) !== snapshotDraft(selectedBinding ? toDraft(selectedBinding) : undefined);

  const handleInstall = useCallback(async (agentKey?: string) => {
    const targetAgentKey = agentKey ?? selectedAgentKey;
    if (!targetAgentKey) {
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      await upsertInstanceAgentBinding(instanceId, targetAgentKey, { updatedBy: "ui-dashboard" });
      setSelectedAgentKey(targetAgentKey);
      await loadAll();
      messageApi.success("Agent 已装载到当前实例");
    } catch (apiError) {
      const messageText = apiError instanceof Error ? apiError.message : String(apiError);
      setError(messageText);
      messageApi.error("装载 Agent 失败");
    } finally {
      setSaving(false);
    }
  }, [instanceId, loadAll, messageApi, selectedAgentKey]);

  const handleSave = useCallback(async () => {
    if (!selectedBinding || !draft) {
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
        allowedTools: draft.allowedTools,
        updatedBy: "ui-dashboard",
      });
      setBindings((current) => current.map((item) => item.agentKey === saved.agentKey ? saved : item));
      setDraft(toDraft(saved));
      messageApi.success("实例 Agent 配置已保存并落库");
    } catch (apiError) {
      const messageText = apiError instanceof Error ? apiError.message : String(apiError);
      setError(messageText);
      messageApi.error("保存 Agent 配置失败");
    } finally {
      setSaving(false);
    }
  }, [draft, instanceId, messageApi, selectedBinding]);

  const handleUninstall = useCallback(async () => {
    if (!selectedBinding) {
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      await uninstallInstanceAgentBinding(instanceId, selectedBinding.agentKey);
      await loadAll();
      messageApi.success("Agent 已从当前实例卸载");
    } catch (apiError) {
      const messageText = apiError instanceof Error ? apiError.message : String(apiError);
      setError(messageText);
      messageApi.error("卸载 Agent 失败");
    } finally {
      setSaving(false);
    }
  }, [instanceId, loadAll, messageApi, selectedBinding]);

  return (
    <>
      {contextHolder}
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <div className="tab-section-header">
          <div className="tab-section-title">
            <span className="tab-section-icon is-agent"><Bot size={16} /></span>
            实例 Agent 配置
          </div>
          <Space size="small">
            <Tag color="green">已装载 {installedAgents.length}</Tag>
            <Tag color="blue">可添加 {candidateAgents.length}</Tag>
            <Tag color="gold">已装载 Skill {skillBindings.length}</Tag>
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

        {error ? <Alert type="error" showIcon message={error} /> : null}
        <Alert
          type="info"
          showIcon
          message="这里维护实例级 Agent 配置，并会同步回写到运行时 config.toml"
          description={"首次打开时，会把当前实例已有的 [agents.\"...\"] 配置自动回填进数据库。后续以实例 Agent 配置为准。"}
        />

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
                      <p className="agent-selector-card-path">{item.agentKey}</p>
                      <div className="agent-selector-card-meta">
                        <span className="agent-selector-card-chip is-neutral">{item.runtime}</span>
                        <span className={`agent-selector-card-chip ${item.enabled ? "is-agentic" : "is-neutral"}`}>
                          {item.enabled ? "Enabled" : "Disabled"}
                        </span>
                        {item.model ? <span className="agent-selector-card-chip is-model">{item.model}</span> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          !loading ? <Empty description="当前实例还没有装载 Agent" /> : null
        )}

        {candidateAgents.length > 0 ? (
          <div className="agent-prompt-card">
            <div className="agent-prompt-header">
              <span className="agent-prompt-header-title">可添加</span>
              <Input
                placeholder="搜索 Agent..."
                prefix={<Search size={14} style={{ opacity: 0.45 }} />}
                allowClear
                style={{ width: 240 }}
                value={agentSearch}
                onChange={(e) => setAgentSearch(e.target.value)}
              />
            </div>
            <div className="agent-prompt-body">
              {filteredCandidateAgents.length > 0 ? (
                <div className="agent-selector-grid">
                  {filteredCandidateAgents.map((item) => {
                    const selected = selectedAgentKey === item.agentKey;
                    return (
                      <button
                        key={item.agentKey}
                        type="button"
                        className={`agent-selector-card ${selected ? "is-selected" : ""}`}
                        onClick={() => setSelectedAgentKey(item.agentKey)}
                      >
                        <div className="agent-selector-card-icon is-standard">
                          <Download size={18} />
                        </div>
                        <strong className="agent-selector-card-title">{item.displayName || item.agentKey}</strong>
                        <p className="agent-selector-card-path">{item.agentKey}</p>
                        <Tag color="blue">未装载</Tag>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <Empty description={agentSearch ? "没有匹配的 Agent" : "没有可添加的 Agent"} image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </div>
          </div>
        ) : null}

        {selectedBinding ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="agent-prompt-card">
              <div className="agent-prompt-header">
                <span className="agent-prompt-header-title">{selectedBinding.displayName || selectedBinding.agentKey}</span>
                <Space size="small" wrap>
                  <Button
                    type="primary"
                    size="small"
                    icon={<Save size={12} />}
                    disabled={!draftDirty}
                    loading={saving}
                    onClick={() => void handleSave()}
                  >
                    保存
                  </Button>
                  <Button
                    danger
                    size="small"
                    icon={<Trash2 size={12} />}
                    loading={saving}
                    onClick={() => void handleUninstall()}
                  >
                    卸载
                  </Button>
                </Space>
              </div>

              <div className="agent-prompt-body is-spacious">
                <Space direction="vertical" style={{ width: "100%" }} size="middle">
                  <div className="agent-detail-grid">
                    <div className="agent-detail-prop">
                      <span className="agent-detail-prop-label">Agent Key</span>
                      <span className="agent-detail-prop-value">{selectedBinding.agentKey}</span>
                    </div>
                    <div className="agent-detail-prop">
                      <span className="agent-detail-prop-label">Runtime</span>
                      <span className="agent-detail-prop-value">{selectedBinding.runtime}</span>
                    </div>
                    <div className="agent-detail-prop is-wide">
                      <span className="agent-detail-prop-label">Provider</span>
                      <Input
                        value={draft?.provider ?? ""}
                        onChange={(event) => setDraft((current) => current ? { ...current, provider: event.target.value } : current)}
                        placeholder="custom:https://api.example.com/v1"
                      />
                    </div>
                    <div className="agent-detail-prop is-wide">
                      <span className="agent-detail-prop-label">Model</span>
                      <Input
                        value={draft?.model ?? ""}
                        onChange={(event) => setDraft((current) => current ? { ...current, model: event.target.value } : current)}
                        placeholder="MiniMax-M2.5"
                      />
                    </div>
                    <div className="agent-detail-prop">
                      <span className="agent-detail-prop-label">Temperature</span>
                      <InputNumber
                        style={{ width: "100%" }}
                        value={draft?.temperature ?? null}
                        min={0}
                        max={2}
                        step={0.1}
                        onChange={(value) => setDraft((current) => current ? { ...current, temperature: typeof value === "number" ? value : null } : current)}
                      />
                    </div>
                    <div className="agent-detail-prop">
                      <span className="agent-detail-prop-label">Agentic</span>
                      <Switch
                        checked={draft?.agentic === true}
                        onChange={(checked) => setDraft((current) => current ? { ...current, agentic: checked } : current)}
                      />
                    </div>
                    <div className="agent-detail-prop is-wide">
                      <span className="agent-detail-prop-label">Allowed Tools</span>
                      <Select
                        mode="multiple"
                        value={draft?.allowedTools ?? []}
                        options={skillOptions}
                        onChange={(value) => setDraft((current) => current ? { ...current, allowedTools: value } : current)}
                        placeholder="选择当前实例已装载的 Skill"
                        optionFilterProp="label"
                        showSearch
                      />
                    </div>
                    <div className="agent-detail-prop">
                      <span className="agent-detail-prop-label">更新时间</span>
                      <span className="agent-detail-prop-value">{formatTimestamp(selectedBinding.updatedAt)}</span>
                    </div>
                    <div className="agent-detail-prop">
                      <span className="agent-detail-prop-label">来源</span>
                      <span className="agent-detail-prop-value">{selectedBinding.sourceType}</span>
                    </div>
                  </div>

                  <div className="agent-prompt-card">
                    <div className="agent-prompt-header">
                      <span className="agent-prompt-header-title">System Prompt</span>
                      <Button
                        size="small"
                        onClick={() => setSystemPromptCollapsed((current) => !current)}
                        icon={systemPromptCollapsed ? <Eye size={12} /> : <ChevronLeft size={12} />}
                      >
                        {systemPromptCollapsed ? "展开" : "折叠"}
                      </Button>
                    </div>
                    <div className="agent-prompt-body">
                      {systemPromptCollapsed ? (
                        <Text type="secondary">默认折叠，展开后可编辑当前实例下这个 Agent 的 system_prompt。</Text>
                      ) : (
                        <Input.TextArea
                          className="prompt-textarea prompt-textarea-agent"
                          rows={18}
                          value={draft?.systemPrompt ?? ""}
                          onChange={(event) => setDraft((current) => current ? { ...current, systemPrompt: event.target.value } : current)}
                        />
                      )}
                    </div>
                  </div>
                </Space>
              </div>
            </div>
          </motion.div>
        ) : selectedAgentKey ? (
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
                  onClick={() => void handleInstall(selectedAgentKey)}
                >
                  装载到当前实例
                </Button>
              </div>
              <div className="agent-prompt-body is-spacious">
                {detailLoading ? (
                  <Text type="secondary">Agent 详情加载中...</Text>
                ) : selectedBaselineDetail ? (
                  <Space direction="vertical" style={{ width: "100%" }} size="middle">
                    <div className="agent-detail-grid">
                      <div className="agent-detail-prop">
                        <span className="agent-detail-prop-label">Agent Key</span>
                        <span className="agent-detail-prop-value">{selectedBaselineDetail.agentKey}</span>
                      </div>
                      <div className="agent-detail-prop">
                        <span className="agent-detail-prop-label">Runtime</span>
                        <span className="agent-detail-prop-value">{selectedBaselineDetail.runtime}</span>
                      </div>
                      <div className="agent-detail-prop is-wide">
                        <span className="agent-detail-prop-label">Provider</span>
                        <span className="agent-detail-prop-value">{selectedBaselineDetail.provider || "-"}</span>
                      </div>
                      <div className="agent-detail-prop is-wide">
                        <span className="agent-detail-prop-label">Model</span>
                        <span className="agent-detail-prop-value">{selectedBaselineDetail.model || "-"}</span>
                      </div>
                    </div>
                    <Input.TextArea
                      className="prompt-textarea prompt-textarea-agent"
                      rows={18}
                      readOnly
                      value={selectedBaselineDetail.systemPrompt ?? ""}
                    />
                  </Space>
                ) : (
                  <Empty description="选择一个未装载的 Agent 查看详情" />
                )}
              </div>
            </div>
          </motion.div>
        ) : null}
      </Space>
    </>
  );
}
