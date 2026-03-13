"use client";

import { useActionState, useEffect } from "react";
import { Alert, Button, Card, Input, Space, Typography } from "antd";
import { LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  initialConsoleAccessActionState,
  submitConsoleAccessPassword,
} from "@/app/console/actions";

type ConsoleAccessGateProps = {
  passwordConfigured: boolean;
};

export function ConsoleAccessGate({ passwordConfigured }: ConsoleAccessGateProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    submitConsoleAccessPassword,
    initialConsoleAccessActionState,
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

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

          {state.error ? <Alert type="error" showIcon message={state.error} /> : null}

          <form action={formAction} className="console-access-form">
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
