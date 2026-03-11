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
import { RefreshCw, Shield, Wrench, Zap } from "lucide-react";
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
  selectedAgentAllowedTools,
}: {
  instanceId: string;
  selectedAgentAllowedTools: string[];
}) {
  const [availableSkills, setAvailableSkills] = useState<SkillBaselineSummary[]>([]);
  const [bindings, setBindings] = useState<InstanceSkillBinding[]>([]);
  const [runtimeSkills, setRuntimeSkills] = useState<SkillDescriptor[]>([]);
  const [selectedSkillKey, setSelectedSkillKey] = useState<string>();
  const [selectedSkillDetail, setSelectedSkillDetail] = useState<SkillBaseline>();
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

  const loadBindingsAndBaselines = useCallback(async (showSuccess?: boolean) => {
    setLoading(true);
    setError(undefined);
    try {
      const [baselineResponse, bindingResponse] = await Promise.all([
        listSkillBaselines(),
        listInstanceSkillBindings(instanceId),
      ]);
      setAvailableSkills(baselineResponse.items);
      setBindings(bindingResponse.items);
      setSelectedSkillKey((current) => {
        if (current && baselineResponse.items.some((item) => item.skillKey === current)) {
          return current;
        }
        if (bindingResponse.items.length > 0) {
          return bindingResponse.items[0].skillKey;
        }
        return baselineResponse.items[0]?.skillKey;
      });
      if (showSuccess) {
        messageApi.success("已刷新实例 Skill");
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
    void loadBindingsAndBaselines();
    void loadRuntimeSkills();
  }, [loadBindingsAndBaselines, loadRuntimeSkills]);

  useEffect(() => {
    void loadSelectedSkillDetail(selectedSkillKey);
  }, [loadSelectedSkillDetail, selectedSkillKey]);

  const bindingMap = useMemo(() => new Map(bindings.map((item) => [item.skillKey, item])), [bindings]);
  const runtimeSkillMap = useMemo(() => new Map(runtimeSkills.map((item) => [item.id, item])), [runtimeSkills]);
  const selectedBinding = selectedSkillKey ? bindingMap.get(selectedSkillKey) : undefined;
  const selectedRuntimeSkill = selectedSkillKey ? runtimeSkillMap.get(selectedSkillKey) : undefined;
  const selectedSkillNotAllowed = Boolean(
    selectedSkillKey
      && selectedAgentAllowedTools.length > 0
      && !selectedAgentAllowedTools.includes(selectedSkillKey),
  );

  const handleInstall = useCallback(async () => {
    if (!selectedSkillKey) {
      return;
    }
    setSaving(true);
    try {
      await installInstanceSkill(instanceId, selectedSkillKey);
      await Promise.all([
        loadBindingsAndBaselines(),
        loadRuntimeSkills(),
        loadSelectedSkillDetail(selectedSkillKey),
      ]);
      messageApi.success("Skill 已装载到当前实例");
    } catch (apiError) {
      const messageText = apiError instanceof Error ? apiError.message : String(apiError);
      setError(messageText);
      messageApi.error("装载 Skill 失败");
    } finally {
      setSaving(false);
    }
  }, [instanceId, loadBindingsAndBaselines, loadRuntimeSkills, loadSelectedSkillDetail, messageApi, selectedSkillKey]);

  const handleUninstall = useCallback(async () => {
    if (!selectedSkillKey) {
      return;
    }
    setSaving(true);
    try {
      await uninstallInstanceSkill(instanceId, selectedSkillKey);
      await Promise.all([
        loadBindingsAndBaselines(),
        loadRuntimeSkills(),
        loadSelectedSkillDetail(selectedSkillKey),
      ]);
      messageApi.success("Skill 已从当前实例卸载");
    } catch (apiError) {
      const messageText = apiError instanceof Error ? apiError.message : String(apiError);
      setError(messageText);
      messageApi.error("卸载 Skill 失败");
    } finally {
      setSaving(false);
    }
  }, [instanceId, loadBindingsAndBaselines, loadRuntimeSkills, loadSelectedSkillDetail, messageApi, selectedSkillKey]);

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
              void loadBindingsAndBaselines(true);
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
          message="Skill 现在是实例级装载"
          description="这里维护的是当前 Claw 实例装载了哪些 Skill。装载关系会物化到实例专属 skills 目录，并统一映射到容器内的 /workspace/skills。"
        />

        {!loading && availableSkills.length === 0 ? (
          <div className="empty-panel">暂无可装载 Skill</div>
        ) : null}

        {availableSkills.length > 0 ? (
          <>
            <Space size="small" wrap>
              <Tag color="blue">可用 {availableSkills.length}</Tag>
              <Tag color="green">已装载 {bindings.length}</Tag>
              <Tag color="gold">运行时已加载 {runtimeSkills.length}</Tag>
            </Space>

            <div className="skill-card-grid-v2">
              {availableSkills.map((item) => {
                const selected = selectedSkillKey === item.skillKey;
                const installed = bindingMap.has(item.skillKey);
                const loaded = runtimeSkillMap.has(item.skillKey);
                const allowed = selectedAgentAllowedTools.length === 0 || selectedAgentAllowedTools.includes(item.skillKey);
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
                      {installed ? <Tag color="green">已装载</Tag> : <Tag>未装载</Tag>}
                      {loaded ? <Tag color="gold">运行中已加载</Tag> : null}
                      {!item.enabled ? <Tag color="red">已全局禁用</Tag> : null}
                    </Space>
                  </button>
                );
              })}
            </div>
          </>
        ) : null}

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
                      onClick={() => void handleInstall()}
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
                      message="当前选中的 Agent 不允许调用这个 Skill"
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
        ) : (!loading ? (
          <Empty description="选择一个 Skill 查看详情" />
        ) : null)}
      </Space>
    </>
  );
}
