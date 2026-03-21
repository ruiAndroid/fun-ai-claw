"use client";

import {
  getConsumerBillingArchiveStatus,
  listConsumerBillingLocalRecords,
  listConsumerBillingUserCenterOrders,
} from "@/lib/control-api";
import type {
  ConsumerBillingArchivePartition,
  ConsumerBillingArchiveStatus,
  ConsumerBillingLocalRecord,
  ConsumerBillingUserCenterOrder,
} from "@/types/contracts";
import { Alert, Button, Card, Col, Descriptions, Input, Row, Space, Table, Tabs, Tag, Typography, message } from "antd";
import { Database, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const { Text } = Typography;
const DEFAULT_LIMIT = 100;

function formatTimestamp(value?: string | null) {
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

function formatAmount(value?: number | null, digits = 4) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }
  return value.toFixed(digits);
}

function formatInteger(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }
  return value.toLocaleString("zh-CN");
}

function formatDurationMs(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "-";
  }
  if (value < 60_000) {
    return `${Math.round(value / 1000)} 秒`;
  }
  if (value < 3_600_000) {
    return `${Math.round(value / 60_000)} 分钟`;
  }
  return `${(value / 3_600_000).toFixed(1)} 小时`;
}

function renderUserSummary(record: {
  displayName?: string | null;
  externalUserId?: string | null;
  externalUid?: string | null;
  phoneMasked?: string | null;
}) {
  return (
    <Space direction="vertical" size={2}>
      <Text strong>{record.displayName || record.phoneMasked || record.externalUserId || "-"}</Text>
      <Text code>{record.externalUserId || "-"}</Text>
      <Text type="secondary" style={{ fontSize: 12 }}>
        UID：{record.externalUid || "-"} / 手机：{record.phoneMasked || "-"}
      </Text>
    </Space>
  );
}

function buildStatusCard(title: string, value: string, extra?: string) {
  return (
    <Card size="small" styles={{ body: { padding: 16 } }}>
      <Space direction="vertical" size={4}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {title}
        </Text>
        <Text strong style={{ fontSize: 20 }}>
          {value}
        </Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {extra || "—"}
        </Text>
      </Space>
    </Card>
  );
}

