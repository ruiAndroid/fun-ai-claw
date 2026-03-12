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
        messageApi.success("Agent list refreshed");
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
  }, [selectedAgentKey, selectedBinding]);

  const skillOptions = useMemo(() => {
    const values = new Set<string>();
    skillBindings.forEach((item) => values.add(item.skillKey));
    (draft?.allowedTools ?? []).forEach((item) => values.add(item));
    return Array.from(values)
      .sort((left, right) => left.localeCompare(right))
      .map((item) => ({ value: item, label: item }));
  }, [draft?.allowedTools, skillBindings]);

  const draftDirty = snapshotDraft(draft) !== snapshotDraft(selectedBinding ? toDraft(selectedBinding) : undefined);

  const handleInstall = useCallback(async (agentKey?: string) => {
    const targetAgentKey = agentKey ?? selectedAgentKey;
    if (!targetAgentKey) {
      return;
    }
    setSelectedAgentKey(targetAgentKey);
    setSaving(true);
    setError(undefined);
    try {
      await upsertInstanceAgentBinding(instanceId, targetAgentKey, { updatedBy: "ui-dashboard" });
      await loadAll();
      messageApi.success("Agent installed to this instance");
    } catch (apiError) {
      const messageText = apiError instanceof Error ? apiError.message : String(apiError);
      setError(messageText);
      messageApi.error("Failed to install agent");
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
      setBindings((current) => current.map((item) => (item.agentKey === saved.agentKey ? saved : item)));
      setDraft(toDraft(saved));
      messageApi.success("Instance agent config saved");
    } catch (apiError) {
      const messageText = apiError instanceof Error ? apiError.message : String(apiError);
      setError(messageText);
      messageApi.error("Failed to save agent config");
    } finally {
      setSaving(false);
    }
  }, [draft, instanceId, messageApi, selectedBinding]);

  const handleUninstall = useCallback(async (agentKey?: string) => {
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
      messageApi.success("Agent removed from this instance");
    } catch (apiError) {
      const messageText = apiError instanceof Error ? apiError.message : String(apiError);
      setError(messageText);
      messageApi.error("Failed to uninstall agent");
    } finally {
      setSaving(false);
    }
  }, [instanceId, loadAll, messageApi, selectedAgentKey, selectedBinding]);

  const selectedBaselineSummary = useMemo(
    () => candidateAgents.find((item) => item.agentKey === selectedAgentKey),
    [candidateAgents, selectedAgentKey],
  );

  return (
    <>
      {contextHolder}
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <div className="tab-section-header">
          <div className="tab-section-title">
            <span className="tab-section-icon is-agent"><Bot size={16} /></span>
            Agent
          </div>
          <Space size="small" wrap>
            <Tag color="green">Installed {installedAgents.length}</Tag>
            <Tag color="blue">Available {candidateAgents.length}</Tag>
            <Tag color="gold">Mounted skills {skillBindings.length}</Tag>
            <Button
              size="small"
              loading={loading}
              onClick={() => {
                void loadAll(true);
              }}
              icon={<RefreshCw size={12} />}
            >
              Refresh
            </Button>
          </Space>
        </div>

        {error ? <Alert type="error" showIcon message={error} /> : null}

        {installedAgents.length > 0 ? (
          <div className="agent-prompt-card">
            <div className="agent-prompt-header">
              <span className="agent-prompt-header-title">Installed</span>
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
                          <span className="agent-selector-card-chip is-neutral">{item.runtime}</span>
                          <span className={`agent-selector-card-chip ${item.enabled ? "is-agentic" : "is-neutral"}`}>
                            {item.enabled ? "Enabled" : "Disabled"}
                          </span>
                          {item.model ? <span className="agent-selector-card-chip is-model">{item.model}</span> : null}
                        </div>
                      </button>
                      <Button
                        size="small"
                        danger
                        icon={<Trash2 size={14} />}
                        className="selector-card-hover-action"
                        loading={saving && selectedAgentKey === item.agentKey}
                        disabled={saving}
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleUninstall(item.agentKey);
                        }}
                      >
                        Uninstall
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          !loading ? <Empty description="No installed agents" /> : null
        )}

        <div className="agent-prompt-card">
          <div className="agent-prompt-header">
            <span className="agent-prompt-header-title">Available</span>
            <Input
              placeholder="Search available agents"
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
                          <span className="agent-selector-card-chip is-neutral">{item.runtime}</span>
                          {item.model ? <span className="agent-selector-card-chip is-model">{item.model}</span> : null}
                        </div>
                      </button>
                      <Button
                        size="small"
                        type="primary"
                        icon={<Download size={14} />}
                        className="selector-card-hover-action"
                        loading={saving && selectedAgentKey === item.agentKey}
                        disabled={saving}
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleInstall(item.agentKey);
                        }}
                      >
                        Install
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Empty
                description={agentSearch ? "No matching available agents" : "No available agents"}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </div>
        </div>

        {selectedBinding ? (
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
                    <Button
                      type="primary"
                      size="small"
                      icon={<Save size={12} />}
                      disabled={!draftDirty}
                      loading={saving}
                      onClick={() => void handleSave()}
                    >
                      Save config
                    </Button>
                    <Button
                      danger
                      size="small"
                      icon={<Trash2 size={12} />}
                      loading={saving}
                      onClick={() => void handleUninstall()}
                    >
                      Uninstall
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
                      <div className="agent-detail-prop">
                        <span className="agent-detail-prop-label">Source Type</span>
                        <span className="agent-detail-prop-value">{selectedBinding.sourceType}</span>
                      </div>
                      <div className="agent-detail-prop">
                        <span className="agent-detail-prop-label">Updated At</span>
                        <span className="agent-detail-prop-value">{formatTimestamp(selectedBinding.updatedAt)}</span>
                      </div>
                      <div className="agent-detail-prop is-wide">
                        <span className="agent-detail-prop-label">Provider</span>
                        <Input
                          value={draft?.provider ?? ""}
                          onChange={(event) => {
                            setDraft((current) => (current ? { ...current, provider: event.target.value } : current));
                          }}
                          placeholder="custom:https://api.example.com/v1"
                        />
                      </div>
                      <div className="agent-detail-prop is-wide">
                        <span className="agent-detail-prop-label">Model</span>
                        <Input
                          value={draft?.model ?? ""}
                          onChange={(event) => {
                            setDraft((current) => (current ? { ...current, model: event.target.value } : current));
                          }}
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
                        <span className="agent-detail-prop-label">Agentic</span>
                        <Switch
                          checked={draft?.agentic ?? false}
                          onChange={(checked) => {
                            setDraft((current) => (current ? { ...current, agentic: checked } : current));
                          }}
                        />
                      </div>
                      <div className="agent-detail-prop is-wide">
                        <span className="agent-detail-prop-label">Allowed Tools</span>
                        <Select
                          mode="multiple"
                          allowClear
                          placeholder="Select mounted skills"
                          options={skillOptions}
                          value={draft?.allowedTools ?? []}
                          onChange={(value) => {
                            setDraft((current) => (current ? { ...current, allowedTools: value } : current));
                          }}
                        />
                      </div>
                      <div className="agent-detail-prop is-wide">
                        <span className="agent-detail-prop-label">Description</span>
                        <span className="agent-detail-prop-value">{selectedBinding.description || "-"}</span>
                      </div>
                      <div className="agent-detail-prop is-wide">
                        <span className="agent-detail-prop-label">Source Ref</span>
                        <span className="agent-detail-prop-value">{selectedBinding.sourceRef || "-"}</span>
                      </div>
                    </div>
                  </Space>
                </div>
              </div>

              <div className="agent-prompt-card">
                <div className="agent-prompt-header">
                  <span className="agent-prompt-header-title">System Prompt</span>
                  <Button
                    size="small"
                    icon={<Eye size={12} />}
                    onClick={() => setSystemPromptCollapsed((current) => !current)}
                  >
                    {systemPromptCollapsed ? "Show prompt" : "Hide prompt"}
                  </Button>
                </div>
                <div className="agent-prompt-body">
                  {systemPromptCollapsed ? (
                    <Text type="secondary">Prompt is collapsed</Text>
                  ) : (
                    <Input.TextArea
                      className="prompt-textarea prompt-textarea-agent"
                      rows={18}
                      value={draft?.systemPrompt ?? ""}
                      onChange={(event) => {
                        setDraft((current) => (current ? { ...current, systemPrompt: event.target.value } : current));
                      }}
                    />
                  )}
                </div>
              </div>
            </Space>
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
                  disabled={!selectedBaselineSummary}
                  onClick={() => void handleInstall(selectedAgentKey)}
                >
                  Install
                </Button>
              </div>
              <div className="agent-prompt-body is-spacious">
                {detailLoading ? (
                  <Text type="secondary">Loading agent detail...</Text>
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
                      <div className="agent-detail-prop">
                        <span className="agent-detail-prop-label">Temperature</span>
                        <span className="agent-detail-prop-value">{selectedBaselineDetail.temperature ?? "-"}</span>
                      </div>
                      <div className="agent-detail-prop">
                        <span className="agent-detail-prop-label">Agentic</span>
                        <span className="agent-detail-prop-value">{selectedBaselineDetail.agentic ? "true" : "false"}</span>
                      </div>
                      <div className="agent-detail-prop is-wide">
                        <span className="agent-detail-prop-label">Description</span>
                        <span className="agent-detail-prop-value">{selectedBaselineDetail.description || "-"}</span>
                      </div>
                      <div className="agent-detail-prop is-wide">
                        <span className="agent-detail-prop-label">Source Ref</span>
                        <span className="agent-detail-prop-value">{selectedBaselineDetail.sourceRef || "-"}</span>
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
                  <Empty description="Select an agent to view details" />
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          !loading ? <Empty description="Select an agent to view details" /> : null
        )}
      </Space>
    </>
  );
}