"use client";

import { InstanceDefaultModelConfigPanel } from "@/components/instance-default-model-config-panel";
import { InstanceRoutingConfigPanel } from "@/components/instance-routing-config-panel";
import { uiText } from "@/constants/ui-text";
import { deleteInstanceConfig, getInstanceConfig, upsertInstanceConfig } from "@/lib/control-api";
import type { ClawInstance, InstanceConfig } from "@/types/contracts";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Empty,
  Input,
  Popconfirm,
  Skeleton,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

const { Text } = Typography;
const { TextArea } = Input;

function formatTimestamp(value?: string | null): string {
  if (!value) {
    return "未更新";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(date);
}

function getSourceMeta(source?: string) {
  switch (source) {
    case "INSTANCE_OVERRIDE":
      return {
        label: "实例覆盖",
        color: "green" as const,
      };
    case "DEFAULT_TEMPLATE":
      return {
        label: "默认模板",
        color: "blue" as const,
      };
    default:
      return {
        label: source || "未知来源",
        color: "default" as const,
      };
  }
}

export function InstanceConfigPanel({
  instance,
  topSection,
  reloadToken,
  readOnly,
  rawConfigReadOnly,
  onConfigSaved,
}: {
  instance: ClawInstance;
  topSection?: ReactNode;
  reloadToken?: number;
  readOnly?: boolean;
  rawConfigReadOnly?: boolean;
  onConfigSaved?: () => void | Promise<void>;
}) {
  const [config, setConfig] = useState<InstanceConfig>();
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string>();
  const [configTomlCollapsed, setConfigTomlCollapsed] = useState(true);
  const [messageApi, contextHolder] = message.useMessage();
  const lastReloadTokenRef = useRef<number | undefined>(reloadToken);

  const loadConfig = useCallback(async (showSuccess?: boolean) => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await getInstanceConfig(instance.id);
      setConfig(response);
      setDraft(response.configToml ?? "");
      if (showSuccess) {
        messageApi.success("已刷新实例配置");
      }
    } catch (apiError) {
      setConfig(undefined);
      setDraft("");
      setError(apiError instanceof Error ? apiError.message : String(apiError));
    } finally {
      setLoading(false);
    }
  }, [instance.id, messageApi]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (reloadToken === undefined) {
      return;
    }
    if (lastReloadTokenRef.current === reloadToken) {
      return;
    }
    lastReloadTokenRef.current = reloadToken;
    void loadConfig();
  }, [loadConfig, reloadToken]);

  useEffect(() => {
    setConfigTomlCollapsed(true);
  }, [instance.id]);

  const baselineConfigToml = config?.configToml ?? "";
  const dirty = draft !== baselineConfigToml;
  const sourceMeta = getSourceMeta(config?.source);
  const lineCount = useMemo(() => (draft ? draft.split("\n").length : 0), [draft]);
  const structuredConfigReadOnly = Boolean(readOnly);
  const effectiveRawConfigReadOnly = rawConfigReadOnly ?? readOnly;

  const handleStructuredConfigSaved = useCallback(async () => {
    await loadConfig();
    await onConfigSaved?.();
  }, [loadConfig, onConfigSaved]);

  const handleSave = useCallback(async () => {
    if (effectiveRawConfigReadOnly) {
      return;
    }
    if (!draft.trim()) {
      messageApi.warning("config.toml 不能为空");
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      const response = await upsertInstanceConfig(instance.id, {
        configToml: draft,
        updatedBy: "console",
      });
      setConfig(response);
      setDraft(response.configToml ?? "");
      await onConfigSaved?.();
      messageApi.success("实例配置已保存");
    } catch (apiError) {
      const messageText = apiError instanceof Error ? apiError.message : String(apiError);
      setError(messageText);
      messageApi.error("保存实例配置失败");
    } finally {
      setSaving(false);
    }
  }, [draft, effectiveRawConfigReadOnly, instance.id, messageApi, onConfigSaved]);

  const handleRestoreDefault = useCallback(async () => {
    if (effectiveRawConfigReadOnly) {
      return;
    }
    setResetting(true);
    setError(undefined);
    try {
      const response = await deleteInstanceConfig(instance.id);
      setConfig(response);
      setDraft(response.configToml ?? "");
      await onConfigSaved?.();
      messageApi.success("已恢复默认模板");
    } catch (apiError) {
      const messageText = apiError instanceof Error ? apiError.message : String(apiError);
      setError(messageText);
      messageApi.error("恢复默认模板失败");
    } finally {
      setResetting(false);
    }
  }, [effectiveRawConfigReadOnly, instance.id, messageApi, onConfigSaved]);

  const handleResetDraft = useCallback(() => {
    setDraft(baselineConfigToml);
  }, [baselineConfigToml]);

  const descriptionItems = config ? [
    {
      key: "runtimeConfigPath",
      label: "Runtime 路径",
      children: <Text code>{config.runtimeConfigPath}</Text>,
    },
    {
      key: "source",
      label: "配置来源",
      children: <Tag color={sourceMeta.color}>{sourceMeta.label}</Tag>,
    },
    {
      key: "overwriteOnStart",
      label: "启动时覆盖 runtime",
      children: config.overwriteOnStart ? "是" : "否",
    },
    {
      key: "overrideExists",
      label: "是否存在实例覆盖",
      children: config.overrideExists ? "是" : "否",
    },
    {
      key: "defaultTemplatePath",
      label: "默认模板路径",
      children: config.defaultTemplatePath ? <Text code>{config.defaultTemplatePath}</Text> : "未配置",
    },
    {
      key: "updatedAt",
      label: "最近更新时间",
      children: formatTimestamp(config.overrideUpdatedAt),
    },
    {
      key: "updatedBy",
      label: "最近更新人",
      children: config.overrideUpdatedBy || "系统默认",
    },
  ] : [];

  return (
    <>
      {contextHolder}
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        {topSection ?? null}
        {structuredConfigReadOnly || effectiveRawConfigReadOnly ? (
          <Alert
            type="info"
            showIcon
            message={uiText.instanceReadonlyNoticeTitle}
            description={uiText.instanceReadonlyPartialDescription}
          />
        ) : null}

        {error ? (
          <Alert
            showIcon
            type="error"
            message="实例配置加载或保存失败"
            description={error}
            action={(
              <Button size="small" onClick={() => void loadConfig()}>
                重试
              </Button>
            )}
          />
        ) : null}

        <Card
          className="sub-glass-card"
          size="small"
          title="配置概览"
          extra={(
            <Button
              onClick={() => void loadConfig(true)}
              loading={loading}
              disabled={saving || resetting}
            >
              刷新
            </Button>
          )}
        >
          {(loading && !config) ? (
            <Skeleton active paragraph={{ rows: 6 }} />
          ) : config ? (
            <Descriptions column={1} size="small" items={descriptionItems} />
          ) : (
            <Empty description="暂无配置数据" />
          )}
        </Card>

        <InstanceDefaultModelConfigPanel
          instanceId={instance.id}
          disabled={structuredConfigReadOnly || dirty || loading || saving || resetting}
          onSaved={handleStructuredConfigSaved}
        />

        <InstanceRoutingConfigPanel
          instanceId={instance.id}
          disabled={structuredConfigReadOnly || dirty || loading || saving || resetting}
          onSaved={handleStructuredConfigSaved}
        />

        <Card
          className="sub-glass-card"
          size="small"
          title="config.toml"
          extra={(
            <Space size="small" wrap>
              <Tag color={dirty ? "orange" : "default"}>
                {dirty ? "有未保存修改" : "已与服务端同步"}
              </Tag>
              <Text type="secondary">{lineCount} 行 / {draft.length} 字符</Text>
              <Button
                size="small"
                disabled={saving || resetting || loading}
                onClick={() => setConfigTomlCollapsed((current) => !current)}
              >
                {configTomlCollapsed ? "展开" : "收起"}
              </Button>
            </Space>
          )}
        >
          {configTomlCollapsed ? (
            <Text type="secondary">
              默认折叠。展开后可以直接查看或编辑当前实例最终会使用的 `config.toml`。
            </Text>
          ) : (
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              <Text type="secondary">
                这里展示的是当前实例最终会使用的 TOML 内容。直接保存会写入实例级覆盖；运行中的实例会沿用现有链路同步到 runtime。
              </Text>

              <TextArea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={30}
                spellCheck={false}
                readOnly={effectiveRawConfigReadOnly}
                disabled={loading || saving || resetting}
                placeholder="配置内容加载中..."
                style={{
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace",
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              />

              {!effectiveRawConfigReadOnly ? (
                <Space wrap>
                  <Button onClick={handleResetDraft} disabled={!dirty || saving || resetting || loading}>
                    撤销未保存修改
                  </Button>
                  <Popconfirm
                    title="恢复默认模板"
                    description="这会删除当前实例的 config 覆盖，并回退到系统默认模板。"
                    okText="确认恢复"
                    cancelText="取消"
                    disabled={!config?.overrideExists || saving || resetting || loading}
                    onConfirm={() => void handleRestoreDefault()}
                  >
                    <Button
                      danger
                      loading={resetting}
                      disabled={!config?.overrideExists || saving || resetting || loading}
                    >
                      恢复默认模板
                    </Button>
                  </Popconfirm>
                  <Button
                    type="primary"
                    loading={saving}
                    disabled={!dirty || loading || saving || resetting}
                    onClick={() => void handleSave()}
                  >
                    保存配置
                  </Button>
                </Space>
              ) : null}
            </Space>
          )}
        </Card>
      </Space>
    </>
  );
}