export function ConsumerBillingPanel() {
  const [messageApi, contextHolder] = message.useMessage();
  const [keyword, setKeyword] = useState("");
  const [activeTab, setActiveTab] = useState("local");
  const [localItems, setLocalItems] = useState<ConsumerBillingLocalRecord[]>([]);
  const [remoteItems, setRemoteItems] = useState<ConsumerBillingUserCenterOrder[]>([]);
  const [archiveStatus, setArchiveStatus] = useState<ConsumerBillingArchiveStatus>();
  const [localLoading, setLocalLoading] = useState(false);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [localError, setLocalError] = useState<string>();
  const [remoteError, setRemoteError] = useState<string>();
  const [archiveError, setArchiveError] = useState<string>();

  const loadLocal = useCallback(async (searchKeyword?: string, showSuccess?: boolean) => {
    setLocalLoading(true);
    setLocalError(undefined);
    try {
      const response = await listConsumerBillingLocalRecords({
        keyword: searchKeyword,
        limit: DEFAULT_LIMIT,
      });
      setLocalItems(response.items);
      if (showSuccess) {
        messageApi.success("本地消费明细已刷新");
      }
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : String(error));
    } finally {
      setLocalLoading(false);
    }
  }, [messageApi]);

  const loadRemote = useCallback(async (searchKeyword?: string, showSuccess?: boolean) => {
    const normalizedKeyword = searchKeyword?.trim() || "";
    if (!normalizedKeyword) {
      setRemoteItems([]);
      setRemoteError(undefined);
      return;
    }
    setRemoteLoading(true);
    setRemoteError(undefined);
    try {
      const response = await listConsumerBillingUserCenterOrders({
        keyword: normalizedKeyword,
        limit: DEFAULT_LIMIT,
      });
      setRemoteItems(response.items);
      if (showSuccess) {
        messageApi.success("用户中心消费明细已刷新");
      }
    } catch (error) {
      setRemoteError(error instanceof Error ? error.message : String(error));
    } finally {
      setRemoteLoading(false);
    }
  }, [messageApi]);

  const loadArchiveStatus = useCallback(async (showSuccess?: boolean) => {
    setArchiveLoading(true);
    setArchiveError(undefined);
    try {
      const response = await getConsumerBillingArchiveStatus();
      setArchiveStatus(response);
      if (showSuccess) {
        messageApi.success("归档状态已刷新");
      }
    } catch (error) {
      setArchiveError(error instanceof Error ? error.message : String(error));
    } finally {
      setArchiveLoading(false);
    }
  }, [messageApi]);

  const runSearch = useCallback(async (showSuccess?: boolean) => {
    const normalizedKeyword = keyword.trim();
    await Promise.all([
      loadLocal(normalizedKeyword, showSuccess),
      loadRemote(normalizedKeyword, false),
      loadArchiveStatus(false),
    ]);
  }, [keyword, loadArchiveStatus, loadLocal, loadRemote]);

  useEffect(() => {
    void Promise.all([loadLocal(), loadArchiveStatus()]);
  }, [loadArchiveStatus, loadLocal]);

  const localColumns = useMemo(() => ([
    {
      title: "用户",
      key: "user",
      width: 260,
      render: (_: unknown, record: ConsumerBillingLocalRecord) => renderUserSummary(record),
    },
    {
      title: "模型 / Tokens",
      key: "modelTokens",
      width: 260,
      render: (_: unknown, record: ConsumerBillingLocalRecord) => (
        <Space direction="vertical" size={2}>
          <Text strong>{record.model || "-"}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.provider || "-"}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            输入 {formatInteger(record.inputTokens)} / 输出 {formatInteger(record.outputTokens)}
          </Text>
        </Space>
      ),
    },
    {
      title: "结算",
      key: "amount",
      width: 220,
      render: (_: unknown, record: ConsumerBillingLocalRecord) => (
        <Space direction="vertical" size={2}>
          <Text>已结算：{formatInteger(record.settledXiami)} 虾米</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            预估 ¥{formatAmount(record.estimatedCny, 6)} / {formatAmount(record.estimatedXiami, 4)} 虾米
          </Text>
        </Space>
      ),
    },
    {
      title: "扣费状态",
      key: "status",
      width: 240,
      render: (_: unknown, record: ConsumerBillingLocalRecord) => (
        <Space direction="vertical" size={2}>
          <Text strong>{record.outboxStatus || "未入队"}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            actionDetailId：{record.actionDetailId ?? "-"} / 重试：{record.outboxAttemptCount ?? 0}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            externalRecordId：{record.externalRecordId ?? "-"}
          </Text>
        </Space>
      ),
    },
    {
      title: "错误 / 时间",
      key: "meta",
      render: (_: unknown, record: ConsumerBillingLocalRecord) => (
        <Space direction="vertical" size={2}>
          <Text type={record.outboxLastError ? "danger" : "secondary"} style={{ fontSize: 12 }}>
            {record.outboxLastError || "—"}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            创建：{formatTimestamp(record.createdAt)}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            完成：{formatTimestamp(record.processedAt)}
          </Text>
        </Space>
      ),
    },
  ]), []);

  const remoteColumns = useMemo(() => ([
    {
      title: "用户",
      key: "user",
      width: 260,
      render: (_: unknown, record: ConsumerBillingUserCenterOrder) => renderUserSummary(record),
    },
    {
      title: "订单",
      key: "order",
      width: 260,
      render: (_: unknown, record: ConsumerBillingUserCenterOrder) => (
        <Space direction="vertical" size={2}>
          <Text strong>{record.commodityName || record.orderCode || "—"}</Text>
          <Text code>{record.orderCode || "-"}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            订单ID：{record.orderId || "-"}
          </Text>
        </Space>
      ),
    },
    {
      title: "金额 / 虾米",
      key: "amount",
      width: 220,
      render: (_: unknown, record: ConsumerBillingUserCenterOrder) => (
        <Space direction="vertical" size={2}>
          <Text>虾米：{formatAmount(record.coinAmount, 0)}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            消费 ¥{formatAmount(record.consumeMoney, 2)} / 支付 ¥{formatAmount(record.payMoney, 2)}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            退款 ¥{formatAmount(record.refundAmount, 2)}
          </Text>
        </Space>
      ),
    },
    {
      title: "状态 / 时间",
      key: "status",
      render: (_: unknown, record: ConsumerBillingUserCenterOrder) => (
        <Space direction="vertical" size={2}>
          <Text strong>{record.status || "-"}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            创建：{formatTimestamp(record.createdAt)}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            更新：{formatTimestamp(record.updatedAt)}
          </Text>
          <Text type={record.fetchError ? "danger" : "secondary"} style={{ fontSize: 12 }}>
            {record.fetchError || record.remark || "—"}
          </Text>
        </Space>
      ),
    },
  ]), []);

  const archivePartitionColumns = useMemo(() => ([
    {
      title: "分区表",
      dataIndex: "tableName",
      key: "tableName",
      width: 320,
      render: (value: string) => <Text code>{value}</Text>,
    },
    {
      title: "分区范围",
      dataIndex: "partitionBound",
      key: "partitionBound",
      render: (value?: string | null) => <Text style={{ fontSize: 12 }}>{value || "-"}</Text>,
    },
    {
      title: "预估行数",
      dataIndex: "approxRows",
      key: "approxRows",
      width: 140,
      render: (value: number) => <Text>{formatInteger(value)}</Text>,
    },
  ]), []);

  const archiveBacklogActive = Boolean(archiveStatus?.oldestArchivableCreatedAt);

  return (
    <>
      {contextHolder}
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Alert
          type="info"
          showIcon
          message="消费明细对账"
          description="支持同时查看本地扣费明细、用户中心消费明细，以及账单归档与分区运行状态。"
        />

        <Card className="glass-card">
          <Space.Compact style={{ width: "100%" }}>
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="输入 userId / UID / 手机号"
              allowClear
              onPressEnter={() => void runSearch()}
            />
            <Button type="primary" icon={<Search size={16} />} onClick={() => void runSearch()}>
              查询
            </Button>
            <Button icon={<RefreshCw size={16} />} onClick={() => void Promise.all([runSearch(true), loadArchiveStatus(true)])}>
              刷新
            </Button>
          </Space.Compact>
        </Card>

        <Card
          className="glass-card"
          title={
            <Space>
              <Database size={18} />
              <span>归档状态</span>
            </Space>
          }
          extra={archiveStatus ? <Tag color={archiveStatus.enabled ? "green" : "default"}>{archiveStatus.enabled ? "已启用" : "已关闭"}</Tag> : null}
          loading={archiveLoading}
        >
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            {archiveError ? <Alert type="error" showIcon message={archiveError} /> : null}
            {archiveBacklogActive ? (
              <Alert
                type="warning"
                showIcon
                message="检测到待归档积压"
                description={`最早待归档账单时间：${formatTimestamp(archiveStatus?.oldestArchivableCreatedAt)}`}
              />
            ) : (
              <Alert
                type="success"
                showIcon
                message="当前没有明显归档积压"
                description="超过热数据保留期且已脱离 outbox 的账单，会由后台定时任务逐步迁入月分区归档表。"
              />
            )}

            <Row gutter={[16, 16]}>
              <Col xs={24} md={12} xl={6}>
                {buildStatusCard("热表预估行数", formatInteger(archiveStatus?.hotTableApproxRows), `最老：${formatTimestamp(archiveStatus?.oldestHotCreatedAt)}`)}
              </Col>
              <Col xs={24} md={12} xl={6}>
                {buildStatusCard("归档预估行数", formatInteger(archiveStatus?.archiveApproxRows), `最新归档：${formatTimestamp(archiveStatus?.latestArchivedAt)}`)}
              </Col>
              <Col xs={24} md={12} xl={6}>
                {buildStatusCard("归档分区数", formatInteger(archiveStatus?.partitionCount), `最新账单：${formatTimestamp(archiveStatus?.newestArchiveCreatedAt)}`)}
              </Col>
              <Col xs={24} md={12} xl={6}>
                {buildStatusCard("归档调度周期", formatDurationMs(archiveStatus?.fixedDelayMs), `批量：${formatInteger(archiveStatus?.batchSize)}`)}
              </Col>
            </Row>

            <Descriptions
              size="small"
              bordered
              column={{ xs: 1, md: 2, xl: 3 }}
              items={[
                { key: "enabled", label: "归档开关", children: archiveStatus?.enabled ? "开启" : "关闭" },
                { key: "retention", label: "热表保留期", children: `${archiveStatus?.hotRetentionDays ?? "-"} 天` },
                { key: "zoneId", label: "归档时区", children: archiveStatus?.zoneId || "-" },
                { key: "oldestHot", label: "热表最老账单", children: formatTimestamp(archiveStatus?.oldestHotCreatedAt) },
                { key: "newestHot", label: "热表最新账单", children: formatTimestamp(archiveStatus?.newestHotCreatedAt) },
                { key: "oldestArchive", label: "归档最老账单", children: formatTimestamp(archiveStatus?.oldestArchiveCreatedAt) },
              ]}
            />

            <Card size="small" title={`归档分区 (${archiveStatus?.partitions.length ?? 0})`}>
              <Table<ConsumerBillingArchivePartition>
                rowKey={(record) => record.tableName}
                columns={archivePartitionColumns}
                dataSource={archiveStatus?.partitions ?? []}
                pagination={false}
                locale={{ emptyText: "暂无归档分区" }}
                scroll={{ x: 960 }}
              />
            </Card>
          </Space>
        </Card>

        <Card className="glass-card" title="消费明细">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: "local",
                label: `本地消费明细 (${localItems.length})`,
                children: (
                  <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                    {localError ? <Alert type="error" showIcon message={localError} /> : null}
                    <Table<ConsumerBillingLocalRecord>
                      rowKey={(record) => record.billingId}
                      columns={localColumns}
                      dataSource={localItems}
                      loading={localLoading}
                      pagination={{ pageSize: 20, hideOnSinglePage: localItems.length <= 20 }}
                      scroll={{ x: 1200 }}
                    />
                  </Space>
                ),
              },
              {
                key: "user-center",
                label: `用户中心消费明细 (${remoteItems.length})`,
                children: (
                  <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                    {!keyword.trim() ? (
                      <Alert type="warning" showIcon message="请输入 userId / UID / 手机号后，再查询用户中心消费明细。" />
                    ) : null}
                    {remoteError ? <Alert type="error" showIcon message={remoteError} /> : null}
                    <Table<ConsumerBillingUserCenterOrder>
                      rowKey={(record, index) => `${record.externalUserId || "unknown"}-${record.orderId || "empty"}-${index}`}
                      columns={remoteColumns}
                      dataSource={remoteItems}
                      loading={remoteLoading}
                      pagination={{ pageSize: 20, hideOnSinglePage: remoteItems.length <= 20 }}
                      scroll={{ x: 1080 }}
                    />
                  </Space>
                ),
              },
            ]}
          />
        </Card>
      </Space>
    </>
  );
}
