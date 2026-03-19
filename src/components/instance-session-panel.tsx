"use client";

import { getInstanceOpenSessionOverview } from "@/lib/control-api";
import type { InstanceOpenSessionItem, InstanceOpenSessionOverview } from "@/types/contracts";
import { Alert, Button, Card, Empty, Space, Table, Tag, Typography, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Activity, MessageSquare, Plug, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const { Text } = Typography;

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

function renderSessionStatus(status: InstanceOpenSessionItem["status"]) {
  return status === "ACTIVE" ? <Tag color="green">ACTIVE</Tag> : <Tag>CLOSED</Tag>;
}

function renderConnectionStatus(connected: boolean) {
  return connected ? <Tag color="blue">已连接</Tag> : <Tag>未连接</Tag>;
}

function renderSourceTag(sourceType: InstanceOpenSessionItem["sourceType"]) {
  if (sourceType === "consumer_session") {
    return <Tag color="gold">consumer_session</Tag>;
  }
  return sourceType === "agent_session"
    ? <Tag color="cyan">agent_session</Tag>
    : <Tag color="purple">open_session</Tag>;
}

export function InstanceSessionPanel({
  instanceId,
  active = true,
}: {
  instanceId: string;
  active?: boolean;
}) {
  const [messageApi, contextHolder] = message.useMessage();
  const [overview, setOverview] = useState<InstanceOpenSessionOverview>();
  const [selectedSessionId, setSelectedSessionId] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const loadOverview = useCallback(async (showSuccess?: boolean) => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await getInstanceOpenSessionOverview(instanceId);
      setOverview(response);
      setSelectedSessionId((current) => {
        if (current && response.items.some((item) => item.sessionId === current)) {
          return current;
        }
        return response.items[0]?.sessionId;
      });
      if (showSuccess) {
        messageApi.success("会话数据已刷新");
      }
    } catch (apiError) {
      setOverview(undefined);
      setSelectedSessionId(undefined);
      setError(apiError instanceof Error ? apiError.message : String(apiError));
    } finally {
      setLoading(false);
    }
  }, [instanceId, messageApi]);

  useEffect(() => {
    if (!active) {
      return;
    }
    void loadOverview();
  }, [active, loadOverview]);

  useEffect(() => {
    if (!active) {
      return;
    }
    const timer = window.setInterval(() => {
      void loadOverview();
    }, 10000);
    return () => window.clearInterval(timer);
  }, [active, loadOverview]);

  const selectedSession = useMemo(
    () => overview?.items.find((item) => item.sessionId === selectedSessionId),
    [overview?.items, selectedSessionId],
  );

  const columns = useMemo<ColumnsType<InstanceOpenSessionItem>>(() => [
    {
      title: "来源",
      dataIndex: "sourceType",
      key: "sourceType",
      width: 130,
      render: (value: InstanceOpenSessionItem["sourceType"]) => renderSourceTag(value),
    },
    {
      title: "应用",
      key: "app",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.appName || record.appId}</Text>
          <Text type="secondary">{record.appId}</Text>
        </Space>
      ),
    },
    {
      title: "Agent",
      dataIndex: "agentId",
      key: "agentId",
      render: (value: string | null | undefined) => value || "主 Agent",
    },
    {
      title: "状态",
      key: "status",
      render: (_, record) => (
        <Space wrap size={4}>
          {renderSessionStatus(record.status)}
          {renderConnectionStatus(record.connected)}
        </Space>
      ),
    },
    {
      title: "消息数",
      dataIndex: "messageCount",
      key: "messageCount",
      width: 96,
    },
    {
      title: "外部会话键",
      dataIndex: "externalSessionKey",
      key: "externalSessionKey",
      render: (value: string | null | undefined) => value || "-",
      ellipsis: true,
    },
    {
      title: "最后消息",
      dataIndex: "lastMessageAt",
      key: "lastMessageAt",
      render: (value: string | null | undefined) => formatTimestamp(value),
      width: 160,
    },
    {
      title: "更新时间",
      dataIndex: "updatedAt",
      key: "updatedAt",
      render: (value: string) => formatTimestamp(value),
      width: 160,
    },
  ], []);

  const summaryCards = [
    {
      key: "total",
      title: "总会话",
      value: overview?.totalSessions ?? 0,
      icon: <Activity size={16} />,
      color: "blue",
    },
    {
      key: "active",
      title: "ACTIVE",
      value: overview?.activeSessions ?? 0,
      icon: <Plug size={16} />,
      color: "green",
    },
    {
      key: "closed",
      title: "CLOSED",
      value: overview?.closedSessions ?? 0,
      icon: <Plug size={16} />,
      color: "default",
    },
    {
      key: "connected",
      title: "当前连接",
      value: overview?.connectedSessions ?? 0,
      icon: <MessageSquare size={16} />,
      color: "purple",
    },
  ] as const;

  return (
    <>
      {contextHolder}
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <div className="tab-section-header">
          <div className="tab-section-title">
            <span className="tab-section-icon is-task"><MessageSquare size={16} /></span>
            Session 概览
          </div>
          <Space size="small">
            <Tag color="blue">{`${overview?.totalSessions ?? 0} 个会话`}</Tag>
            <Button
              size="small"
              loading={loading}
              onClick={() => void loadOverview(true)}
              icon={<RefreshCw size={12} />}
            >
              刷新
            </Button>
          </Space>
        </div>

        {error ? <Alert type="error" showIcon message={error} /> : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((item) => (
            <Card key={item.key} size="small">
              <Space direction="vertical" size={6} style={{ width: "100%" }}>
                <Space size={8}>
                  {item.icon}
                  <Text type="secondary">{item.title}</Text>
                </Space>
                <Space align="end" size={8}>
                  <Text style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{item.value}</Text>
                  <Tag color={item.color}>{item.title}</Tag>
                </Space>
              </Space>
            </Card>
          ))}
        </div>

        {!loading && (overview?.items.length ?? 0) === 0 ? (
          <Empty description="当前实例还没有会话记录" />
        ) : (
          <Card size="small" title="会话列表">
            <Table<InstanceOpenSessionItem>
              rowKey="sessionId"
              size="small"
              loading={loading}
              columns={columns}
              dataSource={overview?.items ?? []}
              pagination={{ pageSize: 8, hideOnSinglePage: true }}
              onRow={(record) => ({
                onClick: () => setSelectedSessionId(record.sessionId),
              })}
            />
          </Card>
        )}

        {selectedSession ? (
          <Card
            size="small"
            title={selectedSession.externalSessionKey || selectedSession.sessionId}
            extra={(
              <Space wrap size={4}>
                {renderSourceTag(selectedSession.sourceType)}
                {renderSessionStatus(selectedSession.status)}
                {renderConnectionStatus(selectedSession.connected)}
              </Space>
            )}
          >
            <div className="agent-detail-grid">
              <div className="agent-detail-prop">
                <span className="agent-detail-prop-label">Session ID</span>
                <span className="agent-detail-prop-value">{selectedSession.sessionId}</span>
              </div>
              <div className="agent-detail-prop">
                <span className="agent-detail-prop-label">来源</span>
                <span className="agent-detail-prop-value">{selectedSession.sourceType}</span>
              </div>
              <div className="agent-detail-prop">
                <span className="agent-detail-prop-label">应用</span>
                <span className="agent-detail-prop-value">{selectedSession.appName || selectedSession.appId}</span>
              </div>
              <div className="agent-detail-prop">
                <span className="agent-detail-prop-label">Agent</span>
                <span className="agent-detail-prop-value">{selectedSession.agentId || "主 Agent"}</span>
              </div>
              <div className="agent-detail-prop">
                <span className="agent-detail-prop-label">消息数</span>
                <span className="agent-detail-prop-value">{selectedSession.messageCount}</span>
              </div>
              <div className="agent-detail-prop is-wide">
                <span className="agent-detail-prop-label">外部会话键</span>
                <span className="agent-detail-prop-value">{selectedSession.externalSessionKey || "-"}</span>
              </div>
              <div className="agent-detail-prop">
                <span className="agent-detail-prop-label">Token 过期</span>
                <span className="agent-detail-prop-value">{formatTimestamp(selectedSession.websocketTokenExpiresAt)}</span>
              </div>
              <div className="agent-detail-prop">
                <span className="agent-detail-prop-label">创建时间</span>
                <span className="agent-detail-prop-value">{formatTimestamp(selectedSession.createdAt)}</span>
              </div>
              <div className="agent-detail-prop">
                <span className="agent-detail-prop-label">最后消息</span>
                <span className="agent-detail-prop-value">{formatTimestamp(selectedSession.lastMessageAt)}</span>
              </div>
              <div className="agent-detail-prop">
                <span className="agent-detail-prop-label">更新时间</span>
                <span className="agent-detail-prop-value">{formatTimestamp(selectedSession.updatedAt)}</span>
              </div>
            </div>
          </Card>
        ) : null}
      </Space>
    </>
  );
}
