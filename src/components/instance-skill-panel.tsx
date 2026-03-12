"use client";

import {
  getSkillBaseline,
  installInstanceSkill,
  listInstanceSkillBindings,
  listInstanceSkills,
  listSkillBaselines,
  uninstallInstanceSkill,
} from "@/lib/control-api";
import type {
  InstanceSkillBinding,
  SkillBaseline,
  SkillBaselineSummary,
  SkillDescriptor,
} from "@/types/contracts";
import { Alert, Button, Empty, Input, Space, Tag, Typography, message } from "antd";
import { motion } from "framer-motion";
import { Download, RefreshCw, Search, Trash2, Wrench, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const { Text } = Typography;

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

export function InstanceSkillPanel({
  instanceId,
}: {
  instanceId: string;
}) {
  const [availableSkills, setAvailableSkills] = useState<SkillBaselineSummary[]>([]);
  const [bindings, setBindings] = useState<InstanceSkillBinding[]>([]);
  const [runtimeSkills, setRuntimeSkills] = useState<SkillDescriptor[]>([]);
  const [selectedSkillKey, setSelectedSkillKey] = useState<string>();
  const [selectedSkillDetail, setSelectedSkillDetail] = useState<SkillBaseline>();
  const [skillSearch, setSkillSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [runtimeLoading, setRuntimeLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [runtimeError, setRuntimeError] = useState<string>();
  const [messageApi, contextHolder] = message.useMessage();

  const loadRuntimeSkills = useCallback(async () => {
    setRuntimeLoading(true);
    setRuntimeError(undefined);
    try {
      const response = await listInstanceSkills(instanceId);
      setRuntimeSkills(response.items);
    } catch (apiError) {
      setRuntimeSkills([]);
      setRuntimeError(apiError instanceof Error ? apiError.message : String(apiError));
    } finally {
      setRuntimeLoading(false);
    }
  }, [instanceId]);

  const loadData = useCallback(async (showSuccess?: boolean) => {
    setLoading(true);
    setError(undefined);
    try {
      const [baselineResponse, bindingResponse] = await Promise.all([
        listSkillBaselines(),
        listInstanceSkillBindings(instanceId),
      ]);
      const allSkills = baselineResponse.items;
      const currentBindings = bindingResponse.items;
      const installedSkillKeys = new Set(currentBindings.map((item) => item.skillKey));
      const installedSkills = allSkills.filter((item) => installedSkillKeys.has(item.skillKey));

      setAvailableSkills(allSkills);
      setBindings(currentBindings);
      setSelectedSkillKey((current) => {
        if (current && allSkills.some((item) => item.skillKey === current)) {
          return current;
        }
        if (installedSkills.length > 0) {
          return installedSkills[0].skillKey;
        }
        return undefined;
      });
      if (showSuccess) {
        messageApi.success("Skill list refreshed");
      }
    } catch (apiError) {
      setAvailableSkills([]);
      setBindings([]);
      setSelectedSkillKey(undefined);
      setSelectedSkillDetail(undefined);
      setError(apiError instanceof Error ? apiError.message : String(apiError));
    } finally {
      setLoading(false);
    }
  }, [instanceId, messageApi]);

  const loadSelectedSkillDetail = useCallback(async (skillKey?: string) => {
    if (!skillKey) {
      setSelectedSkillDetail(undefined);
      return;
    }
    setDetailLoading(true);
    try {
      const response = await getSkillBaseline(skillKey);
      setSelectedSkillDetail(response);
    } catch {
      setSelectedSkillDetail(undefined);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
    void loadRuntimeSkills();
  }, [loadData, loadRuntimeSkills]);

  useEffect(() => {
    void loadSelectedSkillDetail(selectedSkillKey);
  }, [loadSelectedSkillDetail, selectedSkillKey]);

  const bindingMap = useMemo(() => new Map(bindings.map((item) => [item.skillKey, item])), [bindings]);
  const runtimeSkillMap = useMemo(() => new Map(runtimeSkills.map((item) => [item.id, item])), [runtimeSkills]);

  const installedSkills = useMemo(
    () => availableSkills.filter((item) => bindingMap.has(item.skillKey)),
    [availableSkills, bindingMap],
  );
  const candidateSkills = useMemo(
    () => availableSkills.filter((item) => !bindingMap.has(item.skillKey) && item.enabled),
    [availableSkills, bindingMap],
  );
  const filteredCandidateSkills = useMemo(() => {
    if (!skillSearch.trim()) {
      return candidateSkills;
    }
    const keyword = skillSearch.trim().toLowerCase();
    return candidateSkills.filter(
      (item) =>
        item.skillKey.toLowerCase().includes(keyword) ||
        (item.displayName || "").toLowerCase().includes(keyword),
    );
  }, [candidateSkills, skillSearch]);

  const selectedBinding = selectedSkillKey ? bindingMap.get(selectedSkillKey) : undefined;
  const selectedRuntimeSkill = selectedSkillKey ? runtimeSkillMap.get(selectedSkillKey) : undefined;

  const handleInstall = useCallback(async (skillKey?: string) => {
    const targetSkillKey = skillKey ?? selectedSkillKey;
    if (!targetSkillKey) {
      return;
    }
    setSelectedSkillKey(targetSkillKey);
    setSaving(true);
    setError(undefined);
    try {
      await installInstanceSkill(instanceId, targetSkillKey);
      await Promise.all([
        loadData(),
        loadRuntimeSkills(),
        loadSelectedSkillDetail(targetSkillKey),
      ]);
      messageApi.success("Skill installed to this instance");
    } catch (apiError) {
      const messageText = apiError instanceof Error ? apiError.message : String(apiError);
      setError(messageText);
      messageApi.error("Failed to install skill");
    } finally {
      setSaving(false);
    }
  }, [instanceId, loadData, loadRuntimeSkills, loadSelectedSkillDetail, messageApi, selectedSkillKey]);

  const handleUninstall = useCallback(async (skillKey?: string) => {
    const targetSkillKey = skillKey ?? selectedSkillKey;
    if (!targetSkillKey) {
      return;
    }
    setSelectedSkillKey(targetSkillKey);
    setSaving(true);
    setError(undefined);
    try {
      await uninstallInstanceSkill(instanceId, targetSkillKey);
      await Promise.all([
        loadData(),
        loadRuntimeSkills(),
        loadSelectedSkillDetail(targetSkillKey),
      ]);
      messageApi.success("Skill removed from this instance");
    } catch (apiError) {
      const messageText = apiError instanceof Error ? apiError.message : String(apiError);
      setError(messageText);
      messageApi.error("Failed to uninstall skill");
    } finally {
      setSaving(false);
    }
  }, [instanceId, loadData, loadRuntimeSkills, loadSelectedSkillDetail, messageApi, selectedSkillKey]);

  return (
    <>
      {contextHolder}
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <div className="tab-section-header">
          <div className="tab-section-title">
            <span className="tab-section-icon is-skill"><Wrench size={16} /></span>
            Skill
          </div>
          <Space size="small" wrap>
            <Tag color="green">Installed {installedSkills.length}</Tag>
            <Tag color="blue">Available {candidateSkills.length}</Tag>
            <Tag color={runtimeError ? "red" : runtimeLoading ? "processing" : "gold"}>
              {runtimeError ? "Runtime unavailable" : runtimeLoading ? "Loading runtime" : `Runtime loaded ${runtimeSkills.length}`}
            </Tag>
            <Button
              size="small"
              loading={loading || runtimeLoading}
              onClick={() => {
                void loadData(true);
                void loadRuntimeSkills();
              }}
              icon={<RefreshCw size={12} />}
            >
              Refresh
            </Button>
          </Space>
        </div>

        {error ? <Alert type="error" showIcon message={error} /> : null}
        {runtimeError ? (
          <Alert
            type="warning"
            showIcon
            message="Runtime skill status is temporarily unavailable"
            description={runtimeError}
          />
        ) : null}

        {installedSkills.length > 0 ? (
          <div className="agent-prompt-card">
            <div className="agent-prompt-header">
              <span className="agent-prompt-header-title">Installed</span>
            </div>
            <div className="agent-prompt-body">
              <div className="skill-card-grid-v2">
                {installedSkills.map((item) => {
                  const selected = selectedSkillKey === item.skillKey;
                  const loaded = runtimeSkillMap.has(item.skillKey);
                  return (
                    <div key={item.skillKey} className="selector-card-shell">
                      <button
                        type="button"
                        className={`skill-card-v2 ${selected ? "is-selected" : ""}`}
                        onClick={() => setSelectedSkillKey(item.skillKey)}
                      >
                        <div className="skill-card-v2-icon is-allowed">
                          <Zap size={18} />
                        </div>
                        <strong className="skill-card-v2-title">{item.displayName || item.skillKey}</strong>
                        <p className="skill-card-v2-path">{item.skillKey}</p>
                        <Space size={4} wrap>
                          <Tag color="green">Installed</Tag>
                          {loaded ? <Tag color="gold">Loaded in runtime</Tag> : <Tag>Pending runtime sync</Tag>}
                          {!item.enabled ? <Tag color="red">Globally disabled</Tag> : null}
                        </Space>
                      </button>
                      <Button
                        size="small"
                        danger
                        icon={<Trash2 size={14} />}
                        className="selector-card-hover-action"
                        loading={saving && selectedSkillKey === item.skillKey}
                        disabled={saving}
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleUninstall(item.skillKey);
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
          !loading ? <Empty description="No installed skills" /> : null
        )}

        <div className="agent-prompt-card">
          <div className="agent-prompt-header">
            <span className="agent-prompt-header-title">Available</span>
            <Input
              placeholder="Search available skills"
              prefix={<Search size={14} style={{ opacity: 0.45 }} />}
              allowClear
              style={{ width: 240 }}
              value={skillSearch}
              onChange={(event) => setSkillSearch(event.target.value)}
            />
          </div>
          <div className="agent-prompt-body">
            {filteredCandidateSkills.length > 0 ? (
              <div className="skill-card-grid-v2">
                {filteredCandidateSkills.map((item) => {
                  const selected = selectedSkillKey === item.skillKey;
                  return (
                    <div key={item.skillKey} className="selector-card-shell">
                      <button
                        type="button"
                        className={`skill-card-v2 ${selected ? "is-selected" : ""}`}
                        onClick={() => setSelectedSkillKey(item.skillKey)}
                      >
                        <div className="skill-card-v2-icon">
                          <Download size={18} />
                        </div>
                        <strong className="skill-card-v2-title">{item.displayName || item.skillKey}</strong>
                        <p className="skill-card-v2-path">{item.skillKey}</p>
                        <Tag color="blue">Not installed</Tag>
                      </button>
                      <Button
                        size="small"
                        type="primary"
                        icon={<Download size={14} />}
                        className="selector-card-hover-action"
                        loading={saving && selectedSkillKey === item.skillKey}
                        disabled={saving}
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleInstall(item.skillKey);
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
                description={skillSearch ? "No matching available skills" : "No available skills"}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </div>
        </div>

        {selectedSkillDetail ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="agent-prompt-card">
              <div className="agent-prompt-header">
                <span className="agent-prompt-header-title">
                  {selectedSkillDetail.displayName || selectedSkillDetail.skillKey}
                </span>
                <Space size="small" wrap>
                  {selectedBinding ? (
                    <Button danger size="small" loading={saving} onClick={() => void handleUninstall()}>
                      Uninstall
                    </Button>
                  ) : (
                    <Button
                      type="primary"
                      size="small"
                      loading={saving}
                      disabled={!selectedSkillDetail.enabled}
                      onClick={() => void handleInstall(selectedSkillDetail.skillKey)}
                    >
                      Install
                    </Button>
                  )}
                </Space>
              </div>

              <div className="agent-prompt-body is-spacious">
                <Space direction="vertical" style={{ width: "100%" }} size="middle">
                  <div className="agent-detail-grid">
                    <div className="agent-detail-prop">
                      <span className="agent-detail-prop-label">Skill Key</span>
                      <span className="agent-detail-prop-value">{selectedSkillDetail.skillKey}</span>
                    </div>
                    <div className="agent-detail-prop">
                      <span className="agent-detail-prop-label">Status</span>
                      <span className="agent-detail-prop-value">{selectedBinding ? "Installed" : "Not installed"}</span>
                    </div>
                    <div className="agent-detail-prop">
                      <span className="agent-detail-prop-label">Runtime Loaded</span>
                      <span className="agent-detail-prop-value">
                        {selectedRuntimeSkill ? "Loaded" : "Pending until next runtime sync"}
                      </span>
                    </div>
                    <div className="agent-detail-prop">
                      <span className="agent-detail-prop-label">Enabled</span>
                      <span className="agent-detail-prop-value">{selectedSkillDetail.enabled ? "true" : "false"}</span>
                    </div>
                    <div className="agent-detail-prop is-wide">
                      <span className="agent-detail-prop-label">Description</span>
                      <span className="agent-detail-prop-value">{selectedSkillDetail.description || "-"}</span>
                    </div>
                    <div className="agent-detail-prop is-wide">
                      <span className="agent-detail-prop-label">Source Ref</span>
                      <span className="agent-detail-prop-value">{selectedSkillDetail.sourceRef || "-"}</span>
                    </div>
                    {selectedBinding ? (
                      <div className="agent-detail-prop">
                        <span className="agent-detail-prop-label">Installed At</span>
                        <span className="agent-detail-prop-value">{formatTimestamp(selectedBinding.updatedAt)}</span>
                      </div>
                    ) : null}
                    {selectedRuntimeSkill ? (
                      <div className="agent-detail-prop is-wide">
                        <span className="agent-detail-prop-label">Runtime Path</span>
                        <span className="agent-detail-prop-value">{selectedRuntimeSkill.path}</span>
                      </div>
                    ) : null}
                  </div>

                  {detailLoading ? (
                    <Text type="secondary">Loading skill detail...</Text>
                  ) : (
                    <Input.TextArea
                      className="prompt-textarea prompt-textarea-skill"
                      rows={20}
                      readOnly
                      value={selectedSkillDetail.skillMd}
                    />
                  )}
                </Space>
              </div>
            </div>
          </motion.div>
        ) : (
          !loading ? <Empty description="Select a skill to view details" /> : null
        )}
      </Space>
    </>
  );
}