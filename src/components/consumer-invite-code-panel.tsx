"use client";

import { createConsumerInviteCodes, listConsumerInviteCodes } from "@/lib/control-api";
import type {
  ConsumerInviteCode,
  CreateConsumerInviteCodesResponse,
} from "@/types/contracts";
import { Button, Form, Input, InputNumber, Modal, Space, Table, Tag, Typography, message } from "antd";
import { Copy, Plus, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const { Paragraph, Text } = Typography;

function copyText(text: string): boolean {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      void navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // ignore
  }
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.select();
  try {
    document.execCommand("copy");
    return true;
  } catch {
    return false;
  } finally {
    document.body.removeChild(textArea);
  }
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function statusColor(status: ConsumerInviteCode["status"]) {
  switch (status) {
    case "BOUND":
      return "purple";
    case "DISABLED":
      return "default";
    case "UNUSED":
    default:
      return "green";
  }
}

function statusLabel(status: ConsumerInviteCode["status"]) {
  switch (status) {
    case "BOUND":
      return "已绑定";
    case "DISABLED":
      return "已失效";
    case "UNUSED":
    default:
      return "未使用";
  }
}

type CreateInviteCodeFormValues = {
  count: number;
  note?: string;
};

export function ConsumerInviteCodePanel() {
  const [items, setItems] = useState<ConsumerInviteCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdResult, setCreatedResult] = useState<CreateConsumerInviteCodesResponse | null>(null);
  const [form] = Form.useForm<CreateInviteCodeFormValues>();
  const [messageApi, contextHolder] = message.useMessage();

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listConsumerInviteCodes();
      setItems(response.items);
    } catch (error) {
      messageApi.error(`加载邀请码列表失败：${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const summary = useMemo(() => {
    return items.reduce(
      (accumulator, item) => {
        accumulator.total += 1;
        if (item.status === "BOUND") {
          accumulator.bound += 1;
        } else if (item.status === "UNUSED") {
          accumulator.unused += 1;
        } else {
          accumulator.disabled += 1;
        }
        return accumulator;
      },
      { total: 0, unused: 0, bound: 0, disabled: 0 }
    );
  }, [items]);

  const handleCreate = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setCreating(true);
      const response = await createConsumerInviteCodes({
        count: values.count,
        note: values.note?.trim() || null,
        createdBy: "console",
      });
      setCreatedResult(response);
      setCreateOpen(false);
      form.resetFields();
      messageApi.success(`已创建 ${response.items.length} 个邀请码`);
      void loadItems();
    } catch (error) {
      if (error && typeof error === "object" && "errorFields" in error) {
        return;
      }
      messageApi.error(`创建邀请码失败：${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setCreating(false);
    }
  }, [form, loadItems, messageApi]);

  const handleCopyCreated = useCallback(() => {
    if (!createdResult) {
      return;
    }
    const success = copyText(createdResult.items.map((item) => item.code).join("\n"));
    if (success) {
      messageApi.success("邀请码已复制");
    } else {
      messageApi.error("复制失败，请手动复制");
    }
  }, [createdResult, messageApi]);

  return (
    <>
      {contextHolder}
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xl font-black text-slate-900">邀请码管理</div>
            <div className="mt-2 text-sm font-medium text-slate-500">
              内测阶段新用户注册需要填写邀请码，邀请码一旦绑定后不可重复使用。
            </div>
          </div>
          <Space wrap>
            <Button icon={<RefreshCw size={14} />} onClick={() => void loadItems()} loading={loading}>
              刷新
            </Button>
            <Button type="primary" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>
              新增邀请码
            </Button>
          </Space>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "总数", value: summary.total },
            { label: "未使用", value: summary.unused },
            { label: "已绑定", value: summary.bound },
            { label: "已失效", value: summary.disabled },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <div className="text-sm font-semibold text-slate-500">{item.label}</div>
              <div className="mt-3 text-3xl font-black text-slate-900">{item.value}</div>
            </div>
          ))}
        </div>

        <Table<ConsumerInviteCode>
          rowKey="id"
          loading={loading}
          dataSource={items}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 1100 }}
          columns={[
            {
              title: "邀请码",
              dataIndex: "code",
              key: "code",
              width: 180,
              render: (value: string) => (
                <Space>
                  <code style={{ padding: "2px 6px", background: "#f8fafc", borderRadius: 6 }}>{value}</code>
                  <Button
                    type="text"
                    size="small"
                    icon={<Copy size={14} />}
                    onClick={() => {
                      const success = copyText(value);
                      if (success) {
                        messageApi.success("邀请码已复制");
                      } else {
                        messageApi.error("复制失败");
                      }
                    }}
                  />
                </Space>
              ),
            },
            {
              title: "状态",
              dataIndex: "status",
              key: "status",
              width: 110,
              render: (value: ConsumerInviteCode["status"]) => <Tag color={statusColor(value)}>{statusLabel(value)}</Tag>,
            },
            {
              title: "批次号",
              dataIndex: "batchNo",
              key: "batchNo",
              width: 220,
              render: (value?: string | null) => value || "-",
            },
            {
              title: "备注",
              dataIndex: "note",
              key: "note",
              width: 220,
              render: (value?: string | null) => value || "-",
            },
            {
              title: "绑定手机号",
              dataIndex: "boundPhoneMasked",
              key: "boundPhoneMasked",
              width: 140,
              render: (value?: string | null) => value || "-",
            },
            {
              title: "绑定用户",
              dataIndex: "boundUserId",
              key: "boundUserId",
              width: 220,
              render: (value?: string | null) => value || "-",
            },
            {
              title: "创建时间",
              dataIndex: "createdAt",
              key: "createdAt",
              width: 180,
              render: (value: string) => formatDateTime(value),
            },
            {
              title: "绑定时间",
              dataIndex: "boundAt",
              key: "boundAt",
              width: 180,
              render: (value?: string | null) => formatDateTime(value),
            },
          ]}
        />
      </Space>

      <Modal
        title="批量创建邀请码"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => void handleCreate()}
        okText="创建"
        confirmLoading={creating}
      >
        <Form<CreateInviteCodeFormValues> form={form} layout="vertical" initialValues={{ count: 10 }}>
          <Form.Item
            name="count"
            label="生成数量"
            rules={[{ required: true, message: "请输入生成数量" }]}
          >
            <InputNumber min={1} max={500} precision={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="note" label="备注">
            <Input.TextArea rows={3} placeholder="例如：2026-03 第一批内测邀请码" maxLength={255} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="邀请码已生成"
        open={Boolean(createdResult)}
        onCancel={() => setCreatedResult(null)}
        footer={[
          <Button key="copy" icon={<Copy size={14} />} onClick={handleCopyCreated}>
            复制全部
          </Button>,
          <Button key="close" type="primary" onClick={() => setCreatedResult(null)}>
            关闭
          </Button>,
        ]}
      >
        {createdResult ? (
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Text type="secondary">批次号：{createdResult.batchNo}</Text>
            <Paragraph
              style={{
                marginBottom: 0,
                padding: 12,
                background: "#f8fafc",
                borderRadius: 8,
                maxHeight: 320,
                overflowY: "auto",
                whiteSpace: "pre-wrap",
              }}
            >
              {createdResult.items.map((item) => item.code).join("\n")}
            </Paragraph>
          </Space>
        ) : null}
      </Modal>
    </>
  );
}
