"use client";

import { getInstanceRoutingConfig, upsertInstanceRoutingConfig } from "@/lib/control-api";
import type {
  InstanceRoutingConfig,
  ModelRouteConfigItem,
  QueryClassificationRuleConfigItem,
} from "@/types/contracts";
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  InputNumber,
  Select,
  Skeleton,
  Space,
  Switch,
  Tag,
  Typography,
  message,
} from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";

const { Text } = Typography;

const DEFAULT_RULE_PRIORITY = 100;
const DEFAULT_RULE_MIN_LENGTH = 1;
const DEFAULT_RULE_MAX_LENGTH = 4000;

function createEmptyRoute(): ModelRouteConfigItem {
  return {
    hint: "",
    provider: "",
    model: "",
  };
}

function createEmptyRule(): QueryClassificationRuleConfigItem {
  return {
    hint: "",
    keywords: [],
    literals: [],
    priority: DEFAULT_RULE_PRIORITY,
    minLength: DEFAULT_RULE_MIN_LENGTH,
    maxLength: DEFAULT_RULE_MAX_LENGTH,
  };
}

function normalizeRoute(route: ModelRouteConfigItem): ModelRouteConfigItem {
  return {
    hint: route.hint.trim(),
    provider: route.provider.trim(),
    model: route.model.trim(),
  };
}

function normalizeRule(rule: QueryClassificationRuleConfigItem): QueryClassificationRuleConfigItem {
  return {
    hint: rule.hint.trim(),
    keywords: (rule.keywords ?? []).map((item) => item.trim()).filter(Boolean),
    literals: (rule.literals ?? []).map((item) => item.trim()).filter(Boolean),
    priority: rule.priority ?? DEFAULT_RULE_PRIORITY,
    minLength: rule.minLength ?? DEFAULT_RULE_MIN_LENGTH,
    maxLength: rule.maxLength ?? DEFAULT_RULE_MAX_LENGTH,
  };
}

function normalizeRoutingConfig(config: InstanceRoutingConfig) {
  return {
    queryClassificationEnabled: config.queryClassificationEnabled,
    modelRoutes: (config.modelRoutes ?? []).map(normalizeRoute),
    queryClassificationRules: (config.queryClassificationRules ?? []).map(normalizeRule),
  };
}

function isRoutingConfigEqual(
  baseline: ReturnType<typeof normalizeRoutingConfig> | undefined,
  current: ReturnType<typeof normalizeRoutingConfig>
) {
  if (!baseline) {
    return false;
  }
  return JSON.stringify(baseline) === JSON.stringify(current);
}

