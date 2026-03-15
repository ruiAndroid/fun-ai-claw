"use client";

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
  feishu: {
    consoleUrl: "https://open.feishu.cn/app",
    docsUrl: "https://open.feishu.cn/document/",
  },
  qq: {
    consoleUrl: "https://q.qq.com/",
    docsUrl: "https://q.qq.com/wiki",
  },
  wecom: {
    consoleUrl: "https://work.weixin.qq.com/wework_admin/frame",
    docsUrl: "https://developer.work.weixin.qq.com/document",
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
  wecomEnabled: boolean;
  wecomCorpId: string;
  wecomAgentId: string;
  wecomSecret: string;
  wecomToken: string;
  wecomEncodingAesKey: string;
  wecomAllowedUsersText: string;
  feishuEnabled: boolean;
  feishuAppId: string;
  feishuAppSecret: string;
  feishuAllowedUsersText: string;
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
    wecomEnabled: config.wecomEnabled,
    wecomCorpId: config.wecomCorpId ?? "",
    wecomAgentId: config.wecomAgentId ?? "",
    wecomSecret: config.wecomSecret ?? "",
    wecomToken: config.wecomToken ?? "",
    wecomEncodingAesKey: config.wecomEncodingAesKey ?? "",
    wecomAllowedUsersText: (config.wecomAllowedUsers ?? []).join("\n"),
    feishuEnabled: config.feishuEnabled,
    feishuAppId: config.feishuAppId ?? "",
    feishuAppSecret: config.feishuAppSecret ?? "",
    feishuAllowedUsersText: (config.feishuAllowedUsers ?? []).join("\n"),
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
    wecomEnabled: draft.wecomEnabled,
    wecomCorpId: draft.wecomCorpId.trim(),
    wecomAgentId: draft.wecomAgentId.trim(),
    wecomSecret: draft.wecomSecret,
    wecomToken: draft.wecomToken,
    wecomEncodingAesKey: draft.wecomEncodingAesKey,
    wecomAllowedUsers: normalizeUsers(draft.wecomAllowedUsersText),
    feishuEnabled: draft.feishuEnabled,
    feishuAppId: draft.feishuAppId.trim(),
    feishuAppSecret: draft.feishuAppSecret,
    feishuAllowedUsers: normalizeUsers(draft.feishuAllowedUsersText),
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
    wecomEnabled: false,
    wecomCorpId: "",
    wecomAgentId: "",
    wecomSecret: "",
    wecomToken: "",
    wecomEncodingAesKey: "",
    wecomAllowedUsersText: "",
    feishuEnabled: false,
    feishuAppId: "",
    feishuAppSecret: "",
    feishuAllowedUsersText: "",
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

    if (draft.wecomEnabled && !draft.wecomCorpId.trim()) {
      messageApi.warning("请填写企业微信 Corp ID");
      return;
    }
    if (draft.wecomEnabled && !draft.wecomAgentId.trim()) {
      messageApi.warning("请填写企业微信 Agent ID");
      return;
    }
    if (draft.wecomEnabled && !draft.wecomSecret.trim()) {
      messageApi.warning("请填写企业微信 Secret");
      return;
    }
    if (draft.wecomEnabled && !draft.wecomToken.trim()) {
      messageApi.warning("请填写企业微信 Token");
      return;
    }
    if (draft.wecomEnabled && !draft.wecomEncodingAesKey.trim()) {
      messageApi.warning("请填写企业微信 EncodingAESKey");
      return;
    }

    if (draft.feishuEnabled && !draft.feishuAppId.trim()) {
      messageApi.warning("请填写飞书应用 App ID");
      return;
    }
    if (draft.feishuEnabled && !draft.feishuAppSecret.trim()) {
      messageApi.warning("请填写飞书应用 App Secret");
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
        wecomEnabled: draft.wecomEnabled,
        wecomCorpId: draft.wecomCorpId.trim(),
        wecomAgentId: draft.wecomAgentId.trim(),
        wecomSecret: draft.wecomSecret,
        wecomToken: draft.wecomToken,
        wecomEncodingAesKey: draft.wecomEncodingAesKey,
        wecomAllowedUsers: normalizeUsers(draft.wecomAllowedUsersText),
        feishuEnabled: draft.feishuEnabled,
        feishuAppId: draft.feishuAppId.trim(),
        feishuAppSecret: draft.feishuAppSecret,
        feishuAllowedUsers: normalizeUsers(draft.feishuAllowedUsersText),
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
                  <Space size="middle" wrap>
                    <a href={CHANNEL_PLATFORM_LINKS.dingtalk.consoleUrl} target="_blank" rel="noreferrer">
                      前往钉钉开发者后台
                    </a>
                    <a href={CHANNEL_PLATFORM_LINKS.dingtalk.docsUrl} target="_blank" rel="noreferrer">
                      查看钉钉开发文档
                    </a>
                  </Space>
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
                title="企业微信"
                extra={(
                  <Space size="small">
                    <Text type="secondary">启用</Text>
                    <Switch
                      checked={draft.wecomEnabled}
                      disabled={loading || saving}
                      onChange={(checked) => setDraft((currentDraft) => ({ ...currentDraft, wecomEnabled: checked }))}
                    />
                  </Space>
                )}
              >
                <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                  <Text type="secondary">对应 `config.toml` 中的 `channels_config.wecom`。</Text>
                  <Space size="middle" wrap>
                    <a href={CHANNEL_PLATFORM_LINKS.wecom.consoleUrl} target="_blank" rel="noreferrer">
                      前往企业微信管理后台
                    </a>
                    <a href={CHANNEL_PLATFORM_LINKS.wecom.docsUrl} target="_blank" rel="noreferrer">
                      查看企业微信开发文档
                    </a>
                  </Space>
                  {!draft.wecomEnabled ? (
                    <Text type="secondary">
                      当前未启用。开启后即可配置企业微信应用的 Corp ID、Agent ID、Secret、Token、EncodingAESKey 和允许访问的用户。
                    </Text>
                  ) : null}
                  <Input
                    addonBefore="Corp ID"
                    value={draft.wecomCorpId}
                    disabled={loading || saving || !draft.wecomEnabled}
                    onChange={(event) => setDraft((currentDraft) => ({ ...currentDraft, wecomCorpId: event.target.value }))}
                    placeholder="请输入企业微信 corpid"
                  />
                  <Input
                    addonBefore="Agent ID"
                    value={draft.wecomAgentId}
                    disabled={loading || saving || !draft.wecomEnabled}
                    onChange={(event) => setDraft((currentDraft) => ({ ...currentDraft, wecomAgentId: event.target.value }))}
                    placeholder="请输入企业微信应用的 agentid"
                  />
                  <Password
                    addonBefore="Secret"
                    value={draft.wecomSecret}
                    disabled={loading || saving || !draft.wecomEnabled}
                    onChange={(event) => setDraft((currentDraft) => ({ ...currentDraft, wecomSecret: event.target.value }))}
                    placeholder="请输入企业微信应用 Secret / corpsecret"
                  />
                  <Password
                    addonBefore="Token"
                    value={draft.wecomToken}
                    disabled={loading || saving || !draft.wecomEnabled}
                    onChange={(event) => setDraft((currentDraft) => ({ ...currentDraft, wecomToken: event.target.value }))}
                    placeholder="请输入企业微信回调 Token"
                  />
                  <Password
                    addonBefore="EncodingAESKey"
                    value={draft.wecomEncodingAesKey}
                    disabled={loading || saving || !draft.wecomEnabled}
                    onChange={(event) =>
                      setDraft((currentDraft) => ({ ...currentDraft, wecomEncodingAesKey: event.target.value }))
                    }
                    placeholder="请输入企业微信回调 EncodingAESKey"
                  />
                  <TextArea
                    rows={4}
                    value={draft.wecomAllowedUsersText}
                    disabled={loading || saving || !draft.wecomEnabled}
                    onChange={(event) =>
                      setDraft((currentDraft) => ({ ...currentDraft, wecomAllowedUsersText: event.target.value }))
                    }
                    placeholder={"允许访问的用户 ID，每行一个，也可以用英文逗号分隔\n输入 * 表示全部允许"}
                  />
                </Space>
              </Card>

              <Card
                type="inner"
                size="small"
                title="飞书"
                extra={(
                  <Space size="small">
                    <Text type="secondary">启用</Text>
                    <Switch
                      checked={draft.feishuEnabled}
                      disabled={loading || saving}
                      onChange={(checked) => setDraft((currentDraft) => ({ ...currentDraft, feishuEnabled: checked }))}
                    />
                  </Space>
                )}
              >
                <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                  <Text type="secondary">对应 `config.toml` 中的 `channels_config.feishu`。</Text>
                  <Text type="secondary">
                    参考 OpenClaw 的默认接入方式，控制台当前按“应用模式 + WebSocket 长连接”维护，不需要公网回调地址；如需更高级的 webhook 字段，可继续在 Config 页手工补充。
                  </Text>
                  <Space size="middle" wrap>
                    <a href={CHANNEL_PLATFORM_LINKS.feishu.consoleUrl} target="_blank" rel="noreferrer">
                      前往飞书开放平台
                    </a>
                    <a href={CHANNEL_PLATFORM_LINKS.feishu.docsUrl} target="_blank" rel="noreferrer">
                      查看飞书开发文档
                    </a>
                  </Space>
                  {!draft.feishuEnabled ? (
                    <Text type="secondary">当前未启用。开启后即可配置飞书应用 App ID、App Secret 和允许访问的用户。</Text>
                  ) : null}
                  <Input
                    addonBefore="App ID"
                    value={draft.feishuAppId}
                    disabled={loading || saving || !draft.feishuEnabled}
                    onChange={(event) => setDraft((currentDraft) => ({ ...currentDraft, feishuAppId: event.target.value }))}
                    placeholder="请输入飞书应用的 App ID"
                  />
                  <Password
                    addonBefore="App Secret"
                    value={draft.feishuAppSecret}
                    disabled={loading || saving || !draft.feishuEnabled}
                    onChange={(event) =>
                      setDraft((currentDraft) => ({ ...currentDraft, feishuAppSecret: event.target.value }))
                    }
                    placeholder="请输入飞书应用的 App Secret"
                  />
                  <TextArea
                    rows={4}
                    value={draft.feishuAllowedUsersText}
                    disabled={loading || saving || !draft.feishuEnabled}
                    onChange={(event) =>
                      setDraft((currentDraft) => ({ ...currentDraft, feishuAllowedUsersText: event.target.value }))
                    }
                    placeholder={"允许访问的用户 open_id / union_id，每行一个，也可以用英文逗号分隔\n输入 * 表示全部允许"}
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
                  <Space size="middle" wrap>
                    <a href={CHANNEL_PLATFORM_LINKS.qq.consoleUrl} target="_blank" rel="noreferrer">
                      前往 QQ 开放平台
                    </a>
                    <a href={CHANNEL_PLATFORM_LINKS.qq.docsUrl} target="_blank" rel="noreferrer">
                      查看 QQ 平台文档
                    </a>
                  </Space>
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
