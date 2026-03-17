"use client";

import { getInstanceDefaultModelConfig, upsertInstanceDefaultModelConfig } from "@/lib/control-api";
import type { InstanceDefaultModelConfig } from "@/types/contracts";
import { Alert, Button, Card, Input, InputNumber, Skeleton, Space, Typography, message } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";

const { Text } = Typography;

type DefaultModelDraft = {
  apiKey: string;
  defaultProvider: string;
  defaultModel: string;
  defaultTemperature: number;
};

function normalizeDraft(config: InstanceDefaultModelConfig): DefaultModelDraft {
  return {
    apiKey: config.apiKey ?? "",
    defaultProvider: config.defaultProvider ?? "",
    defaultModel: config.defaultModel ?? "",
    defaultTemperature: Number.isFinite(config.defaultTemperature) ? config.defaultTemperature : 0.7,
  };
}

function normalizeComparableDraft(draft: DefaultModelDraft) {
  return {
    apiKey: draft.apiKey,
    defaultProvider: draft.defaultProvider.trim(),
    defaultModel: draft.defaultModel.trim(),
    defaultTemperature: draft.defaultTemperature,
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

export function InstanceDefaultModelConfigPanel({
  instanceId,
  disabled,
  onSaved,
}: {
  instanceId: string;
  disabled?: boolean;
  onSaved?: () => void | Promise<void>;
}) {
  const [config, setConfig] = useState<InstanceDefaultModelConfig>();
  const [draft, setDraft] = useState<DefaultModelDraft>({
    apiKey: "",
    defaultProvider: "",
    defaultModel: "",
    defaultTemperature: 0.7,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [messageApi, contextHolder] = message.useMessage();

  const applyResponse = useCallback((response: InstanceDefaultModelConfig) => {
    setConfig(response);
    setDraft(normalizeDraft(response));
  }, []);

  const loadConfig = useCallback(async (showSuccess?: boolean) => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await getInstanceDefaultModelConfig(instanceId);
      applyResponse(response);
      if (showSuccess) {
        messageApi.success("已刷新实例默认模型配置");
      }
    } catch (apiError) {
      setConfig(undefined);
      setDraft({
        apiKey: "",
        defaultProvider: "",
        defaultModel: "",
        defaultTemperature: 0.7,
      });
      setError(apiError instanceof Error ? apiError.message : String(apiError));
    } finally {
      setLoading(false);
    }
  }, [applyResponse, instanceId, messageApi]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const baseline = useMemo(
    () => (config ? normalizeComparableDraft(normalizeDraft(config)) : undefined),
    [config]
  );
  const current = useMemo(() => normalizeComparableDraft(draft), [draft]);
  const dirty = useMemo(
    () => Boolean(config) && JSON.stringify(baseline) !== JSON.stringify(current),
    [baseline, config, current]
  );

  const handleReset = useCallback(() => {
    if (!config) {
      return;
    }
    setDraft(normalizeDraft(config));
  }, [config]);

  const handleSave = useCallback(async () => {
    const normalizedProvider = draft.defaultProvider.trim();
    const normalizedModel = draft.defaultModel.trim();
    if (!normalizedProvider) {
      messageApi.warning("default_provider 不能为空");
      return;
    }
    if (!normalizedModel) {
      messageApi.warning("default_model 不能为空");
      return;
    }
    if (!Number.isFinite(draft.defaultTemperature)) {
      messageApi.warning("default_temperature 无效");
      return;
    }

    setSaving(true);
    setError(undefined);
    try {
      const response = await upsertInstanceDefaultModelConfig(instanceId, {
        apiKey: draft.apiKey,
        defaultProvider: normalizedProvider,
        defaultModel: normalizedModel,
        defaultTemperature: draft.defaultTemperature,
        updatedBy: "console",
      });
      applyResponse(response);
      messageApi.success("实例默认模型配置已保存");
      await onSaved?.();
    } catch (apiError) {
      const messageText = apiError instanceof Error ? apiError.message : String(apiError);
      setError(messageText);
      messageApi.error("保存实例默认模型配置失败");
    } finally {
      setSaving(false);
    }
  }, [applyResponse, draft, instanceId, messageApi, onSaved]);

  return (
    <>
      {contextHolder}
      <Card
        className="sub-glass-card"
        size="small"
        title="默认模型配置"
        extra={(
          <Button
            size="small"
            onClick={() => {
              void loadConfig(true);
            }}
            loading={loading}
            disabled={saving}
          >
            刷新
          </Button>
        )}
      >
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          {error ? <Alert type="error" showIcon message={error} /> : null}

          {disabled ? (
            <Alert
              type="warning"
              showIcon
              message="请先处理 config.toml 的未保存修改"
              description="结构化默认模型配置和原始 config.toml 编辑的是同一份实例配置。为避免互相覆盖，当前先锁定这里的编辑。"
            />
          ) : null}


          {loading && !config ? (
            <Skeleton active paragraph={{ rows: 6 }} />
          ) : (
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              <Input.Password
                value={draft.apiKey}
                disabled={disabled || loading || saving}
                onChange={(event) => setDraft((currentDraft) => ({
                  ...currentDraft,
                  apiKey: event.target.value,
                }))}
                placeholder="api_key，可留空"
              />

              <Input
                addonBefore="default_provider"
                value={draft.defaultProvider}
                disabled={disabled || loading || saving}
                onChange={(event) => setDraft((currentDraft) => ({
                  ...currentDraft,
                  defaultProvider: event.target.value,
                }))}
                placeholder="例如：custom:https://api.ai.fun.tv/v1"
              />

              <Input
                addonBefore="default_model"
                value={draft.defaultModel}
                disabled={disabled || loading || saving}
                onChange={(event) => setDraft((currentDraft) => ({
                  ...currentDraft,
                  defaultModel: event.target.value,
                }))}
                placeholder="例如：MiniMax-M2.5"
              />

              <InputNumber
                addonBefore="default_temperature"
                min={0}
                max={2}
                step={0.1}
                value={draft.defaultTemperature}
                disabled={disabled || loading || saving}
                onChange={(value) => setDraft((currentDraft) => ({
                  ...currentDraft,
                  defaultTemperature: typeof value === "number" ? value : currentDraft.defaultTemperature,
                }))}
                style={{ width: "100%" }}
              />

              <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
                <Space wrap>
                  <Button onClick={handleReset} disabled={!dirty || disabled || loading || saving}>
                    撤销未保存修改
                  </Button>
                  <Button
                    type="primary"
                    loading={saving}
                    disabled={!dirty || disabled || loading || saving}
                    onClick={() => void handleSave()}
                  >
                    保存默认配置
                  </Button>
                </Space>
                <Text type="secondary">
                  最近更新：{formatTimestamp(config?.overrideUpdatedAt)} / {config?.overrideUpdatedBy || "系统默认"}
                </Text>
              </Space>
            </Space>
          )}
        </Space>
      </Card>
    </>
  );
}
