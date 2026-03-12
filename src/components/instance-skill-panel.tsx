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
        messageApi.success("Skill 列表已刷新");
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
      messageApi.success("Skill 已装载到当前实例");
    } catch (apiError) {
      const messageText = apiError instanceof Error ? apiError.message : String(apiError);
      setError(messageText);
      messageApi.error("装载 Skill 失败");
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
      messageApi.success("Skill 已从当前实例卸载");
    } catch (apiError) {
      const messageText = apiError instanceof Error ? apiError.message : String(apiError);
      setError(messageText);
      messageApi.error("卸载 Skill 失败");
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
            <Tag color="green">已装载 {installedSkills.length}</Tag>
            <Tag color="blue">可装载 {candidateSkills.length}</Tag>
            <Tag color={runtimeError ? "red" : runtimeLoading ? "processing" : "gold"}>
              {runtimeError ? "运行时不可用" : runtimeLoading ? "正在读取运行时" : `运行时已加载 ${runtimeSkills.length}`}
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
              刷新
            </Button>
          </Space>
        </div>

        {error ? <Alert type="error" showIcon message={error} /> : null}
        {runtimeError ? (
          <Alert
            type="warning"
            showIcon
            message="运行时 Skill 状态暂时不可用"
            description={runtimeError}
          />
        ) : null}

        {installedSkills.length > 0 ? (
          <div className="agent-prompt-card">
            <div className="agent-prompt-header">
              <span className="agent-prompt-header-title">已装载</span>
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
                          <Tag color="green">已装载</Tag>
                          {loaded ? <Tag color="gold">运行时已加载</Tag> : <Tag>等待运行时同步</Tag>}
                          {!item.enabled ? <Tag color="red">全局已禁用</Tag> : null}
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
                        卸载
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          !loading ? <Empty description="暂无已装载 Skill" /> : null
        )}

        <div className="agent-prompt-card">
          <div className="agent-prompt-header">
            <span className="agent-prompt-header-title">可装载</span>
            <Input
              placeholder="搜索可装载 Skill"
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
                        <Tag color="blue">未装载</Tag>
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
                        装载
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Empty
                description={skillSearch ? "没有匹配的可装载 Skill" : "暂无可装载 Skill"}
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
                      装载
                    </Button>
                  )}
                </Space>
              </div>

              <div className="agent-prompt-body is-spacious">
                <Space direction="vertical" style={{ width: "100%" }} size="middle">
                  <div className="agent-detail-grid">
                    <div className="agent-detail-prop">
                      <span className="agent-detail-prop-label">Skill 标识</span>
                      <span className="agent-detail-prop-value">{selectedSkillDetail.skillKey}</span>
                    </div>
                    <div className="agent-detail-prop">
                      <span className="agent-detail-prop-label">状态</span>
                      <span className="agent-detail-prop-value">{selectedBinding ? "已装载" : "未装载"}</span>
                    </div>
                    <div className="agent-detail-prop">
                      <span className="agent-detail-prop-label">运行时状态</span>
                      <span className="agent-detail-prop-value">
                        {selectedRuntimeSkill ? "已加载" : "等待下一次运行时同步"}
                      </span>
                    </div>
                    <div className="agent-detail-prop">
                      <span className="agent-detail-prop-label">是否启用</span>
                      <span className="agent-detail-prop-value">{selectedSkillDetail.enabled ? "true" : "false"}</span>
                    </div>
                    <div className="agent-detail-prop is-wide">
                      <span className="agent-detail-prop-label">描述</span>
                      <span className="agent-detail-prop-value">{selectedSkillDetail.description || "-"}</span>
                    </div>
                    <div className="agent-detail-prop is-wide">
                      <span className="agent-detail-prop-label">来源引用</span>
                      <span className="agent-detail-prop-value">{selectedSkillDetail.sourceRef || "-"}</span>
                    </div>
                    {selectedBinding ? (
                      <div className="agent-detail-prop">
                        <span className="agent-detail-prop-label">装载时间</span>
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

                  {detailLoading ? (
                    <Text type="secondary">正在加载 Skill 详情...</Text>
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
          !loading ? <Empty description="请选择一个 Skill 查看详情" /> : null
        )}
      </Space>
    </>
  );
}
