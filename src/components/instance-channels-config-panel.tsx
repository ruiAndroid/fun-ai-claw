"use client";

import { getInstanceChannelsConfig, upsertInstanceChannelsConfig } from "@/lib/control-api";
import type { InstanceChannelsConfig } from "@/types/contracts";
import { Alert, Button, Card, Input, InputNumber, Skeleton, Space, Switch, Typography, message } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";

const { Text } = Typography;
const { TextArea, Password } = Input;

type ChannelsDraft = {
  cliEnabled: boolean;
  messageTimeoutSecs: number;
  dingtalkEnabled: boolean;
  dingtalkClientId: string;
  dingtalkClientSecret: string;
  dingtalkAllowedUsersText: string;
  qqEnabled: boolean;
  qqAppId: string;
  qqAppSecret: string;
  qqAllowedUsersText: string;
};

function toDraft(config: InstanceChannelsConfig): ChannelsDraft {
  return {
    cliEnabled: config.cliEnabled,
    messageTimeoutSecs: Number.isFinite(config.messageTimeoutSecs) ? config.messageTimeoutSecs : 300,
    dingtalkEnabled: config.dingtalkEnabled,
    dingtalkClientId: config.dingtalkClientId ?? "",
    dingtalkClientSecret: config.dingtalkClientSecret ?? "",
    dingtalkAllowedUsersText: (config.dingtalkAllowedUsers ?? []).join("\n"),
    qqEnabled: config.qqEnabled,
    qqAppId: config.qqAppId ?? "",
    qqAppSecret: config.qqAppSecret ?? "",
    qqAllowedUsersText: (config.qqAllowedUsers ?? []).join("\n"),
  };
}

