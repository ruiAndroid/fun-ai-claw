"use client";

import {
  getSkillBaseline,
  installInstanceSkill,
  listInstanceAgentBindings,
  listInstanceSkillBindings,
  listInstanceSkills,
  listSkillBaselines,
  uninstallInstanceSkill,
} from "@/lib/control-api";
import type {
  InstanceAgentBinding,
  InstanceSkillBinding,
  SkillBaseline,
  SkillBaselineSummary,
  SkillDescriptor,
} from "@/types/contracts";
import { Alert, Button, Empty, Input, Select, Space, Tag, Typography, message } from "antd";
import { motion } from "framer-motion";
import { Plus, RefreshCw, Shield, Wrench, Zap } from "lucide-react";
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
  preferredAgentKey,
}: {
  instanceId: string;
  preferredAgentKey?: string;
}) {
  const [availableSkills, setAvailableSkills] = useState<SkillBaselineSummary[]>([]);
  const [bindings, setBindings] = useState<InstanceSkillBinding[]>([]);
  const [runtimeSkills, setRuntimeSkills] = useState<SkillDescriptor[]>([]);
  const [agentBindings, setAgentBindings] = useState<InstanceAgentBinding[]>([]);
  const [selectedSkillKey, setSelectedSkillKey] = useState<string>();
  const [selectedSkillDetail, setSelectedSkillDetail] = useState<SkillBaseline>();
  const [candidateSkillKey, setCandidateSkillKey] = useState<string>();
  const [selectedAgentKey, setSelectedAgentKey] = useState<string>();
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
      const [baselineResponse, bindingResponse, agentBindingResponse] = await Promise.all([
        listSkillBaselines(),
        listInstanceSkillBindings(instanceId),
        listInstanceAgentBindings(instanceId),
      ]);
      const allSkills = baselineResponse.items;
      const currentBindings = bindingResponse.items;
      const currentAgentBindings = agentBindingResponse.items;
      const installedSkillKeySet = new Set(currentBindings.map((item) => item.skillKey));
      const installedSkills = allSkills.filter((item) => installedSkillKeySet.has(item.skillKey));
      const candidateSkills = allSkills.filter((item) => !installedSkillKeySet.has(item.skillKey) && item.enabled);

      setAvailableSkills(allSkills);
      setBindings(currentBindings);
      setAgentBindings(currentAgentBindings);
      setCandidateSkillKey((current) => {
        if (current && candidateSkills.some((item) => item.skillKey === current)) {
          return current;
        }
        return candidateSkills[0]?.skillKey;
      });
      setSelectedSkillKey((current) => {
        if (current && allSkills.some((item) => item.skillKey === current)) {
          return current;
        }
        if (installedSkills.length > 0) {
          return installedSkills[0].skillKey;
        }
        return candidateSkills[0]?.skillKey;
      });
      setSelectedAgentKey((current) => {
        if (current && currentAgentBindings.some((item) => item.agentKey === current)) {
          return current;
        }
        if (preferredAgentKey && currentAgentBindings.some((item) => item.agentKey === preferredAgentKey)) {
          return preferredAgentKey;
        }
        return currentAgentBindings[0]?.agentKey;
      });
      if (showSuccess) {
        messageApi.success("已刷新实例 Skill");
      }
    } catch (apiError) {
      setAvailableSkills([]);
      setBindings([]);
      setAgentBindings([]);
      setSelectedSkillKey(undefined);
      setCandidateSkillKey(undefined);
      setSelectedAgentKey(undefined);
      setSelectedSkillDetail(undefined);
      setError(apiError instanceof Error ? apiError.message : String(apiError));
    } finally {
      setLoading(false);
    }
  }, [instanceId, messageApi, preferredAgentKey]);

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
  const agentBindingMap = useMemo(() => new Map(agentBindings.map((item) => [item.agentKey, item])), [agentBindings]);

  const installedSkills = useMemo(
    () => availableSkills.filter((item) => bindingMap.has(item.skillKey)),
    [availableSkills, bindingMap],
  );
  const candidateSkills = useMemo(
    () => availableSkills.filter((item) => !bindingMap.has(item.skillKey) && item.enabled),
    [availableSkills, bindingMap],
  );

  const selectedBinding = selectedSkillKey ? bindingMap.get(selectedSkillKey) : undefined;
  const selectedRuntimeSkill = selectedSkillKey ? runtimeSkillMap.get(selectedSkillKey) : undefined;
  const activeAgentBinding = selectedAgentKey
    ? agentBindingMap.get(selectedAgentKey) ?? agentBindings[0]
    : agentBindings[0];
  const activeAgentAllowedTools = activeAgentBinding?.allowedTools ?? [];
  const selectedSkillNotAllowed = Boolean(
    activeAgentBinding
      && selectedSkillKey
      && activeAgentAllowedTools.length > 0
      && !activeAgentAllowedTools.includes(selectedSkillKey),
  );

  const handleInstall = useCallback(async (skillKey?: string) => {
    const targetSkillKey = skillKey ?? selectedSkillKey;
    if (!targetSkillKey) {
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      await installInstanceSkill(instanceId, targetSkillKey);
      setSelectedSkillKey(targetSkillKey);
      await Promise.all([
        loadData(),
        loadRuntimeSkills(),
        loadSelectedSkillDetail(targetSkillKey),
      ]);
      messageApi.success("Skill 已装载到当前实例。若该实例是旧容器，重启后会补齐新挂载。");
    } catch (apiError) {
      const messageText = apiError instanceof Error ? apiError.message : String(apiError);
      setError(messageText);
      messageApi.error("装载 Skill 失败");
    } finally {
      setSaving(false);
    }
  }, [instanceId, loadData, loadRuntimeSkills, loadSelectedSkillDetail, messageApi, selectedSkillKey]);

  const handleUninstall = useCallback(async () => {
    if (!selectedSkillKey) {
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      await uninstallInstanceSkill(instanceId, selectedSkillKey);
      await Promise.all([
        loadData(),
        loadRuntimeSkills(),
      ]);
      messageApi.success("Skill 已从当前实例卸载");
    } catch (apiError) {
      const messageText = apiError instanceof Error ? apiError.message : String(apiError);
      setError(messageText);
      messageApi.error("卸载 Skill 失败");
    } finally {
      setSaving(false);
    }
  }, [instanceId, loadData, loadRuntimeSkills, messageApi, selectedSkillKey]);

  return (
    <>
      {contextHolder}
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <div className="tab-section-header">
          <div className="tab-section-title">
            <span className="tab-section-icon is-skill"><Wrench size={16} /></span>
            Skill
          </div>
          <Button
            size="small"
            loading={loading || runtimeLoading}
            onClick={() => {
              void loadData(true);
              void loadRuntimeSkills();
            }}
            icon={<RefreshCw size={12} />}
          >
            刷新
          </Button>
        </div>

        {error ? <Alert type="error" showIcon message={error} /> : null}
        {runtimeError ? (
          <Alert
            type="warning"
            showIcon
            message="运行时 Skill 列表暂不可用"
            description={runtimeError}
          />
        ) : null}

        <Alert
          type="info"
          showIcon
          message="这里只展示当前实例已装载的 Skill"
          description={
            activeAgentBinding
              ? `当前正按 Agent「${activeAgentBinding.displayName || activeAgentBinding.agentKey}」的 allowed_tools 视角显示 Skill 兼容性。`
              : "未选择实例 Agent 时，仅展示 Skill 装载状态，不做 allowed_tools 兼容性限制提示。"
          }
        />

        <div className="agent-prompt-card">
          <div className="agent-prompt-header">
            <span className="agent-prompt-header-title">Skill 视角</span>
            <Space size="small" wrap>
              <Select
                style={{ minWidth: 320 }}
                placeholder={agentBindings.length > 0 ? "选择一个实例 Agent 作为视角" : "当前实例还没有装载 Agent"}
                value={activeAgentBinding?.agentKey}
                onChange={setSelectedAgentKey}
                options={agentBindings.map((item) => ({
                  value: item.agentKey,
                  label: `${item.displayName || item.agentKey} (${item.agentKey})`,
                }))}
                disabled={agentBindings.length === 0}
                showSearch
                optionFilterProp="label"
              />
            </Space>
          </div>
          <div className="agent-prompt-body">
            <Space size="small" wrap>
              <Tag color="green">已装载 {installedSkills.length}</Tag>
              <Tag color="blue">可添加 {candidateSkills.length}</Tag>
              <Tag color="gold">运行时已加载 {runtimeSkills.length}</Tag>
              {activeAgentBinding ? <Tag color="purple">视角 Agent {activeAgentBinding.agentKey}</Tag> : null}
            </Space>
          </div>
        </div>

        <div className="agent-prompt-card">
          <div className="agent-prompt-header">
            <span className="agent-prompt-header-title">添加 Skill</span>
            <Space size="small" wrap>
              <Select
                style={{ minWidth: 320 }}
                placeholder={candidateSkills.length > 0 ? "选择一个未装载的 Skill" : "没有可添加的 Skill"}
                value={candidateSkillKey}
                onChange={(value) => {
                  setCandidateSkillKey(value);
                  setSelectedSkillKey(value);
                }}
                options={candidateSkills.map((item) => ({
                  value: item.skillKey,
                  label: `${item.displayName || item.skillKey} (${item.skillKey})`,
                }))}
                disabled={candidateSkills.length === 0 || saving}
                showSearch
                optionFilterProp="label"
              />
              <Button
                type="primary"
                icon={<Plus size={14} />}
                disabled={!candidateSkillKey || saving}
                loading={saving}
                onClick={() => void handleInstall(candidateSkillKey)}
              >
                添加并装载
              </Button>
            </Space>
          </div>
        </div>

        {installedSkills.length > 0 ? (
          <div className="skill-card-grid-v2">
            {installedSkills.map((item) => {
              const selected = selectedSkillKey === item.skillKey;
              const loaded = runtimeSkillMap.has(item.skillKey);
              const allowed = !activeAgentBinding || activeAgentAllowedTools.length === 0 || activeAgentAllowedTools.includes(item.skillKey);
              return (
                <button
                  key={item.skillKey}
                  type="button"
                  className={`skill-card-v2 ${selected ? "is-selected" : ""}`}
                  onClick={() => setSelectedSkillKey(item.skillKey)}
                >
                  <div className={`skill-card-v2-icon ${allowed ? "is-allowed" : "is-blocked"}`}>
                    {allowed ? <Zap size={18} /> : <Shield size={18} />}
                  </div>
                  <strong className="skill-card-v2-title">{item.displayName || item.skillKey}</strong>
                  <p className="skill-card-v2-path">{item.skillKey}</p>
                  <Space size={4} wrap>
                    <Tag color="green">已装载</Tag>
                    {loaded ? <Tag color="gold">运行中已加载</Tag> : <Tag>待运行时生效</Tag>}
                    {!allowed ? <Tag color="red">当前 Agent 不允许</Tag> : null}
                    {!item.enabled ? <Tag color="red">已全局禁用</Tag> : null}
                  </Space>
                </button>
              );
            })}
          </div>
        ) : (
          !loading ? (
            <Empty description="当前实例还没有装载 Skill" />
          ) : null
        )}

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
                      卸载
                    </Button>
                  ) : (
                    <Button
                      type="primary"
                      size="small"
                      loading={saving}
                      disabled={!selectedSkillDetail.enabled}
                      onClick={() => void handleInstall(selectedSkillDetail.skillKey)}
                    >
                      装载到当前 Claw
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
                      <span className="agent-detail-prop-label">当前实例状态</span>
                      <span className="agent-detail-prop-value">{selectedBinding ? "已装载" : "未装载"}</span>
                    </div>
                    <div className="agent-detail-prop">
                      <span className="agent-detail-prop-label">运行时状态</span>
                      <span className="agent-detail-prop-value">{selectedRuntimeSkill ? "已加载" : "未加载 / 待重启"}</span>
                    </div>
                    <div className="agent-detail-prop">
                      <span className="agent-detail-prop-label">全局启用</span>
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
                        <span className="agent-detail-prop-label">装载更新时间</span>
                        <span className="agent-detail-prop-value">{formatTimestamp(selectedBinding.updatedAt)}</span>
                      </div>
                    ) : null}
                    {selectedRuntimeSkill ? (
                      <div className="agent-detail-prop is-wide">
                        <span className="agent-detail-prop-label">运行时路径</span>
                        <span className="agent-detail-prop-value">{selectedRuntimeSkill.path}</span>
                      </div>
                    ) : null}
                  </div>

                  {selectedSkillNotAllowed ? (
                    <Alert
                      type="warning"
                      showIcon
                      message={`当前选中的 Agent「${activeAgentBinding?.displayName || activeAgentBinding?.agentKey}」不允许调用这个 Skill`}
                    />
                  ) : null}

                  {detailLoading ? (
                    <Text type="secondary">Skill 详情加载中...</Text>
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
          !loading ? <Empty description="选择一个 Skill 查看详情" /> : null
        )}
      </Space>
    </>
  );
}