export function InstanceRoutingConfigPanel({
  instanceId,
  disabled,
  onSaved,
}: {
  instanceId: string;
  disabled?: boolean;
  onSaved?: () => void | Promise<void>;
}) {
  const [config, setConfig] = useState<InstanceRoutingConfig>();
  const [modelRoutes, setModelRoutes] = useState<ModelRouteConfigItem[]>([]);
  const [queryClassificationEnabled, setQueryClassificationEnabled] = useState(false);
  const [queryClassificationRules, setQueryClassificationRules] = useState<QueryClassificationRuleConfigItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [messageApi, contextHolder] = message.useMessage();

  const applyResponse = useCallback((response: InstanceRoutingConfig) => {
    setConfig(response);
    setModelRoutes((response.modelRoutes ?? []).map(normalizeRoute));
    setQueryClassificationEnabled(response.queryClassificationEnabled);
    setQueryClassificationRules((response.queryClassificationRules ?? []).map(normalizeRule));
  }, []);

  const loadConfig = useCallback(async (showSuccess?: boolean) => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await getInstanceRoutingConfig(instanceId);
      applyResponse(response);
      if (showSuccess) {
        messageApi.success("已刷新路由配置");
      }
    } catch (apiError) {
      setConfig(undefined);
      setModelRoutes([]);
      setQueryClassificationEnabled(false);
      setQueryClassificationRules([]);
      setError(apiError instanceof Error ? apiError.message : String(apiError));
    } finally {
      setLoading(false);
    }
  }, [applyResponse, instanceId, messageApi]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const baseline = useMemo(
    () => (config ? normalizeRoutingConfig(config) : undefined),
    [config]
  );
  const current = useMemo(
    () => ({
      queryClassificationEnabled,
      modelRoutes: modelRoutes.map(normalizeRoute),
      queryClassificationRules: queryClassificationRules.map(normalizeRule),
    }),
    [modelRoutes, queryClassificationEnabled, queryClassificationRules]
  );
  const dirty = useMemo(() => Boolean(config) && !isRoutingConfigEqual(baseline, current), [baseline, config, current]);

  const updateRoute = useCallback((index: number, patch: Partial<ModelRouteConfigItem>) => {
    setModelRoutes((currentRoutes) =>
      currentRoutes.map((route, routeIndex) => (routeIndex === index ? { ...route, ...patch } : route))
    );
  }, []);

  const updateRule = useCallback((index: number, patch: Partial<QueryClassificationRuleConfigItem>) => {
    setQueryClassificationRules((currentRules) =>
      currentRules.map((rule, ruleIndex) => (ruleIndex === index ? { ...rule, ...patch } : rule))
    );
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(undefined);
    try {
      const response = await upsertInstanceRoutingConfig(instanceId, {
        queryClassificationEnabled: current.queryClassificationEnabled,
        modelRoutes: current.modelRoutes,
        queryClassificationRules: current.queryClassificationEnabled ? current.queryClassificationRules : [],
        updatedBy: "console",
      });
      applyResponse(response);
      messageApi.success("已保存路由配置");
      await onSaved?.();
    } catch (apiError) {
      const messageText = apiError instanceof Error ? apiError.message : String(apiError);
      setError(messageText);
      messageApi.error("保存路由配置失败");
    } finally {
      setSaving(false);
    }
  }, [applyResponse, current, instanceId, messageApi, onSaved]);

  return (
    <>
      {contextHolder}
      <Card
        className="sub-glass-card"
        size="small"
        title="路由配置"
        extra={(
          <Space size="small" wrap>
            <Tag color={dirty ? "orange" : "default"}>
              {dirty ? "有未保存修改" : "已同步"}
            </Tag>
            <Button size="small" onClick={() => void loadConfig(true)} loading={loading} disabled={saving}>
              刷新
            </Button>
            <Button
              type="primary"
              size="small"
              onClick={() => void handleSave()}
              loading={saving}
              disabled={disabled || !dirty || loading}
            >
              保存路由配置
            </Button>
          </Space>
        )}
      >
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          {error ? (
            <Alert
              type="error"
              showIcon
              message="路由配置加载或保存失败"
              description={error}
            />
          ) : null}

          {disabled ? (
            <Alert
              type="warning"
              showIcon
              message="请先处理 config.toml 的未保存修改"
              description="结构化路由配置和原始 config.toml 编辑的是同一份实例配置。为避免互相覆盖，当前先锁定路由配置编辑区。"
            />
          ) : null}

          {(loading && !config) ? (
            <Skeleton active paragraph={{ rows: 6 }} />
          ) : (
            <>
              <Text type="secondary">
                这里维护的是实例级 `model_routes` 与 `query_classification.rules`。保存后会回写到同一份
                `config.toml`，并沿用现有实例配置生效链路。
              </Text>

              <Card
                type="inner"
                size="small"
                title="model_routes"
                extra={(
                  <Button size="small" onClick={() => setModelRoutes((currentRoutes) => [...currentRoutes, createEmptyRoute()])} disabled={disabled || loading || saving}>
                    新增路由
                  </Button>
                )}
              >
                <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                  {modelRoutes.length === 0 ? (
                    <Empty description="暂无路由配置" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  ) : modelRoutes.map((route, index) => (
                    <Card
                      key={`route-${index}`}
                      size="small"
                      extra={(
                        <Button
                          danger
                          size="small"
                          disabled={disabled || loading || saving}
                          onClick={() => setModelRoutes((currentRoutes) => currentRoutes.filter((_, routeIndex) => routeIndex !== index))}
                        >
                          删除
                        </Button>
                      )}
                    >
                      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                        <Input
                          addonBefore="hint"
                          value={route.hint}
                          disabled={disabled || loading || saving}
                          onChange={(event) => updateRoute(index, { hint: event.target.value })}
                          placeholder="例如：mgc-novel-to-script"
                        />
                        <Input
                          addonBefore="provider"
                          value={route.provider}
                          disabled={disabled || loading || saving}
                          onChange={(event) => updateRoute(index, { provider: event.target.value })}
                          placeholder="例如：custom:https://api.ai.fun.tv/v1"
                        />
                        <Input
                          addonBefore="model"
                          value={route.model}
                          disabled={disabled || loading || saving}
                          onChange={(event) => updateRoute(index, { model: event.target.value })}
                          placeholder="例如：MiniMax-M2.5"
                        />
                      </div>
                    </Card>
                  ))}
                </Space>
              </Card>

              <Card
                type="inner"
                size="small"
                title="query_classification"
                extra={(
                  <Space size="small">
                    <Text type="secondary">enabled</Text>
                    <Switch
                      checked={queryClassificationEnabled}
                      disabled={disabled || loading || saving}
                      onChange={setQueryClassificationEnabled}
                    />
                  </Space>
                )}
              >
                <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                  <Text type="secondary">
                    只有 `enabled = true` 时，`query_classification.rules` 才会参与配置和生效。
                  </Text>

                  {!queryClassificationEnabled ? (
                    <Alert
                      type="info"
                      showIcon
                      message="当前未开启 query_classification"
                      description="开启后才可以新增、编辑和保存规则。"
                    />
                  ) : (
                    <Card
                      size="small"
                      title="query_classification.rules"
                      extra={(
                        <Button size="small" onClick={() => setQueryClassificationRules((currentRules) => [...currentRules, createEmptyRule()])} disabled={disabled || loading || saving}>
                          新增规则
                        </Button>
                      )}
                    >
                      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                        {queryClassificationRules.length === 0 ? (
                          <Empty description="暂无分类规则" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        ) : queryClassificationRules.map((rule, index) => (
                          <Card
                            key={`rule-${index}`}
                            size="small"
                            extra={(
                              <Button
                                danger
                                size="small"
                                disabled={disabled || loading || saving}
                                onClick={() => setQueryClassificationRules((currentRules) => currentRules.filter((_, ruleIndex) => ruleIndex !== index))}
                              >
                                删除
                              </Button>
                            )}
                          >
                            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                              <Input
                                addonBefore="hint"
                                value={rule.hint}
                                disabled={disabled || loading || saving}
                                onChange={(event) => updateRule(index, { hint: event.target.value })}
                                placeholder="例如：mgc-novel-to-script"
                              />

                              <Select
                                mode="tags"
                                value={rule.keywords ?? []}
                                disabled={disabled || loading || saving}
                                onChange={(value) => updateRule(index, { keywords: value })}
                                tokenSeparators={[",", "，", "\n"]}
                                placeholder="keywords，按回车或逗号分隔"
                                style={{ width: "100%" }}
                              />

                              <Select
                                mode="tags"
                                value={rule.literals ?? []}
                                disabled={disabled || loading || saving}
                                onChange={(value) => updateRule(index, { literals: value })}
                                tokenSeparators={[",", "，", "\n"]}
                                placeholder="literals，按回车或逗号分隔"
                                style={{ width: "100%" }}
                              />

                              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                                <InputNumber
                                  addonBefore="priority"
                                  min={0}
                                  precision={0}
                                  value={rule.priority ?? DEFAULT_RULE_PRIORITY}
                                  disabled={disabled || loading || saving}
                                  onChange={(value) => updateRule(index, { priority: value ?? DEFAULT_RULE_PRIORITY })}
                                  style={{ width: "100%" }}
                                />
                                <InputNumber
                                  addonBefore="min_length"
                                  min={0}
                                  precision={0}
                                  value={rule.minLength ?? DEFAULT_RULE_MIN_LENGTH}
                                  disabled={disabled || loading || saving}
                                  onChange={(value) => updateRule(index, { minLength: value ?? DEFAULT_RULE_MIN_LENGTH })}
                                  style={{ width: "100%" }}
                                />
                                <InputNumber
                                  addonBefore="max_length"
                                  min={0}
                                  precision={0}
                                  value={rule.maxLength ?? DEFAULT_RULE_MAX_LENGTH}
                                  disabled={disabled || loading || saving}
                                  onChange={(value) => updateRule(index, { maxLength: value ?? DEFAULT_RULE_MAX_LENGTH })}
                                  style={{ width: "100%" }}
                                />
                              </div>
                            </Space>
                          </Card>
                        ))}
                      </Space>
                    </Card>
                  )}
                </Space>
              </Card>
            </>
          )}
        </Space>
      </Card>
    </>
  );
}
