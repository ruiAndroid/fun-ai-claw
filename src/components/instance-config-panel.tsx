"use client";

import type { ClawInstance } from "@/types/contracts";
import { Alert, Card, Space, Typography } from "antd";

const { Text } = Typography;

export function InstanceConfigPanel({ instance }: { instance: ClawInstance }) {
  return (
    <Space direction="vertical" style={{ width: "100%" }} size="middle">
      <Alert
        type="info"
        showIcon
        message="Config 面板"
        description="当前实例配置面板正在整理中；现阶段请继续使用后端默认模板或直接编辑 config.toml。"
      />
      <Card className="sub-glass-card" size="small" title="实例信息">
        <Space direction="vertical" size="small">
          <Text>实例名称：{instance.name}</Text>
          <Text copyable={{ text: instance.id }}>实例 ID：{instance.id}</Text>
          <Text>当前入口：`/fun-claw/ui-controller/{instance.id}`</Text>
        </Space>
      </Card>
    </Space>
  );
}