function normalizeUsers(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function comparableDraft(draft: ChannelsDraft) {
  return {
    cliEnabled: draft.cliEnabled,
    messageTimeoutSecs: draft.messageTimeoutSecs,
    dingtalkEnabled: draft.dingtalkEnabled,
    dingtalkClientId: draft.dingtalkClientId.trim(),
    dingtalkClientSecret: draft.dingtalkClientSecret,
    dingtalkAllowedUsers: normalizeUsers(draft.dingtalkAllowedUsersText),
    qqEnabled: draft.qqEnabled,
    qqAppId: draft.qqAppId.trim(),
    qqAppSecret: draft.qqAppSecret,
    qqAllowedUsers: normalizeUsers(draft.qqAllowedUsersText),
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

function formatSourceLabel(source?: string): string {
  switch (source) {
    case "INSTANCE_OVERRIDE":
      return "实例覆盖";
    case "DEFAULT_TEMPLATE":
      return "默认模板";
    default:
      return source || "未知来源";
  }
}

export function InstanceChannelsConfigPanel({
  instanceId,
  onSaved,
}: {
  instanceId: string;
  onSaved?: () => void | Promise<void>;
}) {
  const [config, setConfig] = useState<InstanceChannelsConfig>();
  const [draft, setDraft] = useState<ChannelsDraft>({
    cliEnabled: true,
    messageTimeoutSecs: 300,
    dingtalkEnabled: false,
    dingtalkClientId: "",
    dingtalkClientSecret: "",
    dingtalkAllowedUsersText: "",
    qqEnabled: false,
    qqAppId: "",
    qqAppSecret: "",
    qqAllowedUsersText: "",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [messageApi, contextHolder] = message.useMessage();

  const applyResponse = useCallback((response: InstanceChannelsConfig) => {
    setConfig(response);
    setDraft(toDraft(response));
  }, []);

  const loadConfig = useCallback(async (showSuccess?: boolean) => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await getInstanceChannelsConfig(instanceId);
      applyResponse(response);
      if (showSuccess) {
        messageApi.success("渠道配置已刷新");
      }
    } catch (apiError) {
      setConfig(undefined);
      setError(apiError instanceof Error ? apiError.message : String(apiError));
    } finally {
      setLoading(false);
    }
  }, [applyResponse, instanceId, messageApi]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const baseline = useMemo(
    () => (config ? JSON.stringify(comparableDraft(toDraft(config))) : ""),
    [config]
  );
  const current = useMemo(() => JSON.stringify(comparableDraft(draft)), [draft]);
  const dirty = Boolean(config) && baseline !== current;

  const handleReset = useCallback(() => {
    if (!config) {
      return;
    }
    setDraft(toDraft(config));
  }, [config]);

  const handleSave = useCallback(async () => {
    if (!Number.isFinite(draft.messageTimeoutSecs) || draft.messageTimeoutSecs <= 0) {
      messageApi.warning("消息超时时间必须大于 0");
      return;
    }
    if (draft.dingtalkEnabled && !draft.dingtalkClientId.trim()) {
      messageApi.warning("请填写钉钉应用 ID");
      return;
    }
    if (draft.dingtalkEnabled && !draft.dingtalkClientSecret.trim()) {
      messageApi.warning("请填写钉钉应用密钥");
      return;
    }
    if (draft.qqEnabled && !draft.qqAppId.trim()) {
      messageApi.warning("请填写 QQ 应用 ID");
      return;
    }
    if (draft.qqEnabled && !draft.qqAppSecret.trim()) {
      messageApi.warning("请填写 QQ 应用密钥");
      return;
    }

    setSaving(true);
    setError(undefined);
    try {
      const response = await upsertInstanceChannelsConfig(instanceId, {
        cliEnabled: draft.cliEnabled,
        messageTimeoutSecs: draft.messageTimeoutSecs,
        dingtalkEnabled: draft.dingtalkEnabled,
        dingtalkClientId: draft.dingtalkClientId.trim(),
        dingtalkClientSecret: draft.dingtalkClientSecret,
        dingtalkAllowedUsers: normalizeUsers(draft.dingtalkAllowedUsersText),
        qqEnabled: draft.qqEnabled,
        qqAppId: draft.qqAppId.trim(),
        qqAppSecret: draft.qqAppSecret,
        qqAllowedUsers: normalizeUsers(draft.qqAllowedUsersText),
        updatedBy: "console",
      });
      applyResponse(response);
      await onSaved?.();
      messageApi.success("渠道配置已保存");
    } catch (apiError) {
      const messageText = apiError instanceof Error ? apiError.message : String(apiError);
      setError(messageText);
      messageApi.error("保存渠道配置失败");
    } finally {
      setSaving(false);
    }
  }, [applyResponse, draft, instanceId, messageApi, onSaved]);

  const metaText = useMemo(() => {
    if (!config) {
      return "-";
    }
    return `来源：${formatSourceLabel(config.source)} / 最近更新：${formatTimestamp(config.overrideUpdatedAt)} / 更新人：${config.overrideUpdatedBy ?? "system"}`;
  }, [config]);

  return (
    <>
      {contextHolder}
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        {error ? (
          <Alert
            type="error"
            showIcon
            message="加载渠道配置失败"
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
          title="渠道接入配置"
          extra={(
            <Space size="small">
              <Text type="secondary">{metaText}</Text>
              <Button onClick={() => void loadConfig(true)} loading={loading} disabled={saving}>
                刷新
              </Button>
            </Space>
          )}
        >
          {(loading && !config) ? (
            <Skeleton active paragraph={{ rows: 4 }} />
          ) : (
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              <Alert
                type="info"
                showIcon
                message="这里用于可视化维护实例级渠道接入配置"
                description="保存后会回写到 config.toml 的 channels_config 下。目前先支持 QQ 和钉钉两种渠道。"
              />

              <Card
                type="inner"
                size="small"
                title="全局设置"
              >
                <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                  <div>
                    <Text type="secondary">本地命令行入口（cli）</Text>
                    <div style={{ marginTop: 8 }}>
                      <Switch
                        checked={draft.cliEnabled}
                        disabled={loading || saving}
                        onChange={(checked) => setDraft((currentDraft) => ({ ...currentDraft, cliEnabled: checked }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Text type="secondary">消息超时时间（秒）</Text>
                    <div style={{ marginTop: 8 }}>
                      <InputNumber
                        min={1}
                        value={draft.messageTimeoutSecs}
                        disabled={loading || saving}
                        style={{ width: "100%" }}
                        onChange={(value) =>
                          setDraft((currentDraft) => ({
                            ...currentDraft,
                            messageTimeoutSecs: typeof value === "number" ? value : currentDraft.messageTimeoutSecs,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </Card>

              <Card
                type="inner"
                size="small"
                title="钉钉"
                extra={(
                  <Space size="small">
                    <Text type="secondary">启用</Text>
                    <Switch
                      checked={draft.dingtalkEnabled}
                      disabled={loading || saving}
                      onChange={(checked) => setDraft((currentDraft) => ({ ...currentDraft, dingtalkEnabled: checked }))}
                    />
                  </Space>
                )}
              >
                <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                  <Text type="secondary">对应 config.toml 中的 `channels_config.dingtalk`。</Text>
                  {!draft.dingtalkEnabled ? (
                    <Text type="secondary">当前未启用。开启后即可配置钉钉应用 ID、应用密钥和允许访问的用户。</Text>
                  ) : null}
                  <Input
                    addonBefore="应用 ID"
                    value={draft.dingtalkClientId}
                    disabled={loading || saving || !draft.dingtalkEnabled}
                    onChange={(event) => setDraft((currentDraft) => ({ ...currentDraft, dingtalkClientId: event.target.value }))}
                    placeholder="请输入钉钉开放平台的 AppKey / client_id"
                  />
                  <Password
                    addonBefore="应用密钥"
                    value={draft.dingtalkClientSecret}
                    disabled={loading || saving || !draft.dingtalkEnabled}
                    onChange={(event) =>
                      setDraft((currentDraft) => ({ ...currentDraft, dingtalkClientSecret: event.target.value }))
                    }
                    placeholder="请输入钉钉开放平台的 AppSecret / client_secret"
                  />
                  <TextArea
                    rows={4}
                    value={draft.dingtalkAllowedUsersText}
                    disabled={loading || saving || !draft.dingtalkEnabled}
                    onChange={(event) =>
                      setDraft((currentDraft) => ({ ...currentDraft, dingtalkAllowedUsersText: event.target.value }))
                    }
                    placeholder={"允许访问的用户 ID，每行一个，也可以用英文逗号分隔\n输入 * 表示全部允许"}
                  />
                </Space>
              </Card>

              <Card
                type="inner"
                size="small"
                title="QQ"
                extra={(
                  <Space size="small">
                    <Text type="secondary">启用</Text>
                    <Switch
                      checked={draft.qqEnabled}
                      disabled={loading || saving}
                      onChange={(checked) => setDraft((currentDraft) => ({ ...currentDraft, qqEnabled: checked }))}
                    />
                  </Space>
                )}
              >
                <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                  <Text type="secondary">对应 config.toml 中的 `channels_config.qq`。</Text>
                  {!draft.qqEnabled ? (
                    <Text type="secondary">当前未启用。开启后即可配置 QQ 应用 ID、应用密钥和允许访问的用户。</Text>
                  ) : null}
                  <Input
                    addonBefore="应用 ID"
                    value={draft.qqAppId}
                    disabled={loading || saving || !draft.qqEnabled}
                    onChange={(event) => setDraft((currentDraft) => ({ ...currentDraft, qqAppId: event.target.value }))}
                    placeholder="请输入 QQ 机器人的 app_id"
                  />
                  <Password
                    addonBefore="应用密钥"
                    value={draft.qqAppSecret}
                    disabled={loading || saving || !draft.qqEnabled}
                    onChange={(event) =>
                      setDraft((currentDraft) => ({ ...currentDraft, qqAppSecret: event.target.value }))
                    }
                    placeholder="请输入 QQ 机器人的 app_secret"
                  />
                  <TextArea
                    rows={4}
                    value={draft.qqAllowedUsersText}
                    disabled={loading || saving || !draft.qqEnabled}
                    onChange={(event) =>
                      setDraft((currentDraft) => ({ ...currentDraft, qqAllowedUsersText: event.target.value }))
                    }
                    placeholder={"允许访问的用户 ID，每行一个，也可以用英文逗号分隔\n输入 * 表示全部允许"}
                  />
                </Space>
              </Card>

              <Space wrap>
                <Button onClick={handleReset} disabled={!dirty || loading || saving}>
                  重置
                </Button>
                <Button type="primary" loading={saving} disabled={!dirty || loading || saving} onClick={() => void handleSave()}>
                  保存
                </Button>
              </Space>
            </Space>
          )}
        </Card>
      </Space>
    </>
  );
}
