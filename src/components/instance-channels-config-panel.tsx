"use client";

import { uiText } from "@/constants/ui-text";
import { getInstanceChannelsConfig, upsertInstanceChannelsConfig } from "@/lib/control-api";
import type { InstanceChannelsConfig } from "@/types/contracts";
import { Alert, Button, Card, Input, InputNumber, Skeleton, Space, Switch, Typography, message } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";

const { Text } = Typography;
const { TextArea, Password } = Input;

const CHANNEL_PLATFORM_LINKS = {
  dingtalk: {
    consoleUrl: "https://open-dev.dingtalk.com/",
    docsUrl: "https://open.dingtalk.com/doc-mobile",
  },
  qq: {
    consoleUrl: "https://q.qq.com/",
    docsUrl: "https://q.qq.com/wiki",
  },
} as const;

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
  readOnly,
}: {
  instanceId: string;
  onSaved?: () => void | Promise<void>;
  readOnly?: boolean;
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

  const loadConfig = useCallback(
    async (showSuccess?: boolean) => {
      setLoading(true);
      setError(undefined);
      try {
        const response = await getInstanceChannelsConfig(instanceId);
        applyResponse(response);
        if (showSuccess) {
          messageApi.success("渠道配置已刷新");
        }
      } catch (apiError) {
        const messageText = apiError instanceof Error ? apiError.message : String(apiError);
        setConfig(undefined);
        setError(messageText);
      } finally {
        setLoading(false);
      }
    },
    [applyResponse, instanceId, messageApi]
  );

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const baseline = useMemo(() => (config ? JSON.stringify(comparableDraft(toDraft(config))) : ""), [config]);
  const current = useMemo(() => JSON.stringify(comparableDraft(draft)), [draft]);
  const dirty = Boolean(config) && baseline !== current;
  const controlsDisabled = readOnly || loading || saving;

  const handleReset = useCallback(() => {
    if (!config) {
      return;
    }
    setDraft(toDraft(config));
  }, [config]);

  const handleSave = useCallback(async () => {
    if (readOnly) {
      return;
    }
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
      messageApi.success("渠道配置已保存");
      await onSaved?.();
    } catch (apiError) {
      const messageText = apiError instanceof Error ? apiError.message : String(apiError);
      setError(messageText);
      messageApi.error("保存渠道配置失败");
    } finally {
      setSaving(false);
    }
  }, [applyResponse, draft, instanceId, messageApi, onSaved, readOnly]);

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
        <Card
          title="渠道配置"
          extra={
            <Button onClick={() => void loadConfig(true)} disabled={controlsDisabled}>
              刷新
            </Button>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Text type="secondary">{metaText}</Text>
            {readOnly ? (
              <Alert
                type="info"
                showIcon
                message={uiText.instanceReadonlyNoticeTitle}
                description={uiText.instanceReadonlyPartialDescription}
              />
            ) : null}

            {error ? <Alert type="error" showIcon message="加载失败" description={error} /> : null}

            {loading && !config ? (
              <Skeleton active paragraph={{ rows: 8 }} />
            ) : !config ? (
              <Alert type="warning" showIcon message="未获取到渠道配置" />
            ) : (
              <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                <Card type="inner" size="small" title="基础">
                  <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                    <Space size="small">
                      <Text>启用 CLI</Text>
                      <Switch
                        checked={draft.cliEnabled}
                        disabled={controlsDisabled}
                        onChange={(checked) => setDraft((currentDraft) => ({ ...currentDraft, cliEnabled: checked }))}
                      />
                    </Space>
                    <div>
                      <Text type="secondary">消息超时（秒）</Text>
                      <InputNumber
                        min={1}
                        style={{ width: "100%", marginTop: 8 }}
                        value={draft.messageTimeoutSecs}
                        disabled={controlsDisabled}
                        onChange={(value) =>
                          setDraft((currentDraft) => ({
                            ...currentDraft,
                            messageTimeoutSecs: typeof value === "number" ? value : currentDraft.messageTimeoutSecs,
                          }))
                        }
                      />
                    </div>
                  </Space>
                </Card>

                <Card
                  type="inner"
                  size="small"
                  title="钉钉"
                  extra={
                    <Space size="small">
                      <Text type="secondary">启用</Text>
                      <Switch
                        checked={draft.dingtalkEnabled}
                        disabled={controlsDisabled}
                        onChange={(checked) => setDraft((currentDraft) => ({ ...currentDraft, dingtalkEnabled: checked }))}
                      />
                    </Space>
                  }
                >
                  <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                    <Text type="secondary">对应 `config.toml` 中的 `channels_config.dingtalk`。</Text>
                    <Space size="middle" wrap>
                      <a href={CHANNEL_PLATFORM_LINKS.dingtalk.consoleUrl} target="_blank" rel="noreferrer">
                        前往钉钉开放平台
                      </a>
                      <a href={CHANNEL_PLATFORM_LINKS.dingtalk.docsUrl} target="_blank" rel="noreferrer">
                        查看钉钉开发文档
                      </a>
                    </Space>
                    {!draft.dingtalkEnabled ? (
                      <Text type="secondary">当前未启用。开启后可配置应用 ID、应用密钥和允许访问的用户。</Text>
                    ) : null}
                    <Input
                      addonBefore="应用 ID"
                      value={draft.dingtalkClientId}
                      disabled={controlsDisabled || !draft.dingtalkEnabled}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({ ...currentDraft, dingtalkClientId: event.target.value }))
                      }
                      placeholder="请输入钉钉开放平台的 AppKey / client_id"
                    />
                    <Password
                      addonBefore="应用密钥"
                      value={draft.dingtalkClientSecret}
                      disabled={controlsDisabled || !draft.dingtalkEnabled}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({ ...currentDraft, dingtalkClientSecret: event.target.value }))
                      }
                      placeholder="请输入钉钉开放平台的 AppSecret / client_secret"
                    />
                    <TextArea
                      rows={4}
                      value={draft.dingtalkAllowedUsersText}
                      disabled={controlsDisabled || !draft.dingtalkEnabled}
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
                  extra={
                    <Space size="small">
                      <Text type="secondary">启用</Text>
                      <Switch
                        checked={draft.qqEnabled}
                        disabled={controlsDisabled}
                        onChange={(checked) => setDraft((currentDraft) => ({ ...currentDraft, qqEnabled: checked }))}
                      />
                    </Space>
                  }
                >
                  <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                    <Text type="secondary">对应 `config.toml` 中的 `channels_config.qq`。</Text>
                    <Space size="middle" wrap>
                      <a href={CHANNEL_PLATFORM_LINKS.qq.consoleUrl} target="_blank" rel="noreferrer">
                        前往 QQ 开放平台
                      </a>
                      <a href={CHANNEL_PLATFORM_LINKS.qq.docsUrl} target="_blank" rel="noreferrer">
                        查看 QQ 开发文档
                      </a>
                    </Space>
                    {!draft.qqEnabled ? (
                      <Text type="secondary">当前未启用。开启后可配置应用 ID、应用密钥和允许访问的用户。</Text>
                    ) : null}
                    <Input
                      addonBefore="应用 ID"
                      value={draft.qqAppId}
                      disabled={controlsDisabled || !draft.qqEnabled}
                      onChange={(event) => setDraft((currentDraft) => ({ ...currentDraft, qqAppId: event.target.value }))}
                      placeholder="请输入 QQ 机器人的 app_id"
                    />
                    <Password
                      addonBefore="应用密钥"
                      value={draft.qqAppSecret}
                      disabled={controlsDisabled || !draft.qqEnabled}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({ ...currentDraft, qqAppSecret: event.target.value }))
                      }
                      placeholder="请输入 QQ 机器人的 app_secret"
                    />
                    <TextArea
                      rows={4}
                      value={draft.qqAllowedUsersText}
                      disabled={controlsDisabled || !draft.qqEnabled}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({ ...currentDraft, qqAllowedUsersText: event.target.value }))
                      }
                      placeholder={"允许访问的用户 ID，每行一个，也可以用英文逗号分隔\n输入 * 表示全部允许"}
                    />
                  </Space>
                </Card>

                {!readOnly ? (
                  <Space wrap>
                    <Button onClick={handleReset} disabled={!dirty || loading || saving}>
                      重置
                    </Button>
                    <Button type="primary" loading={saving} disabled={!dirty || loading || saving} onClick={() => void handleSave()}>
                      保存
                    </Button>
                  </Space>
                ) : null}
              </Space>
            )}
          </Space>
        </Card>
      </Space>
    </>
  );
}
