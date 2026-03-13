"use client";

import { FormEvent, useState } from "react";
import { Alert, Button, Card, Input, Space, Typography } from "antd";
import { LockKeyhole } from "lucide-react";
import { routePaths } from "@/config/route-paths";

type ConsoleAccessGateProps = {
  passwordConfigured: boolean;
};

export function ConsoleAccessGate({ passwordConfigured }: ConsoleAccessGateProps) {
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!passwordConfigured || isPending) {
      return;
    }

    setIsPending(true);
    setErrorMessage(undefined);

    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch(routePaths.consoleAccess, {
        method: "POST",
        body: formData,
      });

      const result = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setErrorMessage(result?.error ?? "访问验证失败，请稍后重试。");
        return;
      }

      window.location.assign(routePaths.console);
    } catch {
      setErrorMessage("访问验证失败，请检查网络或稍后重试。");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <main className="console-access-shell">
      <Card className="console-access-card">
        <Space direction="vertical" size={20} style={{ width: "100%" }}>
          <div className="console-access-header">
            <span className="console-access-icon" aria-hidden="true">
              <LockKeyhole size={18} />
            </span>
            <div>
              <Typography.Title level={3} style={{ margin: 0 }}>
                控制台访问受限
              </Typography.Title>
              <Typography.Paragraph type="secondary" style={{ margin: "8px 0 0" }}>
                请输入访问密码后继续进入 `/fun-claw/console`。
              </Typography.Paragraph>
            </div>
          </div>

          {!passwordConfigured ? (
            <Alert
              type="warning"
              showIcon
              message="尚未配置控制台访问密码"
              description="请先在 src/config/console-access.ts 中设置 password，然后重新打开页面。"
            />
          ) : null}

          {errorMessage ? <Alert type="error" showIcon message={errorMessage} /> : null}

          <form className="console-access-form" onSubmit={handleSubmit}>
            <input
              type="text"
              name="username"
              autoComplete="username"
              defaultValue="console"
              tabIndex={-1}
              aria-hidden="true"
              className="console-access-hidden-field"
            />
            <Space direction="vertical" size={14} style={{ width: "100%" }}>
              <label className="console-access-label" htmlFor="console-access-password">
                访问密码
              </label>
              <Input.Password
                id="console-access-password"
                name="password"
                size="large"
                autoComplete="current-password"
                placeholder="请输入访问密码"
                required
                disabled={!passwordConfigured || isPending}
              />
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={isPending}
                disabled={!passwordConfigured}
                block
              >
                进入控制台
              </Button>
            </Space>
          </form>
        </Space>
      </Card>
    </main>
  );
}
