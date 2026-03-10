"use client";

import { deleteInstanceConfig, getInstanceConfig, upsertInstanceConfig } from "@/lib/control-api";
import type { ClawInstance, InstanceConfig } from "@/types/contracts";
import { Alert, Button, Card, Descriptions, Empty, Input, Popconfirm, Skeleton, Space, Tag, Typography, message } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";

const { Paragraph, Text } = Typography;
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
        alertType: "success" as const,
        title: "当前正在使用实例级 config 覆盖",
        description: "保存会更新当前实例覆盖；恢复默认模板后，会回退到系统默认的 config 模板。",
      };
    case "DEFAULT_TEMPLATE":
      return {
        label: "默认模板",
        color: "blue" as const,
        alertType: "info" as const,
        title: "当前显示的是系统默认 config 模板",
        description: "保存后会为当前实例创建独立的 config 覆盖，不会影响其他实例。",
      };
    default:
      return {
        label: source || "未知来源",
        color: "default" as const,
        alertType: "warning" as const,
        title: "当前配置来源未识别",
        description: "建议先检查返回的 source 字段，再决定是否保存实例覆盖。",
      };
  }
}

export function InstanceConfigPanel({ instance }: { instance: ClawInstance }) {
  const [config, setConfig] = useState<InstanceConfig>();
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string>();
  const [messageApi, contextHolder] = message.useMessage();

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

  const baselineConfigToml = config?.configToml ?? "";
  const dirty = draft !== baselineConfigToml;
  const sourceMeta = config ? getSourceMeta(config.source) : error ? {
    label: "加载失败",
    color: "error" as const,
    alertType: "error" as const,
    title: "实例配置暂时不可用",
    description: "服务端没有成功返回当前实例的 config.toml，请先查看下方错误信息并重试。",
  } : {
    label: "加载中",
    color: "default" as const,
    alertType: "info" as const,
    title: "正在加载实例配置",
    description: "正在从服务端获取当前实例的 config.toml。",
  };
  const lineCount = useMemo(() => {
    if (!draft) {
      return 0;
    }
    return draft.split("\n").length;
  }, [draft]);

  const handleSave = useCallback(async () => {
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
      messageApi.success("实例配置已保存");
    } catch (apiError) {
      const messageText = apiError instanceof Error ? apiError.message : String(apiError);
      setError(messageText);
      messageApi.error(`保存失败: ${messageText}`);
    } finally {
      setSaving(false);
    }
  }, [draft, instance.id, messageApi]);

  const handleResetDraft = useCallback(() => {
    setDraft(baselineConfigToml);
  }, [baselineConfigToml]);

  const handleRestoreDefault = useCallback(async () => {
    setResetting(true);
    setError(undefined);
    try {
      const response = await deleteInstanceConfig(instance.id);
      setConfig(response);
      setDraft(response.configToml ?? "");
      messageApi.success("已恢复为默认模板");
    } catch (apiError) {
      const messageText = apiError instanceof Error ? apiError.message : String(apiError);
      setError(messageText);
      messageApi.error(`恢复失败: ${messageText}`);
    } finally {
      setResetting(false);
    }
  }, [instance.id, messageApi]);

  const descriptionItems = config ? [
    {
      key: "instanceName",
      label: "实例名称",
      children: instance.name,
    },
    {
      key: "source",
      label: "当前来源",
      children: <Tag color={sourceMeta.color}>{sourceMeta.label}</Tag>,
    },
    {
      key: "runtimeConfigPath",
      label: "运行时路径",
      children: <Paragraph copyable={{ text: config.runtimeConfigPath }} style={{ marginBottom: 0 }}>{config.runtimeConfigPath}</Paragraph>,
    },
    {
      key: "defaultTemplatePath",
      label: "默认模板路径",
      children: config.defaultTemplatePath
        ? <Paragraph copyable={{ text: config.defaultTemplatePath }} style={{ marginBottom: 0 }}>{config.defaultTemplatePath}</Paragraph>
        : "-",
    },
    {
      key: "overwriteOnStart",
      label: "启动时覆盖写入",
      children: <Tag color={config.overwriteOnStart ? "green" : "default"}>{config.overwriteOnStart ? "开启" : "关闭"}</Tag>,
    },
    {
      key: "overrideExists",
      label: "实例覆盖状态",
      children: <Tag color={config.overrideExists ? "gold" : "default"}>{config.overrideExists ? "已存在" : "未创建"}</Tag>,
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
        <Alert
          showIcon
          type={sourceMeta.alertType}
          message={sourceMeta.title}
          description={
            <Space direction="vertical" size={4}>
              <Text>{sourceMeta.description}</Text>
              {config ? (
                <Text type="secondary">
                  当前运行时文件路径：{config.runtimeConfigPath}
                </Text>
              ) : null}
            </Space>
          }
        />

        {error ? (
          <Alert
            showIcon
            type="error"
            message="配置加载或保存失败"
            description={error}
            action={
              <Button size="small" onClick={() => void loadConfig()}>
                重试
              </Button>
            }
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
            <Descriptions
              column={1}
              size="small"
              items={descriptionItems}
            />
          ) : (
            <Empty description="暂无配置数据" />
          )}
        </Card>

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
            </Space>
          )}
        >
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Text type="secondary">
              这里显示的是当前实例最终会使用的 TOML 内容。直接保存会写入实例级覆盖；恢复默认模板会删除当前实例覆盖并回退到系统模板。
            </Text>

            <TextArea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={30}
              spellCheck={false}
              disabled={loading || saving || resetting}
              placeholder="配置内容加载中..."
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace",
                fontSize: 13,
                lineHeight: 1.6,
              }}
            />

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
          </Space>
        </Card>
      </Space>
    </>
  );
}
