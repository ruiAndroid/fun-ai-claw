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
        messageApi.success("Channel config refreshed");
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
      messageApi.warning("message_timeout_secs must be positive");
      return;
    }
    if (draft.dingtalkEnabled && !draft.dingtalkClientId.trim()) {
      messageApi.warning("DingTalk client_id is required");
      return;
    }
    if (draft.dingtalkEnabled && !draft.dingtalkClientSecret.trim()) {
      messageApi.warning("DingTalk client_secret is required");
      return;
    }
    if (draft.qqEnabled && !draft.qqAppId.trim()) {
      messageApi.warning("QQ app_id is required");
      return;
    }
    if (draft.qqEnabled && !draft.qqAppSecret.trim()) {
      messageApi.warning("QQ app_secret is required");
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
      messageApi.success("Channel config saved");
    } catch (apiError) {
      const messageText = apiError instanceof Error ? apiError.message : String(apiError);
      setError(messageText);
      messageApi.error("Failed to save channel config");
    } finally {
      setSaving(false);
    }
  }, [applyResponse, draft, instanceId, messageApi, onSaved]);

  const metaText = useMemo(() => {
    if (!config) {
      return "-";
    }
    return `${config.source} / updated ${formatTimestamp(config.overrideUpdatedAt)} / ${config.overrideUpdatedBy ?? "system"}`;
  }, [config]);

  return (
    <>
      {contextHolder}
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        {error ? (
          <Alert
            type="error"
            showIcon
            message="Failed to load channel config"
            description={error}
            action={(
              <Button size="small" onClick={() => void loadConfig()}>
                Retry
              </Button>
            )}
          />
        ) : null}

        <Card
          className="sub-glass-card"
          size="small"
          title="Channels"
          extra={(
            <Space size="small">
              <Text type="secondary">{metaText}</Text>
              <Button onClick={() => void loadConfig(true)} loading={loading} disabled={saving}>
                Refresh
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
                message="This tab only visualizes instance channel config"
                description="Saved values will be written back into config.toml under channels_config. This page currently supports QQ and DingTalk only."
              />

              <Card
                type="inner"
                size="small"
                title="Global"
              >
                <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                  <div>
                    <Text type="secondary">cli</Text>
                    <div style={{ marginTop: 8 }}>
                      <Switch
                        checked={draft.cliEnabled}
                        disabled={loading || saving}
                        onChange={(checked) => setDraft((currentDraft) => ({ ...currentDraft, cliEnabled: checked }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Text type="secondary">message_timeout_secs</Text>
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
                title="DingTalk"
                extra={(
                  <Space size="small">
                    <Text type="secondary">enabled</Text>
                    <Switch
                      checked={draft.dingtalkEnabled}
                      disabled={loading || saving}
                      onChange={(checked) => setDraft((currentDraft) => ({ ...currentDraft, dingtalkEnabled: checked }))}
                    />
                  </Space>
                )}
              >
                <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                  {!draft.dingtalkEnabled ? (
                    <Text type="secondary">Disabled. Enable it to configure client_id, client_secret and allowed_users.</Text>
                  ) : null}
                  <Input
                    addonBefore="client_id"
                    value={draft.dingtalkClientId}
                    disabled={loading || saving || !draft.dingtalkEnabled}
                    onChange={(event) => setDraft((currentDraft) => ({ ...currentDraft, dingtalkClientId: event.target.value }))}
                    placeholder="ding-app-key"
                  />
                  <Password
                    addonBefore="client_secret"
                    value={draft.dingtalkClientSecret}
                    disabled={loading || saving || !draft.dingtalkEnabled}
                    onChange={(event) =>
                      setDraft((currentDraft) => ({ ...currentDraft, dingtalkClientSecret: event.target.value }))
                    }
                    placeholder="ding-app-secret"
                  />
                  <TextArea
                    rows={4}
                    value={draft.dingtalkAllowedUsersText}
                    disabled={loading || saving || !draft.dingtalkEnabled}
                    onChange={(event) =>
                      setDraft((currentDraft) => ({ ...currentDraft, dingtalkAllowedUsersText: event.target.value }))
                    }
                    placeholder={"allowed_users, one per line or comma-separated\n*"}
                  />
                </Space>
              </Card>

              <Card
                type="inner"
                size="small"
                title="QQ"
                extra={(
                  <Space size="small">
                    <Text type="secondary">enabled</Text>
                    <Switch
                      checked={draft.qqEnabled}
                      disabled={loading || saving}
                      onChange={(checked) => setDraft((currentDraft) => ({ ...currentDraft, qqEnabled: checked }))}
                    />
                  </Space>
                )}
              >
                <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                  {!draft.qqEnabled ? (
                    <Text type="secondary">Disabled. Enable it to configure app_id, app_secret and allowed_users.</Text>
                  ) : null}
                  <Input
                    addonBefore="app_id"
                    value={draft.qqAppId}
                    disabled={loading || saving || !draft.qqEnabled}
                    onChange={(event) => setDraft((currentDraft) => ({ ...currentDraft, qqAppId: event.target.value }))}
                    placeholder="qq-app-id"
                  />
                  <Password
                    addonBefore="app_secret"
                    value={draft.qqAppSecret}
                    disabled={loading || saving || !draft.qqEnabled}
                    onChange={(event) =>
                      setDraft((currentDraft) => ({ ...currentDraft, qqAppSecret: event.target.value }))
                    }
                    placeholder="qq-app-secret"
                  />
                  <TextArea
                    rows={4}
                    value={draft.qqAllowedUsersText}
                    disabled={loading || saving || !draft.qqEnabled}
                    onChange={(event) =>
                      setDraft((currentDraft) => ({ ...currentDraft, qqAllowedUsersText: event.target.value }))
                    }
                    placeholder={"allowed_users, one per line or comma-separated\n*"}
                  />
                </Space>
              </Card>

              <Space wrap>
                <Button onClick={handleReset} disabled={!dirty || loading || saving}>
                  Reset
                </Button>
                <Button type="primary" loading={saving} disabled={!dirty || loading || saving} onClick={() => void handleSave()}>
                  Save
                </Button>
              </Space>
            </Space>
          )}
        </Card>
      </Space>
    </>
  );
}
